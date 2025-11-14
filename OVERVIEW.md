# Project Overview - Website Analytics Platform

## 🎯 What This Project Does

A **high-performance analytics backend** designed to handle millions of events with:
- ⚡ **Ultra-fast ingestion** (< 50ms response time)
- 🔄 **Queue-based asynchronous processing**
- 📊 **Real-time aggregated statistics**
- 🚀 **Horizontally scalable architecture**

## 🏗️ System Architecture

```
┌─────────────┐
│   Website   │ Tracks user events
└──────┬──────┘
       │ POST /api/event (< 50ms)
       ▼
┌─────────────┐
│ Ingestion   │ Validates & queues events
│ API         │ Returns immediately
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Redis Queue │ BullMQ manages event queue
│ (BullMQ)    │ 5 retries, exponential backoff
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Background  │ Processes events asynchronously
│ Worker      │ Concurrent processing
└──────┬──────┘
       │
       ├─────────────────┐
       ▼                 ▼
┌──────────────┐  ┌─────────────┐
│ Raw Events   │  │ Daily Stats │
│ Collection   │  │ Collection  │
│ (MongoDB)    │  │ (Aggregated)│
└──────────────┘  └──────┬──────┘
                         │
                         ▼
                  ┌─────────────┐
                  │ Reporting   │ GET /api/stats
                  │ API         │ Fast queries
                  └─────────────┘
```

## 📂 File Structure Explained

```
website-analytics/
│
├── app/                          # Next.js App Router
│   ├── api/
│   │   ├── event/route.ts       # 🟢 Ingestion API (POST)
│   │   ├── stats/route.ts       # 🔵 Reporting API (GET)
│   │   └── health/route.ts      # 🟡 Health Check
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page with docs
│
├── lib/                          # Core modules
│   ├── db.ts                    # MongoDB connection & schemas
│   ├── queue.ts                 # Redis & BullMQ setup
│   ├── validateEvent.ts         # Zod validation schemas
│   └── utils.ts                 # Helper functions
│
├── worker/                       # Background processing
│   └── processor.ts             # Event processor worker
│
├── scripts/                      # Utility scripts
│   ├── test-analytics.ts        # API testing suite
│   └── generate-sample-data.ts  # Sample data generator
│
├── package.json                  # Dependencies & scripts
├── tsconfig.json                # TypeScript config
├── next.config.js               # Next.js config
├── docker-compose.yml           # Docker services setup
│
├── README.md                    # Full documentation
├── QUICKSTART.md                # Quick start guide
├── DEPLOYMENT.md                # Deployment guide
└── .env.example                 # Environment variables template
```

## 🔧 Core Technologies

| Technology | Purpose | Why? |
|------------|---------|------|
| **Next.js 14** | API Routes | Fast, modern framework with App Router |
| **TypeScript** | Type Safety | Catch errors at compile time |
| **MongoDB** | Database | Document-based, flexible schema |
| **Mongoose** | ODM | Schema validation, relationships |
| **Redis** | Cache/Queue | In-memory speed for queuing |
| **BullMQ** | Queue Management | Reliable job processing with retries |
| **Zod** | Validation | Runtime type validation |

## 🚦 How It Works

### 1. Event Ingestion Flow

```typescript
Client → POST /api/event → Validate → Queue → Return Success (< 50ms)
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -d '{
    "site_id": "my-website",
    "event_type": "pageview",
    "path": "/products",
    "user_id": "user-123"
  }'
```

**Response (12ms):**
```json
{
  "success": true,
  "message": "Event queued successfully",
  "processing_time_ms": 12
}
```

### 2. Background Processing Flow

```typescript
Queue → Worker → MongoDB (events) → Update (daily_stats) → Done
```

The worker:
1. Pulls event from queue
2. Saves raw event to `events` collection
3. Updates aggregated stats in `daily_stats`:
   - Increments total views
   - Adds unique user (if new)
   - Updates path view counts
4. Logs processing time

### 3. Reporting Flow

```typescript
Client → GET /api/stats → Query MongoDB → Transform → Return
```

**Example Request:**
```bash
curl "http://localhost:3000/api/stats?site_id=my-website&date=2024-01-15"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "site_id": "my-website",
    "date": "2024-01-15",
    "total_views": 1523,
    "unique_users_count": 342,
    "top_paths": [
      { "path": "/home", "views": 456 },
      { "path": "/products", "views": 289 },
      { "path": "/about", "views": 187 }
    ]
  }
}
```

## 📊 Database Schema

### Events Collection (Raw Data)
Stores every event for historical analysis:
```typescript
{
  site_id: "my-website",
  event_type: "pageview",
  path: "/products",
  user_id: "user-123",
  timestamp: "2024-01-15T10:30:00Z",
  processed_at: "2024-01-15T10:30:01Z"
}
```

### Daily Stats Collection (Aggregated)
Pre-computed daily summaries for fast queries:
```typescript
{
  site_id: "my-website",
  date: "2024-01-15",
  total_views: 1523,
  unique_users: ["user-1", "user-2", ...],
  path_counts: {
    "/home": 456,
    "/products": 289,
    "/about": 187
  }
}
```

## ⚡ Performance Characteristics

| Operation | Target | Typical | Strategy |
|-----------|--------|---------|----------|
| **Event Ingestion** | < 50ms | 10-20ms | Queue-based, non-blocking |
| **Stats Query** | < 100ms | 20-50ms | Pre-aggregated data |
| **Worker Processing** | N/A | 50-100ms/event | Concurrent (10 workers) |
| **Queue Throughput** | 100 jobs/sec | Configurable | Rate limiting |

## 🔐 Security Features

- ✅ Input validation with Zod schemas
- ✅ Error handling with graceful fallbacks
- ✅ CORS support for cross-origin requests
- ✅ Environment variable configuration
- ✅ Health check endpoint for monitoring
- 🔜 Rate limiting (TODO)
- 🔜 API key authentication (TODO)

## 📈 Scalability

### Horizontal Scaling

**API Servers:**
- Run multiple instances behind load balancer
- Stateless design (no shared memory)
- Each handles 1000+ req/sec

**Workers:**
- Add more worker processes
- Each processes events independently
- Configured concurrency per worker

**Database:**
- MongoDB replica sets for HA
- Read replicas for reporting
- Sharding for massive scale

**Queue:**
- Redis Cluster for high availability
- Separate queues for priority levels
- Replace with AWS SQS for managed service

## 🛠️ Configuration Options

All configurable via `.env`:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/analytics

# Queue
REDIS_HOST=localhost
REDIS_PORT=6379
QUEUE_CONCURRENCY=10        # Workers per process

# Features
USE_SQS=false               # Use AWS SQS instead of Redis
ENABLE_CLOUDWATCH=false     # Send logs to CloudWatch
```

## 🎯 Use Cases

1. **Website Traffic Analysis**
   - Track page views, clicks, scrolls
   - Understand user behavior
   - Optimize content strategy

2. **Product Analytics**
   - Feature usage tracking
   - User engagement metrics
   - A/B test results

3. **Marketing Analytics**
   - Campaign performance
   - Conversion tracking
   - Attribution modeling

4. **Real-time Dashboards**
   - Live traffic monitoring
   - Alert on anomalies
   - Business intelligence

## 🚀 Quick Commands

```bash
# Development
npm run dev              # Start API server
npm run worker           # Start background worker
npm run docker:up        # Start MongoDB & Redis

# Testing
npm run test:api         # Run API tests
npm run generate:data    # Generate sample data

# Production
npm run build            # Build for production
npm start                # Start production server
npm run worker:prod      # Start production worker

# Utilities
npm run type-check       # TypeScript validation
npm run lint             # ESLint check
```

## 🎓 Learning Resources

If you're new to the technologies:

- **Next.js App Router**: https://nextjs.org/docs/app
- **BullMQ**: https://docs.bullmq.io/
- **MongoDB**: https://www.mongodb.com/docs/
- **Zod**: https://zod.dev/
- **TypeScript**: https://www.typescriptlang.org/docs/

## 🤝 Contributing

When adding features:
1. Follow TypeScript strict mode
2. Add input validation
3. Include error handling
4. Add performance logging
5. Update documentation
6. Write tests

## 📞 Support

For issues or questions:
1. Check the [README.md](README.md)
2. Review [DEPLOYMENT.md](DEPLOYMENT.md)
3. Run health check: `curl http://localhost:3000/api/health`
4. Check logs: API server & worker process

---

Built with ❤️ using modern TypeScript, Next.js, MongoDB, and BullMQ.
