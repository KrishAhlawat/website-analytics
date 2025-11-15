import 'dotenv/config';
import { Job } from 'bullmq';
import { createWorker, AnalyticsEvent, closeQueue } from '../lib/queue';
import { connectDB, Event } from '../lib/db';
import { buildDailyStatsBulkOps } from '../lib/stats';
import { formatDate, logWithTimestamp, logError, PerformanceTimer } from '../lib/utils';

/**
 * Background Worker for Processing Analytics Events
 * 
 * Responsibilities:
 * 1. Pull events from BullMQ queue
 * 2. Store raw events in MongoDB 'events' collection
 * 3. Update aggregated stats in 'daily_stats' collection
 * 4. Handle retries (5 attempts with exponential backoff)
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

    // Prepare bulk ops for events and daily_stats
    const eventInserts = batch.map(b => ({
      insertOne: {
        document: {
          site_id: b.data.site_id,
          event_type: b.data.event_type,
          path: b.data.path,
          user_id: b.data.user_id,
          timestamp: new Date(b.data.timestamp),
          processed_at: new Date(),
        }
      }
    }));

    // Prepare daily stats bulk ops
    const statsEvents = batch.map(b => ({ site_id: b.data.site_id!, date: formatDate(new Date(b.data.timestamp)), user_id: b.data.user_id, path: b.data.path }));
    const statsOps = buildDailyStatsBulkOps(statsEvents as any);

    // Execute bulk writes
    if (eventInserts.length > 0) {
      await (Event.collection as any).bulkWrite(eventInserts, { ordered: false });
    }

    if (statsOps.length > 0) {
      await (Event.db.collection('dailystats') || Event.db.collection('daily_stats')).bulkWrite(statsOps, { ordered: false }).catch(async (err) => {
        // Fallback: try using the DailyStats collection name used in models
        await Event.db.collection('daily_stats').bulkWrite(statsOps, { ordered: false });
      });
    }

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
    
    // Graceful shutdown handlers
    const gracefulShutdown = async (signal: string) => {
      logWithTimestamp(`${signal} received. Shutting down gracefully...`);
      
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
