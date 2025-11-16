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
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
  };
  
  try {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.headers.get('host') || 'unknown';
    const rl = await checkRateLimit(ip);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429, headers: corsHeaders }
      );
    }

    // Authenticate by API key (check both variations)
    const apiKey = request.headers.get('x-api-key') || request.headers.get('X-API-Key');
    console.log('[Event API] Received API key:', apiKey ? apiKey.substring(0, 10) + '...' : 'NONE');
    
    if (!apiKey) {
      console.log('[Event API] Missing API key header');
      return NextResponse.json(
        { success: false, error: 'Missing API key header' },
        { status: 401, headers: corsHeaders }
      );
    }

    await connectDB();
    const site = await Site.findOne({ api_key: apiKey }).lean();
    console.log('[Event API] Site found:', site ? site.site_id : 'NO MATCH');
    
    if (!site) {
      console.log('[Event API] Looking for API key:', apiKey);
      const allSites = await Site.find({}).select('site_id api_key').lean();
      console.log('[Event API] Available sites:', allSites.map(s => ({ id: s.site_id, key: s.api_key.substring(0, 10) + '...' })));
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    console.log('[Event API] Received body:', JSON.stringify(body).substring(0, 200));

    // Validate event data (site_id optional in schema)
    const validation = validateEvent(body);
    
    if (!validation.success) {
      timer.end();
      console.log('[Event API] Validation failed:', validation.errors?.issues);
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.errors?.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400, headers: corsHeaders }
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
      { status: 200, headers: corsHeaders }
    );
    
  } catch (error: any) {
    timer.end();
    console.error('[Ingestion API] Error:', error);
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    };
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500, headers: corsHeaders }
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
