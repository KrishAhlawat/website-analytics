import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB, DailyStats, Event, Site } from '@/lib/db';
import { validateStatsQuery, DailyStatsResponse } from '@/lib/validateEvent';
import { formatDate, get24HoursAgo, getCurrentDate, PerformanceTimer } from '@/lib/utils';

/**
 * GET /api/stats?site_id=...&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
 * 
 * Reporting API for analytics data with date range support
 * - Queries aggregated daily_stats collection
 * - Returns summary, daily breakdown, device stats, and top pages
 * - Requires authentication and site ownership
 */
export async function GET(request: NextRequest) {
  const timer = new PerformanceTimer('Stats API');
  
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const site_id = searchParams.get('site_id');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    
    if (!site_id || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Missing required parameters: site_id, start_date, end_date' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify site ownership
    const site = await Site.findOne({ site_id, user_id: session.user.id });
    if (!site) {
      return NextResponse.json({ error: 'Site not found or access denied' }, { status: 404 });
    }

    // Query daily stats for date range
    const stats = await DailyStats.find({
      site_id,
      date: { $gte: start_date, $lte: end_date },
    }).sort({ date: 1 }).lean();

    // Calculate summary metrics
    let total_views = 0;
    let unique_visitors = new Set<string>();
    const pathCountsMap = new Map<string, number>();
    const deviceCountsMap = new Map<string, number>();
    const dailyData: Array<{ date: string; views: number; visitors: number }> = [];

    for (const dayStat of stats) {
      total_views += dayStat.total_views || 0;
      
      // Add unique users
      if (dayStat.unique_users) {
        dayStat.unique_users.forEach((userId: string) => unique_visitors.add(userId));
      }

      // Aggregate path counts
      const pathCounts = dayStat.path_counts || {};
      Object.entries(pathCounts).forEach(([path, count]) => {
        pathCountsMap.set(path, (pathCountsMap.get(path) || 0) + (count as number));
      });

      // Daily breakdown
      dailyData.push({
        date: dayStat.date,
        views: dayStat.total_views || 0,
        visitors: dayStat.unique_users?.length || 0,
      });
    }

    // Get device breakdown from recent events (last 7 days of range)
    const recentStartDate = stats.length > 7 ? stats[stats.length - 7].date : start_date;
    const deviceStats = await Event.aggregate([
      {
        $match: {
          site_id,
          timestamp: {
            $gte: new Date(recentStartDate),
            $lte: new Date(end_date + 'T23:59:59.999Z'),
          },
        },
      },
      {
        $group: {
          _id: '$device_type',
          count: { $sum: 1 },
        },
      },
    ]);

    const devices = deviceStats.map((d) => ({
      device: d._id || 'Unknown',
      count: d.count,
    }));

    // Top pages
    const top_pages = Array.from(pathCountsMap.entries())
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20);

    // Calculate previous period for comparison
    const dateRange = new Date(end_date).getTime() - new Date(start_date).getTime();
    const prevEndDate = new Date(new Date(start_date).getTime() - 86400000).toISOString().split('T')[0];
    const prevStartDate = new Date(new Date(start_date).getTime() - dateRange - 86400000).toISOString().split('T')[0];

    const prevStats = await DailyStats.find({
      site_id,
      date: { $gte: prevStartDate, $lte: prevEndDate },
    }).lean();

    let prev_total_views = 0;
    let prev_unique_visitors = new Set<string>();
    
    for (const dayStat of prevStats) {
      prev_total_views += dayStat.total_views || 0;
      if (dayStat.unique_users) {
        dayStat.unique_users.forEach((userId: string) => prev_unique_visitors.add(userId));
      }
    }

    // Calculate percentage changes
    const change_views = prev_total_views > 0 
      ? ((total_views - prev_total_views) / prev_total_views) * 100 
      : 0;
    const change_visitors = prev_unique_visitors.size > 0 
      ? ((unique_visitors.size - prev_unique_visitors.size) / prev_unique_visitors.size) * 100 
      : 0;

    // Calculate avg session duration and bounce rate (simplified for now)
    const avg_session_duration = 180; // 3 minutes default
    const bounce_rate = 45.5; // Default bounce rate

    const response = {
      summary: {
        total_views,
        unique_visitors: unique_visitors.size,
        avg_session_duration,
        bounce_rate,
        change_views,
        change_visitors,
        change_duration: 0,
        change_bounce: 0,
      },
      daily: dailyData,
      devices,
      top_pages,
    };

    const duration = timer.end();

    return NextResponse.json(response, { status: 200 });
    
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
