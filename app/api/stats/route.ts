import { NextRequest, NextResponse } from 'next/server';
import { connectDB, DailyStats } from '@/lib/db';
import { validateStatsQuery, DailyStatsResponse } from '@/lib/validateEvent';
import { formatDate, get24HoursAgo, getCurrentDate, PerformanceTimer } from '@/lib/utils';

/**
 * GET /api/stats?site_id=...&date=YYYY-MM-DD
 * 
 * Reporting API for analytics data
 * - Queries aggregated daily_stats collection
 * - Returns total views, unique users, and top paths
 * - Supports date filtering or last 24 hours by default
 */
export async function GET(request: NextRequest) {
  const timer = new PerformanceTimer('Stats API');
  
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const site_id = searchParams.get('site_id');
    const date = searchParams.get('date');
    
    // Validate query parameters
    const validation = validateStatsQuery({ site_id, date });
    
    if (!validation.success) {
      timer.end();
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.errors?.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }
    
    // Connect to database
    await connectDB();
    
    const { site_id: validSiteId, date: validDate } = validation.data!;
    
    // Determine date to query
    let queryDate: string;
    let isLast24Hours = false;
    
    if (validDate) {
      queryDate = validDate;
    } else {
      // Default to current date for last 24 hours
      queryDate = getCurrentDate();
      isLast24Hours = true;
    }
    
    // Query daily stats
    const stats = await DailyStats.findOne({
      site_id: validSiteId,
      date: queryDate,
    }).lean();
    
    if (!stats) {
      timer.end();
      return NextResponse.json(
        {
          success: true,
          data: {
            site_id: validSiteId,
            date: queryDate,
            total_views: 0,
            unique_users_count: 0,
            top_paths: [],
          } as DailyStatsResponse,
          message: 'No data found for this date',
        },
        { status: 200 }
      );
    }
    
    // Convert path_counts Map to array and sort by views
    const pathCounts = stats.path_counts || {};
    const topPaths = Object.entries(pathCounts)
      .map(([path, views]) => ({
        path,
        views: views as number,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10); // Top 10 paths
    
    // Prepare response
    const response: DailyStatsResponse = {
      site_id: stats.site_id,
      date: stats.date,
      total_views: stats.total_views || 0,
      unique_users_count: stats.unique_users?.length || 0,
      top_paths: topPaths,
    };
    
    const duration = timer.end();
    
    return NextResponse.json(
      {
        success: true,
        data: response,
        processing_time_ms: duration,
        note: isLast24Hours ? 'Showing stats for current date (last 24 hours)' : undefined,
      },
      { status: 200 }
    );
    
  } catch (error: any) {
    timer.end();
    console.error('[Stats API] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}
