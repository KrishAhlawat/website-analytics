import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { connection as redisConnection } from '@/lib/queue';

/**
 * GET /api/health
 * 
 * Health check endpoint for monitoring and load balancers
 * - Checks MongoDB connection
 * - Checks Redis connection
 * - Returns service status
 */
export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, any> = {};
  
  try {
    // Check MongoDB
    try {
      await connectDB();
      checks.mongodb = {
        status: 'connected',
        latency_ms: Date.now() - startTime,
      };
    } catch (error: any) {
      checks.mongodb = {
        status: 'error',
        error: error.message,
      };
    }
    
    // Check Redis
    try {
      const redisStart = Date.now();
      await redisConnection.ping();
      checks.redis = {
        status: 'connected',
        latency_ms: Date.now() - redisStart,
      };
    } catch (error: any) {
      checks.redis = {
        status: 'error',
        error: error.message,
      };
    }
    
    // Determine overall health
    const isHealthy = checks.mongodb.status === 'connected' && 
                      checks.redis.status === 'connected';
    
    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: checks,
      version: '1.0.0',
    };
    
    return NextResponse.json(
      response,
      { status: isHealthy ? 200 : 503 }
    );
    
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
