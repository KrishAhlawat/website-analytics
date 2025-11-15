import { NextRequest, NextResponse } from 'next/server';
import { validateEvent } from '@/lib/validateEvent';
import { addEventToQueue } from '@/lib/queue';
import { PerformanceTimer } from '@/lib/utils';
import { connectDB, Site } from '@/lib/db';
import { checkRateLimit } from '@/lib/rateLimiter';

/**
 * POST /api/event
 * 
 * High-performance ingestion endpoint
 * - Validates event data
 * - Pushes to BullMQ queue
 * - Returns immediately (< 50ms target)
 * - Does NOT write to database directly
 */
export async function POST(request: NextRequest) {
  const timer = new PerformanceTimer('Ingestion API');
  
  try {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.headers.get('host') || 'unknown';
    const rl = await checkRateLimit(ip);
    if (!rl.allowed) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Authenticate by API key
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Missing x-api-key header' }, { status: 401 });
    }

    await connectDB();
    const site = await Site.findOne({ api_key: apiKey }).lean();
    if (!site) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    // Validate event data (site_id optional in schema)
    const validation = validateEvent(body);
    
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

    // Attach site_id from authenticated site
    const eventData = { ...validation.data!, site_id: site.site_id };

    // Push event to queue (non-blocking)
    await addEventToQueue(eventData as any);
    
    const duration = timer.end();
    
    // Return success immediately
    return NextResponse.json(
      {
        success: true,
        message: 'Event queued successfully',
        processing_time_ms: duration,
      },
      { status: 200 }
    );
    
  } catch (error: any) {
    timer.end();
    console.error('[Ingestion API] Error:', error);
    
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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, X-Api-Key',
      },
    }
  );
}
