import 'dotenv/config';
import { Job } from 'bullmq';
import { createWorker, AnalyticsEvent, closeQueue } from '../lib/queue';
import { connectDB, Event, DailyStats } from '../lib/db';
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

// Process a single event
async function processEvent(job: Job<AnalyticsEvent>): Promise<void> {
  const timer = new PerformanceTimer(`Processing Job ${job.id}`);
  
  try {
    // Ensure DB connection
    await connectDB();
    
    const event = job.data;
    logWithTimestamp(`Processing event for site: ${event.site_id}`);
    
    // 1. Store raw event in 'events' collection
    const eventDoc = new Event({
      site_id: event.site_id,
      event_type: event.event_type,
      path: event.path,
      user_id: event.user_id,
      timestamp: new Date(event.timestamp),
      processed_at: new Date(),
    });
    
    await eventDoc.save();
    logWithTimestamp(`Saved event to DB: ${eventDoc._id}`);
    
    // 2. Update aggregated stats in 'daily_stats' collection
    const eventDate = formatDate(new Date(event.timestamp));
    
    await DailyStats.findOneAndUpdate(
      {
        site_id: event.site_id,
        date: eventDate,
      },
      {
        $inc: { total_views: 1 },
        $addToSet: { unique_users: event.user_id },
        $set: {
          [`path_counts.${event.path}`]: {
            $cond: {
              if: { $exists: [`$path_counts.${event.path}`] },
              then: { $add: [`$path_counts.${event.path}`, 1] },
              else: 1,
            },
          },
          updated_at: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
      }
    );
    
    // Alternative approach using aggregation pipeline for path_counts
    // This is more reliable than the conditional update above
    const stats = await DailyStats.findOne({
      site_id: event.site_id,
      date: eventDate,
    });
    
    if (stats) {
      const pathCounts = stats.path_counts as Map<string, number>;
      const currentCount = pathCounts.get(event.path) || 0;
      pathCounts.set(event.path, currentCount + 1);
      
      stats.path_counts = pathCounts;
      stats.updated_at = new Date();
      await stats.save();
    }
    
    const duration = timer.end();
    logWithTimestamp(`Event processed successfully in ${duration}ms`);
    
  } catch (error: any) {
    logError('Event Processing', error);
    timer.end();
    throw error; // Will trigger retry
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
