# Deployment Guide - Website Analytics Platform

This guide covers deploying the analytics platform to various environments.

## Table of Contents
1. [Local Development](#local-development)
2. [Docker Deployment](#docker-deployment)
3. [Production Deployment](#production-deployment)
4. [AWS Deployment](#aws-deployment)
5. [Monitoring & Scaling](#monitoring--scaling)

---

## Local Development

### Prerequisites
- Node.js >= 18.0.0
- MongoDB (local or Docker)
- Redis (local or Docker)

### Quick Start
```bash
# Install dependencies
npm install

# Start services with Docker
npm run docker:up

# Start API server (Terminal 1)
npm run dev

# Start worker (Terminal 2)
npm run worker

# Run tests
npm run test:api

# Generate sample data
npm run generate:data
```

---

## Docker Deployment

### Using Docker Compose

The project includes a `docker-compose.yml` for MongoDB and Redis:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Full Dockerized Application

Create a `Dockerfile` for the application:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

Worker Dockerfile (`Dockerfile.worker`):

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

CMD ["npm", "run", "worker:prod"]
```

### Docker Compose with Application

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    restart: always
    volumes:
      - mongodb_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=analytics
    networks:
      - analytics-network

  redis:
    image: redis:latest
    restart: always
    volumes:
      - redis_data:/data
    networks:
      - analytics-network

  api:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/analytics
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - NODE_ENV=production
    depends_on:
      - mongodb
      - redis
    networks:
      - analytics-network

  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    restart: always
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/analytics
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - NODE_ENV=production
      - QUEUE_CONCURRENCY=10
    depends_on:
      - mongodb
      - redis
    networks:
      - analytics-network

volumes:
  mongodb_data:
  redis_data:

networks:
  analytics-network:
    driver: bridge
```

Run with:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## Production Deployment

### Environment Variables

Create `.env.production`:

```env
# MongoDB
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/analytics

# Redis
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Queue
QUEUE_NAME=analytics_events
QUEUE_CONCURRENCY=20

# AWS (if using)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
CLOUDWATCH_LOG_GROUP=/analytics/production

# Application
NODE_ENV=production
PORT=3000
```

### Using PM2 (Process Manager)

Install PM2:
```bash
npm install -g pm2
```

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'analytics-api',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
    {
      name: 'analytics-worker',
      script: 'npm',
      args: 'run worker:prod',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
  ],
};
```

Start with PM2:
```bash
# Start all processes
pm2 start ecosystem.config.js

# Save configuration
pm2 save

# Setup startup script
pm2 startup

# Monitor
pm2 monit

# View logs
pm2 logs
```

---

## AWS Deployment

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Route 53 / ALB                    │
└──────────────────────┬──────────────────────────────┘
                       │
       ┌───────────────┴───────────────┐
       │                               │
┌──────▼──────┐              ┌─────────▼────────┐
│  ECS/Fargate│              │   ECS/Fargate    │
│   API Tasks │              │  Worker Tasks    │
└──────┬──────┘              └─────────┬────────┘
       │                               │
       │         ┌─────────────┐       │
       └────────▶│ ElastiCache │◀──────┘
                 │   (Redis)   │
                 └─────────────┘
                        │
                 ┌──────▼──────┐
                 │  DocumentDB │
                 │  (MongoDB)  │
                 └─────────────┘
```

### AWS Services Setup

#### 1. DocumentDB (MongoDB)
```bash
aws docdb create-db-cluster \
  --db-cluster-identifier analytics-cluster \
  --engine docdb \
  --master-username admin \
  --master-user-password YourPassword123
```

#### 2. ElastiCache (Redis)
```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id analytics-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1
```

#### 3. ECS Task Definitions

API Task Definition (`task-definition-api.json`):
```json
{
  "family": "analytics-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "analytics-api",
      "image": "your-ecr-repo/analytics-api:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "MONGODB_URI",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:mongodb-uri"
        },
        {
          "name": "REDIS_HOST",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:redis-host"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/analytics-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

Worker Task Definition (`task-definition-worker.json`):
```json
{
  "family": "analytics-worker",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "analytics-worker",
      "image": "your-ecr-repo/analytics-worker:latest",
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "QUEUE_CONCURRENCY",
          "value": "20"
        }
      ],
      "secrets": [
        {
          "name": "MONGODB_URI",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:mongodb-uri"
        },
        {
          "name": "REDIS_HOST",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:redis-host"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/analytics-worker",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### 4. Deploy to ECS

```bash
# Build and push Docker images
docker build -t analytics-api .
docker tag analytics-api:latest $ECR_REPO/analytics-api:latest
docker push $ECR_REPO/analytics-api:latest

docker build -f Dockerfile.worker -t analytics-worker .
docker tag analytics-worker:latest $ECR_REPO/analytics-worker:latest
docker push $ECR_REPO/analytics-worker:latest

# Register task definitions
aws ecs register-task-definition --cli-input-json file://task-definition-api.json
aws ecs register-task-definition --cli-input-json file://task-definition-worker.json

# Create services
aws ecs create-service \
  --cluster analytics-cluster \
  --service-name analytics-api \
  --task-definition analytics-api \
  --desired-count 2 \
  --launch-type FARGATE \
  --load-balancers targetGroupArn=arn:aws:...,containerName=analytics-api,containerPort=3000

aws ecs create-service \
  --cluster analytics-cluster \
  --service-name analytics-worker \
  --task-definition analytics-worker \
  --desired-count 1 \
  --launch-type FARGATE
```

---

## Monitoring & Scaling

### Health Checks

Add health check endpoints to the API:

Create `app/api/health/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { connection as redisConnection } from '@/lib/queue';

export async function GET() {
  try {
    // Check MongoDB
    await connectDB();
    
    // Check Redis
    await redisConnection.ping();
    
    return NextResponse.json({
      status: 'healthy',
      services: {
        mongodb: 'connected',
        redis: 'connected',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
```

### CloudWatch Metrics

Implement CloudWatch metrics:

```typescript
// lib/metrics.ts
import { CloudWatch } from 'aws-sdk';

const cloudwatch = new CloudWatch({ region: process.env.AWS_REGION });

export async function sendMetric(
  name: string,
  value: number,
  unit: string = 'Count'
) {
  if (!process.env.ENABLE_CLOUDWATCH) return;
  
  await cloudwatch.putMetricData({
    Namespace: 'Analytics',
    MetricData: [
      {
        MetricName: name,
        Value: value,
        Unit: unit,
        Timestamp: new Date(),
      },
    ],
  }).promise();
}
```

### Auto Scaling

Configure ECS auto scaling:

```bash
# API Service Auto Scaling
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/analytics-cluster/analytics-api \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

aws application-autoscaling put-scaling-policy \
  --policy-name cpu-scaling \
  --service-namespace ecs \
  --resource-id service/analytics-cluster/analytics-api \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

`scaling-policy.json`:
```json
{
  "TargetValue": 70.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
  },
  "ScaleInCooldown": 300,
  "ScaleOutCooldown": 60
}
```

### Monitoring Dashboard

Key metrics to monitor:

1. **API Performance**
   - Request latency (p50, p95, p99)
   - Requests per second
   - Error rate

2. **Queue Metrics**
   - Queue length
   - Processing rate
   - Failed jobs

3. **Database**
   - Connection pool size
   - Query latency
   - Disk usage

4. **System Resources**
   - CPU utilization
   - Memory usage
   - Network I/O

---

## Backup Strategy

### MongoDB Backups

```bash
# Daily backup script
mongodump --uri="$MONGODB_URI" --out=/backups/$(date +%Y%m%d)

# Backup to S3
aws s3 sync /backups/ s3://analytics-backups/mongodb/
```

### Redis Backups

Redis persistence configuration in `redis.conf`:
```
save 900 1
save 300 10
save 60 10000
```

---

## Security Checklist

- [ ] Enable MongoDB authentication
- [ ] Use SSL/TLS for database connections
- [ ] Enable Redis AUTH
- [ ] Use AWS Secrets Manager for credentials
- [ ] Enable VPC security groups
- [ ] Implement rate limiting
- [ ] Add API authentication/authorization
- [ ] Enable CORS with specific origins
- [ ] Implement request validation
- [ ] Enable audit logging
- [ ] Regular security updates
- [ ] Use read-only database users where possible

---

## Performance Optimization

1. **Database Indexes**: Ensure all queries use indexes
2. **Connection Pooling**: Optimize pool sizes
3. **Redis Caching**: Cache frequently accessed data
4. **CDN**: Use CloudFront for API caching
5. **Compression**: Enable gzip/brotli compression
6. **Horizontal Scaling**: Add more API/worker instances
7. **Queue Optimization**: Tune concurrency and batch sizes

---

## Cost Optimization

- Use AWS Reserved Instances for predictable workloads
- Enable ECS Fargate Spot for worker tasks
- Use ElastiCache reserved nodes
- Implement data retention policies (archive old events)
- Monitor and right-size instance types
- Use S3 lifecycle policies for backups

---

For more information, see the main [README.md](README.md).
