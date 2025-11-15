import 'dotenv/config';
import { Job } from 'bullmq';
import { createWorker, AnalyticsEvent, closeQueue } from '../lib/queue';
import { connectDB, Event, DailyStats } from '../lib/db';
import { buildDailyStatsBulkOps, updateSession, calculateSessionMetrics } from '../lib/stats';
import { formatDate, logWithTimestamp, logError, PerformanceTimer } from '../lib/utils';

/**
 * Background Worker for Processing Analytics Events
 * 
 * Responsibilities:
 * 1. Pull events from BullMQ queue
 * 2. Store raw events in MongoDB 'events' collection
 * 3. Update session tracking
 * 4. Update aggregated stats in 'daily_stats' collection
 * 5. Calculate session metrics (duration, pages per session, bounce rate)
 * 6. Handle retries (5 attempts with exponential backoff)
 */

// Batched processing implementation
// Buffer events up to BATCH_SIZE or TIMEOUT_MS then perform bulk writes
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '50', 10);
const TIMEOUT_MS = parseInt(process.env.BATCH_TIMEOUT_MS || '1000', 10);

type BufferedEvent = {
  job: Job<AnalyticsEvent>;
  data: AnalyticsEvent;
  resolve: () => void;
  reject: (err: any) => void;
};

const buffer: BufferedEvent[] = [];
let timerHandle: NodeJS.Timeout | null = null;
const processedDates = new Set<string>(); // Track dates that need session metric recalculation

async function flushBuffer() {
  if (timerHandle) {
    clearTimeout(timerHandle);
    timerHandle = null;
  }

  if (buffer.length === 0) return;

  const batch = buffer.splice(0, buffer.length);
  const perf = new PerformanceTimer(`Batch Processing ${batch.length} events`);

  try {
    await connectDB();

    // Prepare bulk ops for events
    const eventInserts = batch.map(b => ({
      insertOne: {
        document: {
          site_id: b.data.site_id,
          session_id: b.data.session_id || b.data.user_id, // fallback for old events
          visitor_id: b.data.visitor_id || b.data.user_id,
          event_type: b.data.event_type,
          path: b.data.path,
          user_id: b.data.user_id, // Keep for backward compatibility
          timestamp: new Date(b.data.timestamp),
          device_type: b.data.device_type,
          browser: b.data.browser,
          os: b.data.os,
          referrer: b.data.referrer,
          screen_resolution: b.data.screen_resolution,
          viewport_size: b.data.viewport_size,
          user_props: b.data.user_props || {},
          metadata: b.data.metadata || {},
          processed_at: new Date(),
        }
      }
    }));

    // Update session tracking
    const sessionUpdates = batch.map(b => 
      updateSession(
        b.data.session_id || b.data.user_id!,
        b.data.site_id!,
        b.data.visitor_id || b.data.user_id!,
        b.data.referrer,
        b.data.user_agent
      )
    );

    // Prepare daily stats bulk ops
    const statsEvents = batch.map(b => ({ 
      site_id: b.data.site_id!, 
      date: formatDate(new Date(b.data.timestamp)),
      visitor_id: b.data.visitor_id || b.data.user_id!,
      path: b.data.path,
      device_type: b.data.device_type,
      browser: b.data.browser,
      referrer: b.data.referrer,
    }));
    const statsOps = buildDailyStatsBulkOps(statsEvents);

    // Track dates for session metrics recalculation
    for (const b of batch) {
      const dateKey = `${b.data.site_id}::${formatDate(new Date(b.data.timestamp))}`;
      processedDates.add(dateKey);
    }

    // Execute bulk writes in parallel
    await Promise.all([
      eventInserts.length > 0 ? Event.collection.bulkWrite(eventInserts, { ordered: false }) : Promise.resolve(),
      ...sessionUpdates,
      statsOps.length > 0 ? DailyStats.collection.bulkWrite(statsOps, { ordered: false }) : Promise.resolve(),
    ]);

    // Resolve all job promises
    for (const b of batch) {
      try { b.resolve(); } catch (e) { /* ignore */ }
    }

    perf.end();
    logWithTimestamp(`Batch of ${batch.length} events processed`);
  } catch (err) {
    logError('Batch Processing', err);
    // Reject all job promises
    for (const b of batch) {
      try { b.reject(err); } catch (e) { /* ignore */ }
    }
  }
}

async function processEvent(job: Job<AnalyticsEvent>): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const item: BufferedEvent = { job, data: job.data, resolve, reject };
    buffer.push(item);

    if (buffer.length >= BATCH_SIZE) {
      // immediate flush
      void flushBuffer();
    } else if (!timerHandle) {
      timerHandle = setTimeout(() => void flushBuffer(), TIMEOUT_MS);
    }
  });
}

// Periodic task to recalculate session metrics
async function recalculateSessionMetrics() {
  if (processedDates.size === 0) return;

  const dates = Array.from(processedDates);
  processedDates.clear();

  logWithTimestamp(`Recalculating session metrics for ${dates.length} site-date combinations`);

  for (const dateKey of dates) {
    const [site_id, date] = dateKey.split('::');
    
    try {
      const metrics = await calculateSessionMetrics(site_id, date);
      
      await DailyStats.updateOne(
        { site_id, date },
        { 
          $set: {
            sessions_count: metrics.sessions_count,
            avg_session_duration: metrics.avg_session_duration,
            avg_pages_per_session: metrics.avg_pages_per_session,
            bounce_rate: metrics.bounce_rate,
          }
        }
      );
    } catch (err) {
      logError(`Session Metrics Calculation (${site_id}, ${date})`, err);
    }
  }
}

// Initialize worker
async function startWorker() {
  try {
    logWithTimestamp('Starting Analytics Processor Worker...');
    
    // Connect to database
    await connectDB();
    logWithTimestamp('Database connected');
    
    // Create and start worker
    const worker = createWorker(processEvent);
    logWithTimestamp(`Worker started with concurrency: ${process.env.QUEUE_CONCURRENCY || 10}`);
    
    // Periodic session metrics recalculation (every 30 seconds)
    const sessionMetricsInterval = setInterval(() => {
      void recalculateSessionMetrics();
    }, 30000);
    
    // Graceful shutdown handlers
    const gracefulShutdown = async (signal: string) => {
      logWithTimestamp(`${signal} received. Shutting down gracefully...`);
      
      clearInterval(sessionMetricsInterval);
      
      // Flush any remaining events
      await flushBuffer();
      
      // Recalculate session metrics one last time
      await recalculateSessionMetrics();
      
      await worker.close();
      logWithTimestamp('Worker closed');
      
      await closeQueue();
      logWithTimestamp('Queue connections closed');
      
      process.exit(0);
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    logWithTimestamp('Worker is ready to process events');
    
  } catch (error: any) {
    logError('Worker Startup', error);
    process.exit(1);
  }
}

// Start the worker
startWorker();
