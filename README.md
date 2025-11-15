# Website Analytics Platform

A high-performance, scalable website analytics backend built with Next.js, MongoDB, Redis, and BullMQ. Designed for fast event ingestion (<50ms) with queue-based asynchronous processing.

## 🏗️ Architecture

The system is built with 3 main components:

### 1. **Ingestion API** (Next.js API Route)
- **Endpoint**: `POST /api/event`
- **Purpose**: Ultra-fast event capture
- **Performance**: Target response time < 50ms
- **Flow**: Validate → Queue → Return immediately
- **Does NOT write to database directly**

### 2. **Background Processor** (Node.js Worker)
- **Script**: `worker/processor.ts`
- **Purpose**: Process queued events asynchronously
- **Flow**: 
  1. Pull events from BullMQ queue
  2. Store raw events in `events` collection
  3. Update aggregated stats in `daily_stats` collection
- **Features**:
  - Automatic retries (5 attempts)
  - Exponential backoff
  - Concurrent processing (configurable)

### 3. **Reporting API** (Next.js API Route)
- **Endpoint**: `GET /api/stats?site_id=...&date=YYYY-MM-DD`
- **Purpose**: Retrieve analytics data
- **Returns**: Total views, unique users, top 10 paths
- **Default**: Last 24 hours if date not specified

---

## 📁 Project Structure

```
website-analytics/
├── app/
│   └── api/
│       ├── event/
│       │   └── route.ts          # Ingestion API endpoint
│       └── stats/
│           └── route.ts          # Reporting API endpoint
├── lib/
│   ├── db.ts                     # MongoDB connection & schemas
│   ├── queue.ts                  # Redis & BullMQ setup
│   ├── validateEvent.ts          # Zod validation schemas
│   └── utils.ts                  # Helper functions
├── worker/
│   └── processor.ts              # Background event processor
├── package.json
├── tsconfig.json
├── next.config.js
├── .env.example
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **MongoDB** (local or Atlas)
- **Redis** (local or cloud)

### Installation

1. **Clone and install dependencies**:
```bash
npm install
```

2. **Set up environment variables**:
```bash
# Copy example env file
cp .env.example .env

# Edit .env with your configuration
```

Required environment variables:
```env
MONGODB_URI=mongodb://localhost:27017/analytics
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
QUEUE_NAME=analytics_events
QUEUE_CONCURRENCY=10
```

3. **Start MongoDB** (if running locally):
```bash
# Windows (if installed as service)
net start MongoDB

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

4. **Start Redis** (if running locally):
```bash
# Using Docker
docker run -d -p 6379:6379 --name redis redis:latest
```

---

## 🎯 Running the Application

You need to run **two processes**:

### 1. Start the Next.js API Server
```bash
npm run dev
```
- Runs on `http://localhost:3000`
- Provides `/api/event` and `/api/stats` endpoints

### 2. Start the Background Worker
```bash
# Development (with auto-reload)
npm run worker

# Production
npm run worker:prod
```
- Processes events from the queue
- Writes to MongoDB
- Updates aggregated stats

### New: Create Site (API key)

To send events you must create a site and API key:

```bash
curl -X POST http://localhost:3000/api/site/create \
  -H "Content-Type: application/json" \
  -d '{ "name": "my-website" }'
```

Response includes `site_id` and `api_key`. Use the `api_key` in the `x-api-key` header for `POST /api/event`.

### Rate Limiting

The ingestion endpoint enforces a Redis-based rate limit: `100 requests per IP per minute` by default. If exceeded the API returns `429 Rate limit exceeded`.

### Cron Worker

Run the cron cleanup job (deletes events older than 7 days and pre-creates daily_stats placeholders):

```bash
npm run cron
```

### Docker

Build and start services (server + worker + mongodb + redis):

```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f
```


---

## 📡 API Usage

### 1. Send Event (Ingestion)

**Endpoint**: `POST /api/event`

**Request Body**:
```json
{
  "site_id": "my-website",
  "event_type": "pageview",
  "path": "/home",
  "user_id": "user-123",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Response** (< 50ms):
```json
{
  "success": true,
  "message": "Event queued successfully",
  "processing_time_ms": 12
}
```

**Using cURL**:
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

**Using JavaScript**:
```javascript
fetch('http://localhost:3000/api/event', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    site_id: 'my-website',
    event_type: 'pageview',
    path: '/home',
    user_id: 'user-123',
  })
});
```

---

### 2. Get Statistics (Reporting)

**Endpoint**: `GET /api/stats`

**Query Parameters**:
- `site_id` (required): Your site identifier
- `date` (optional): Date in `YYYY-MM-DD` format (defaults to today)

**Example Request**:
```bash
curl "http://localhost:3000/api/stats?site_id=my-website&date=2024-01-15"
```

**Response**:
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
  },
  "processing_time_ms": 8
}
```

**Get Last 24 Hours**:
```bash
curl "http://localhost:3000/api/stats?site_id=my-website"
```

---

## 🗄️ Database Schema

### Events Collection (Raw Data)
```typescript
{
  _id: ObjectId,
  site_id: string,
  event_type: string,
  path: string,
  user_id: string,
  timestamp: Date,
  processed_at: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Daily Stats Collection (Aggregated)
```typescript
{
  _id: ObjectId,
  site_id: string,
  date: string,              // YYYY-MM-DD
  total_views: number,
  unique_users: string[],
  path_counts: {
    [path: string]: number
  },
  updated_at: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `events`: `{ site_id: 1, timestamp: -1 }`
- `daily_stats`: `{ site_id: 1, date: 1 }` (unique)

---

## ⚡ Performance Characteristics

### Ingestion API
- **Target**: < 50ms response time
- **Typical**: 10-20ms
- **Strategy**: Queue-based, non-blocking
- **Validation**: Zod schema validation
- **No database writes** in request path

### Background Processor
- **Concurrency**: Configurable (default: 10)
- **Retries**: 5 attempts with exponential backoff
- **Rate Limiting**: 100 jobs/second
- **Job Cleanup**: 
  - Completed: Keep last 1000 for 24 hours
  - Failed: Keep last 5000 for 7 days

### Reporting API
- **Performance**: < 100ms typical
- **Optimization**: Direct query on indexed collection
- **Aggregation**: Pre-computed in background

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/analytics` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password | (empty) |
| `QUEUE_NAME` | BullMQ queue name | `analytics_events` |
| `QUEUE_CONCURRENCY` | Worker concurrency | `10` |
| `NODE_ENV` | Environment | `development` |
| `AWS_REGION` | AWS region (future) | `us-east-1` |
| `USE_SQS` | Use SQS instead of BullMQ | `false` |
| `ENABLE_CLOUDWATCH` | Send logs to CloudWatch | `false` |

---

## 🛠️ Future Enhancements

The codebase includes placeholder functions for:

### AWS SQS Integration
Replace BullMQ with AWS SQS for managed queue service:
```typescript
// lib/queue.ts
export async function sendToSQS(event: AnalyticsEvent): Promise<void> {
  // TODO: Implement SQS integration
}
```

### CloudWatch Logging
Send structured logs to AWS CloudWatch:
```typescript
// lib/queue.ts
export async function logToCloudWatch(message: string, data?: Record<string, any>): Promise<void> {
  // TODO: Implement CloudWatch integration
}
```

To enable in future:
1. Set `USE_SQS=true` in `.env`
2. Configure AWS credentials
3. Implement the TODO functions

---

## 🧪 Testing

### Manual Testing

1. **Test Ingestion**:
```bash
# Send test event
curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -d '{
    "site_id": "test-site",
    "event_type": "pageview",
    "path": "/test",
    "user_id": "test-user-1"
  }'
```

2. **Check Worker Logs**:
```bash
# Worker should show:
# [TIMESTAMP] Processing event for site: test-site
# [TIMESTAMP] Event processed successfully
```

3. **Query Stats**:
```bash
curl "http://localhost:3000/api/stats?site_id=test-site"
```

### Load Testing

Generate multiple events:
```bash
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/event \
    -H "Content-Type: application/json" \
    -d "{
      \"site_id\": \"test-site\",
      \"event_type\": \"pageview\",
      \"path\": \"/page-$i\",
      \"user_id\": \"user-$i\"
    }" &
done
```

---

## 🚨 Error Handling

### Validation Errors
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "site_id",
      "message": "site_id is required"
    }
  ]
}
```

### Server Errors
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Connection timeout"  // Only in development
}
```

### Worker Retries
- Failed jobs automatically retry 5 times
- Exponential backoff: 2s, 4s, 8s, 16s, 32s
- After 5 failures, job moves to failed queue

---

## 📊 Monitoring

### Queue Status
```bash
# Connect to Redis CLI
redis-cli

# Check queue length
LLEN bull:analytics_events:wait

# Check processing
LLEN bull:analytics_events:active

# Check failed
LLEN bull:analytics_events:failed
```

### Database Stats
```javascript
// MongoDB shell
use analytics

// Count events
db.events.countDocuments()

// View recent stats
db.daily_stats.find().sort({ date: -1 }).limit(5)

// Check unique users
db.daily_stats.findOne({ site_id: "my-website" }, { unique_users: 1 })
```

---

## 🐛 Troubleshooting

### Issue: Worker not processing events

**Check**:
1. Redis is running: `redis-cli ping`
2. MongoDB is running: `mongosh`
3. Worker is started: `npm run worker`
4. Check environment variables in `.env`

### Issue: Slow ingestion (> 50ms)

**Causes**:
- Redis connection slow
- Network latency
- Validation overhead

**Solutions**:
- Use local Redis
- Optimize validation rules
- Check network

### Issue: Events not in database

**Check**:
1. Worker logs for errors
2. Failed queue: `redis-cli LLEN bull:analytics_events:failed`
3. MongoDB connection in worker
4. Database permissions

---

## 📦 Production Deployment

### Next.js API
```bash
npm run build
npm start
```

### Worker as Service

**Using PM2**:
```bash
npm install -g pm2

pm2 start npm --name "analytics-worker" -- run worker:prod
pm2 save
pm2 startup
```

**Using systemd** (Linux):
```ini
[Unit]
Description=Analytics Worker
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/website-analytics
ExecStart=/usr/bin/npm run worker:prod
Restart=always

[Install]
WantedBy=multi-user.target
```

### Docker Support

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

# Start both API and worker
CMD ["sh", "-c", "npm start & npm run worker:prod"]
```

---

## 📝 Development Tips

1. **Type Checking**: Run `npm run type-check` before committing
2. **Watch Mode**: Use `npm run worker` for auto-reload during development
3. **Logging**: All operations include timestamps and performance metrics
4. **Database Indexes**: Ensure indexes are created for performance
5. **Queue Monitoring**: Use BullMQ Board for visual queue monitoring

---

## 🤝 Contributing

1. Follow TypeScript strict mode
2. Add error handling to all async operations
3. Include performance logging
4. Update this README for new features

---

## 📄 License

MIT

---

## 🎯 Summary

This analytics platform provides:

✅ **Ultra-fast ingestion** (< 50ms)  
✅ **Scalable queue-based processing**  
✅ **Real-time aggregation**  
✅ **Automatic retries**  
✅ **Production-ready architecture**  
✅ **AWS integration ready**  

Built with modern TypeScript, Next.js 14 App Router, MongoDB, and BullMQ.
