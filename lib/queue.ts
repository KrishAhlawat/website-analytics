import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const QUEUE_NAME = process.env.QUEUE_NAME || 'analytics_events';

// Redis connection configuration
const redisConfig = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Create Redis connection for BullMQ
export const connection = new IORedis(redisConfig);

// Event interface for queue
export interface AnalyticsEvent {
  site_id: string;
  event_type: string;
  path: string;
  user_id: string;
  timestamp: string;
}

// Initialize the queue
export const analyticsQueue = new Queue<AnalyticsEvent>(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 1000,
      age: 24 * 3600, // 24 hours
    },
    removeOnFail: {
      count: 5000,
      age: 7 * 24 * 3600, // 7 days
    },
  },
});

// Log queue errors
analyticsQueue.on('error', (error) => {
  console.error('[Queue] Error:', error);
});

// Add event to queue
export async function addEventToQueue(event: AnalyticsEvent): Promise<void> {
  const startTime = Date.now();
  
  try {
    await analyticsQueue.add('process-event', event, {
      priority: 1,
    });
    
    const duration = Date.now() - startTime;
    console.log(`[Queue] Event queued in ${duration}ms`);
  } catch (error) {
    console.error('[Queue] Failed to add event:', error);
    throw error;
  }
}

// Create worker (used in processor)
export function createWorker(
  processorFunction: (job: Job<AnalyticsEvent>) => Promise<void>
) {
  const concurrency = parseInt(process.env.QUEUE_CONCURRENCY || '10');
  
  const worker = new Worker<AnalyticsEvent>(
    QUEUE_NAME,
    processorFunction,
    {
      connection: new IORedis(redisConfig),
      concurrency,
      limiter: {
        max: 100,
        duration: 1000,
      },
    }
  );

  // Worker event handlers
  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[Worker] Worker error:', err);
  });

  return worker;
}

// Graceful shutdown
export async function closeQueue(): Promise<void> {
  await analyticsQueue.close();
  await connection.quit();
  console.log('[Queue] Connections closed');
}

// AWS SQS placeholder (future implementation)
export async function sendToSQS(event: AnalyticsEvent): Promise<void> {
  // TODO: Implement SQS integration
  // const AWS = require('aws-sdk');
  // const sqs = new AWS.SQS({ region: process.env.AWS_REGION });
  // await sqs.sendMessage({
  //   QueueUrl: process.env.SQS_QUEUE_URL,
  //   MessageBody: JSON.stringify(event),
  // }).promise();
  
  console.log('[SQS] Placeholder: Would send to SQS', event);
}

// CloudWatch logging placeholder (future implementation)
export async function logToCloudWatch(
  message: string,
  data?: Record<string, any>
): Promise<void> {
  // TODO: Implement CloudWatch integration
  // const AWS = require('aws-sdk');
  // const cloudwatchlogs = new AWS.CloudWatchLogs({ region: process.env.AWS_REGION });
  // await cloudwatchlogs.putLogEvents({
  //   logGroupName: process.env.CLOUDWATCH_LOG_GROUP,
  //   logStreamName: 'analytics-stream',
  //   logEvents: [{
  //     message: JSON.stringify({ message, ...data }),
  //     timestamp: Date.now(),
  //   }],
  // }).promise();
  
  const timestamp = new Date().toISOString();
  console.log(`[CloudWatch] ${timestamp} - ${message}`, data || '');
}
