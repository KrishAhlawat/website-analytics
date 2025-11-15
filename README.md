# Website Analytics Platform

A high-performance, production-ready website analytics backend built with Next.js, MongoDB, Redis, and BullMQ. Designed for fast event ingestion (<50ms) with queue-based asynchronous processing and comprehensive reporting capabilities.

## 🚀 Features

- **Fast Event Ingestion**: <50ms response time with queue-based processing
- **API Key Authentication**: Secure site management with unique API keys
- **Rate Limiting**: Redis-based rate limiting (configurable requests per minute)
- **Aggregated Statistics**: Daily stats with path analytics and unique user tracking
- **Batch Processing**: Optimized worker with bulk database operations
- **Automated Cleanup**: Cron jobs for data retention management
- **Docker Support**: Complete containerized deployment with health checks
- **Comprehensive Testing**: Jest + Supertest integration tests
- **Load Testing**: Artillery and k6 scripts included
- **Type Safety**: Full TypeScript implementation with strict types

---

## 🏗️ Architecture

The system is built with 4 main components:

### 1. **Ingestion API** (Next.js API Route)
- **Endpoint**: `POST /api/event`
- **Purpose**: Ultra-fast event capture
- **Performance**: Target response time < 50ms
- **Flow**: Validate API key → Validate event → Queue → Return immediately
- **Authentication**: Requires `x-api-key` header

### 2. **Background Processor** (Node.js Worker)
- **Script**: `worker/processor.ts`
- **Purpose**: Process queued events asynchronously
- **Flow**: 
  1. Pull events from BullMQ queue in batches (default: 50)
  2. Store raw events in `events` collection using bulkWrite
  3. Update aggregated stats in `daily_stats` collection
- **Features**:
  - Batch processing (configurable batch size)
  - Automatic retries (5 attempts with exponential backoff)
  - Concurrent processing

### 3. **Reporting API** (Next.js API Route)
- **Endpoint**: `GET /api/stats?site_id=...&date=YYYY-MM-DD`
- **Purpose**: Retrieve analytics data
- **Returns**: Total views, unique users, top 10 paths
- **Default**: Current date if not specified

### 4. **Cron Worker** (Node.js Scheduled Job)
- **Script**: `worker/cron.ts`
- **Purpose**: Daily maintenance tasks
- **Schedule**: Runs at midnight UTC
- **Tasks**:
  - Delete events older than retention period (default: 7 days)
  - Prepare daily stats placeholders

---

## 📁 Project Structure

```
website-analytics/
├── app/
│   ├── api/
│   │   ├── event/
│   │   │   └── route.ts          # Ingestion API endpoint
│   │   ├── stats/
│   │   │   └── route.ts          # Reporting API endpoint
│   │   ├── site/
│   │   │   └── create/
│   │   │       └── route.ts      # Site management endpoint
│   │   └── health/
│   │       └── route.ts          # Health check endpoint
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── db.ts                     # MongoDB connection & schemas
│   ├── queue.ts                  # Redis & BullMQ setup
│   ├── validateEvent.ts          # Zod validation schemas
│   ├── rateLimiter.ts            # Redis-based rate limiting
│   ├── stats.ts                  # Stats aggregation helpers
│   └── utils.ts                  # Helper functions
├── models/
│   ├── Event.ts                  # Event TypeScript types
│   ├── DailyStats.ts             # DailyStats TypeScript types
│   └── Site.ts                   # Site TypeScript types
├── worker/
│   ├── processor.ts              # Event processing worker
│   └── cron.ts                   # Scheduled maintenance tasks
├── tests/
│   ├── setup.ts                  # Jest test setup
│   ├── event.test.ts             # Event ingestion tests
│   ├── stats.test.ts             # Stats API tests
│   └── site.test.ts              # Site management tests
├── load-tests/
│   ├── artillery.yml             # Artillery load test config
│   └── ingest-load.k6.js         # k6 load test script
├── scripts/
│   ├── generate-sample-data.ts   # Sample data generator
│   └── test-analytics.ts         # Manual API testing script
├── docker-compose.yml            # Docker orchestration
├── Dockerfile.server             # Server container
├── Dockerfile.worker             # Worker container
├── jest.config.ts                # Jest configuration
├── .env.example                  # Environment variables template
└── README.md                     # This file
```

---

## 🛠️ Technology Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **Database**: MongoDB (with Mongoose ODM)
- **Queue**: Redis + BullMQ
- **Validation**: Zod
- **Testing**: Jest + Supertest
- **Load Testing**: Artillery, k6
- **Scheduling**: node-cron
- **Containerization**: Docker + Docker Compose

---

## 📦 Installation

### Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 5.0
- Redis >= 6.0
- Docker & Docker Compose (optional, for containerized deployment)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd website-analytics
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure:
   ```env
   MONGODB_URI=mongodb://localhost:27017/analytics
   REDIS_HOST=localhost
   REDIS_PORT=6379
   RATE_LIMIT_PER_MINUTE=100
   BATCH_SIZE=50
   EVENT_RETENTION_DAYS=7
   ```

4. **Start MongoDB and Redis** (if not using Docker)
   ```bash
   # MongoDB
   mongod --dbpath /path/to/data
   
   # Redis
   redis-server
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **In separate terminals, start the worker and cron**
   ```bash
   # Terminal 2: Worker
   npm run worker
   
   # Terminal 3: Cron (optional)
   npm run cron
   ```

---

## 🐳 Docker Deployment

### Quick Start

1. **Build and start all services**
   ```bash
   npm run docker:up
   ```
   
   This starts:
   - MongoDB (port 27017)
   - Redis (port 6379)
   - Next.js API server (port 3000)
   - Background worker
   - Cron worker

2. **View logs**
   ```bash
   npm run docker:logs
   ```

3. **Stop all services**
   ```bash
   npm run docker:down
   ```

### Manual Docker Commands

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View specific service logs
docker-compose logs -f api
docker-compose logs -f worker

# Restart a service
docker-compose restart api

# Scale workers
docker-compose up -d --scale worker=3
```

---

## 📖 API Documentation

### 1. Create a Site

**Endpoint**: `POST /api/site/create`

**Request**:
```json
{
  "name": "My Awesome Website"
}
```

**Response** (201):
```json
{
  "success": true,
  "site_id": "my-awesome-website-a1b2c3",
  "api_key": "48-character-hex-string"
}
```

### 2. Ingest Event

**Endpoint**: `POST /api/event`

**Headers**:
```
Content-Type: application/json
x-api-key: your-api-key-here
```

**Request**:
```json
{
  "event_type": "pageview",
  "path": "/pricing",
  "user_id": "user-12345",
  "timestamp": "2025-11-15T10:30:00Z" // optional
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Event queued successfully",
  "processing_time_ms": 12
}
```

**Error Responses**:
- `401`: Missing or invalid API key
- `400`: Validation error
- `429`: Rate limit exceeded

### 3. Get Statistics

**Endpoint**: `GET /api/stats`

**Query Parameters**:
- `site_id` (required): Your site ID
- `date` (optional): Date in YYYY-MM-DD format (defaults to today)

**Example**:
```
GET /api/stats?site_id=my-site-abc123&date=2025-11-15
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "site_id": "my-site-abc123",
    "date": "2025-11-15",
    "total_views": 1450,
    "unique_users_count": 212,
    "top_paths": [
      { "path": "/pricing", "views": 700 },
      { "path": "/blog/post-1", "views": 500 },
      { "path": "/", "views": 250 }
    ]
  },
  "processing_time_ms": 8
}
```

### 4. Health Check

**Endpoint**: `GET /api/health`

**Response** (200):
```json
{
  "status": "ok",
  "timestamp": "2025-11-15T10:30:00.000Z"
}
```

---

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Test Suites

- **Site Management Tests**: Create sites, validate API keys
- **Event Ingestion Tests**: API key auth, validation, rate limiting
- **Stats API Tests**: Query aggregated data, date filtering

### Load Testing

#### Using Artillery

```bash
# Set your API key
export API_KEY=your-api-key-here

# Run load test
npm run load:test
```

#### Using k6

```bash
# Install k6 first: https://k6.io/docs/getting-started/installation/

# Set environment variables
export API_KEY=your-api-key-here
export API_BASE=http://localhost:3000

# Run load test
npm run load:test:k6
```

**Expected Performance**:
- p95 response time < 200ms
- p99 response time < 500ms
- Error rate < 5%
- Throughput: 1000+ requests/second

---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | `mongodb://localhost:27017/analytics` | MongoDB connection string |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | - | Redis password (optional) |
| `QUEUE_NAME` | `analytics_events` | BullMQ queue name |
| `BATCH_SIZE` | `50` | Worker batch size |
| `BATCH_TIMEOUT_MS` | `1000` | Worker batch timeout |
| `WORKER_CONCURRENCY` | `5` | Number of concurrent jobs |
| `RATE_LIMIT_PER_MINUTE` | `100` | Max requests per minute per IP |
| `EVENT_RETENTION_DAYS` | `7` | Days to keep raw events |
| `CRON_TIMEZONE` | `UTC` | Timezone for cron jobs |
| `PORT` | `3000` | API server port |
| `NODE_ENV` | `development` | Environment mode |

---

## 📊 Database Schema

### `events` Collection

```typescript
{
  site_id: string;
  event_type: string;
  path: string;
  user_id: string;
  timestamp: Date;
  processed_at: Date;
}
```

**Indexes**:
- `{ site_id: 1, timestamp: -1 }`

### `daily_stats` Collection (dailystats)

```typescript
{
  site_id: string;
  date: string; // "YYYY-MM-DD"
  total_views: number;
  unique_users: string[];
  path_counts: Map<string, number>;
  updated_at: Date;
}
```

**Indexes**:
- `{ site_id: 1, date: 1 }` (unique)

### `sites` Collection

```typescript
{
  site_id: string; // unique
  api_key: string; // unique
  name: string;
  created_at: Date;
}
```

**Indexes**:
- `{ site_id: 1 }` (unique)
- `{ api_key: 1 }` (unique)

---

## 🚀 Performance Optimization

### Ingestion Performance

- Queue-based architecture prevents database bottlenecks
- Rate limiting protects against abuse
- Batch processing reduces database operations
- Indexed queries for fast lookups

### Worker Performance

- Configurable batch size (default: 50 events)
- Bulk write operations for events and stats
- Concurrent job processing (default: 5)
- Exponential backoff for retries

### Query Performance

- Pre-aggregated daily stats eliminate expensive queries
- Limited top paths (10) for consistent response times
- Indexed queries on site_id and date

---

## 🔒 Security

- **API Key Authentication**: All ingestion requests require valid API keys
- **Rate Limiting**: Per-IP rate limiting prevents abuse
- **Input Validation**: Zod schemas validate all inputs
- **MongoDB Indexes**: Prevent slow queries and improve performance
- **Environment Variables**: Sensitive data stored in .env (not committed)

---

## 📈 Monitoring & Observability

### Health Checks

All services include health checks:
- API: `GET /api/health`
- MongoDB: Connection ping
- Redis: PING command
- Worker: Process monitoring

### Logging

- Structured logging with timestamps
- Performance timers for API routes
- Error tracking with stack traces
- Queue job status tracking

### Metrics to Monitor

- API response times (p50, p95, p99)
- Queue length and processing rate
- Database connection pool usage
- Redis memory usage
- Worker processing rate
- Error rates per endpoint

---

## 🐛 Troubleshooting

### Worker Not Processing Events

1. Check Redis connection: `redis-cli ping`
2. View worker logs: `npm run worker` or `docker-compose logs worker`
3. Verify queue name matches in .env

### High API Latency

1. Check MongoDB connection and indexes
2. Verify Redis is running
3. Monitor queue length: May need more workers
4. Review rate limiting settings

### Tests Failing

1. Ensure test MongoDB and Redis are running
2. Check TEST_MONGODB_URI in .env
3. Run `npm install` to update dependencies
4. Clear test database: `mongo analytics_test --eval "db.dropDatabase()"`

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📝 License

MIT License - see LICENSE file for details

---

## 🎯 Roadmap

- [ ] WebSocket support for real-time stats
- [ ] Dashboard UI with charts
- [ ] Multi-tenant support
- [ ] Geolocation tracking
- [ ] Custom event properties
- [ ] Data export capabilities
- [ ] Anomaly detection
- [ ] A/B testing integration

---

## 📧 Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Built with ❤️ using Next.js, MongoDB, and Redis**

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
