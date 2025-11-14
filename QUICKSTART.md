# Website Analytics Platform - Quick Start Guide

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` with your configuration:
```env
MONGODB_URI=mongodb://localhost:27017/analytics
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Start Services

#### Option A: Using Docker (Recommended)
```bash
# Start MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Start Redis
docker run -d -p 6379:6379 --name redis redis:latest
```

#### Option B: Local Installation
- Install MongoDB: https://www.mongodb.com/try/download/community
- Install Redis: https://redis.io/download

### 4. Run the Application

**Terminal 1 - API Server:**
```bash
npm run dev
```
Server runs at: http://localhost:3000

**Terminal 2 - Background Worker:**
```bash
npm run worker
```

## Quick Test

### Send an Event
```bash
curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -d '{
    "site_id": "my-website",
    "event_type": "pageview",
    "path": "/home",
    "user_id": "user-123"
  }'
```

### Get Statistics
```bash
curl "http://localhost:3000/api/stats?site_id=my-website"
```

## Architecture Overview

```
┌─────────────┐      ┌──────────┐      ┌──────────────┐      ┌─────────┐
│   Client    │─────▶│   API    │─────▶│  Redis Queue │─────▶│ Worker  │
│             │      │  /event  │      │   (BullMQ)   │      │         │
└─────────────┘      └──────────┘      └──────────────┘      └────┬────┘
                          │                                        │
                          │                                        ▼
                          │                                  ┌──────────┐
                          └─────────────────────────────────▶│ MongoDB  │
                                    Query                    │          │
                                                             └──────────┘
```

## Key Features

✅ **Ultra-Fast Ingestion**: < 50ms response time  
✅ **Queue-Based Processing**: Asynchronous with BullMQ  
✅ **Automatic Retries**: 5 attempts with exponential backoff  
✅ **Real-Time Aggregation**: Pre-computed daily statistics  
✅ **Scalable Architecture**: Horizontal scaling ready  

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Customize worker concurrency in `.env`
- Set up monitoring for production
- Implement AWS SQS/CloudWatch integration

## Troubleshooting

**Redis connection error?**
- Check Redis is running: `redis-cli ping`
- Verify REDIS_HOST and REDIS_PORT in `.env`

**MongoDB connection error?**
- Check MongoDB is running: `mongosh`
- Verify MONGODB_URI in `.env`

**Events not processing?**
- Ensure worker is running: `npm run worker`
- Check worker logs for errors
- Verify queue status: `redis-cli LLEN bull:analytics_events:wait`

---

For complete documentation, see [README.md](README.md)
