# 🚀 GET STARTED - Website Analytics Platform

**Welcome!** This guide will get you up and running in under 5 minutes.

---

## ⚡ Super Quick Start (3 Commands)

```powershell
# 1. Install dependencies
npm install

# 2. Start MongoDB & Redis with Docker
npm run docker:up

# 3. Start the application (in 2 terminals)
# Terminal 1:
npm run dev

# Terminal 2:
npm run worker
```

**That's it!** Your analytics platform is running at `http://localhost:3000`

---

## 🧪 Test It Immediately

### Send a Test Event

```powershell
# Using PowerShell (Windows)
$body = @{
    site_id = "test-site"
    event_type = "pageview"
    path = "/home"
    user_id = "user-123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/event" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

Or using curl:
```bash
curl -X POST http://localhost:3000/api/event ^
  -H "Content-Type: application/json" ^
  -d "{\"site_id\":\"test-site\",\"event_type\":\"pageview\",\"path\":\"/home\",\"user_id\":\"user-123\"}"
```

### Check Stats

```powershell
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/stats?site_id=test-site"

# Or curl
curl "http://localhost:3000/api/stats?site_id=test-site"
```

### Run Automated Tests

```powershell
npm run test:api
```

### Generate Sample Data (500 events)

```powershell
npm run generate:data
```

---

## 📋 Prerequisites

Before you begin, ensure you have:

✅ **Node.js 18+** installed
   ```powershell
   node --version  # Should be v18 or higher
   ```

✅ **Docker Desktop** installed (for MongoDB & Redis)
   - Download: https://www.docker.com/products/docker-desktop/

**OR** manually install MongoDB & Redis:
   - MongoDB: https://www.mongodb.com/try/download/community
   - Redis: https://redis.io/download or use WSL

---

## 📁 What You Got

Your project structure:
```
website-analytics/
├── 📄 Configuration Files
│   ├── package.json         # Dependencies & scripts
│   ├── tsconfig.json        # TypeScript config
│   ├── next.config.js       # Next.js config
│   └── .env.example         # Environment template
│
├── 📱 API Endpoints
│   └── app/api/
│       ├── event/route.ts   # POST - Event ingestion
│       ├── stats/route.ts   # GET - Statistics
│       └── health/route.ts  # GET - Health check
│
├── 🔧 Core Libraries
│   └── lib/
│       ├── db.ts            # MongoDB setup
│       ├── queue.ts         # Redis & BullMQ
│       ├── validateEvent.ts # Validation schemas
│       └── utils.ts         # Helper functions
│
├── ⚙️ Background Worker
│   └── worker/
│       └── processor.ts     # Event processor
│
├── 🧪 Testing & Utilities
│   └── scripts/
│       ├── test-analytics.ts
│       └── generate-sample-data.ts
│
└── 📚 Documentation
    ├── README.md            # Complete guide
    ├── API.md               # API reference
    ├── QUICKSTART.md        # Quick start
    ├── DEPLOYMENT.md        # Deploy guide
    ├── OVERVIEW.md          # System overview
    └── PROJECT_SUMMARY.md   # Project summary
```

---

## 🔑 Environment Setup

1. **Copy the example environment file:**
```powershell
Copy-Item .env.example .env
```

2. **Edit `.env` if needed** (defaults work for Docker setup):
```env
MONGODB_URI=mongodb://localhost:27017/analytics
REDIS_HOST=localhost
REDIS_PORT=6379
QUEUE_CONCURRENCY=10
```

---

## 🐳 Docker Setup (Recommended)

### Start Services
```powershell
npm run docker:up
```

This starts:
- **MongoDB** on port 27017
- **Redis** on port 6379

### Check Services Are Running
```powershell
# Check Docker containers
docker ps

# Should show:
# - analytics-mongodb
# - analytics-redis
```

### View Logs
```powershell
npm run docker:logs
```

### Stop Services
```powershell
npm run docker:down
```

---

## 🚀 Run the Application

You need **TWO terminal windows**:

### Terminal 1: API Server
```powershell
npm run dev
```

You should see:
```
▲ Next.js 14.x
- Local:        http://localhost:3000
- Ready in 2.5s
```

### Terminal 2: Background Worker
```powershell
npm run worker
```

You should see:
```
[2024-01-15T10:30:00.000Z] Starting Analytics Processor Worker...
[2024-01-15T10:30:00.100Z] Database connected
[2024-01-15T10:30:00.200Z] Worker started with concurrency: 10
[2024-01-15T10:30:00.300Z] Worker is ready to process events
```

---

## ✅ Verify Everything Works

### 1. Check Health
```powershell
curl http://localhost:3000/api/health
```

Should return:
```json
{
  "status": "healthy",
  "services": {
    "mongodb": { "status": "connected" },
    "redis": { "status": "connected" }
  }
}
```

### 2. Send Test Event
```powershell
# PowerShell
$body = @{
    site_id = "my-site"
    event_type = "pageview"
    path = "/test"
    user_id = "test-user"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/event" `
    -Method Post -Body $body -ContentType "application/json"

Write-Host "Success! Processing time: $($response.processing_time_ms)ms"
```

### 3. Check Worker Processed It
Look at Terminal 2 (worker logs):
```
[2024-01-15T10:30:05.000Z] Processing event for site: my-site
[2024-01-15T10:30:05.050Z] Saved event to DB: 65a4f3b2c8e9...
[2024-01-15T10:30:05.080Z] Event processed successfully in 80ms
```

### 4. Query Stats
```powershell
curl "http://localhost:3000/api/stats?site_id=my-site"
```

Should return:
```json
{
  "success": true,
  "data": {
    "site_id": "my-site",
    "date": "2024-01-15",
    "total_views": 1,
    "unique_users_count": 1,
    "top_paths": [
      { "path": "/test", "views": 1 }
    ]
  }
}
```

---

## 🧪 Run the Test Suite

```powershell
npm run test:api
```

This will:
- ✅ Test event ingestion
- ✅ Test validation errors
- ✅ Test stats retrieval
- ✅ Load test (50 events)

Expected output:
```
🧪 Starting Analytics Platform Tests...

✅ PASS | Event Ingestion (15ms)
✅ PASS | Validation Error Handling (8ms)
✅ PASS | Stats Retrieval (23ms)
✅ PASS | Load Performance Test (450ms)

📊 Test Summary
Total Tests: 4
✅ Passed: 4
❌ Failed: 0
🎉 All tests passed!
```

---

## 📊 Generate Sample Data

Want to see the system with real data?

```powershell
npm run generate:data
```

This generates:
- **500 events** across 3 different sites
- **7 days** of historical data
- **Multiple event types** (pageview, click, etc.)
- **Realistic patterns**

After generation:
```powershell
# Check stats for each site
curl "http://localhost:3000/api/stats?site_id=blog-site"
curl "http://localhost:3000/api/stats?site_id=ecommerce-site"
curl "http://localhost:3000/api/stats?site_id=landing-page"
```

---

## 🎯 What to Do Next

### 1. **Explore the API**
Open `http://localhost:3000` in your browser to see the documentation.

Or check out [API.md](API.md) for complete API reference.

### 2. **Integrate with Your App**

**JavaScript/TypeScript:**
```typescript
// Send page view
fetch('http://localhost:3000/api/event', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    site_id: 'my-website',
    event_type: 'pageview',
    path: window.location.pathname,
    user_id: getUserId(), // Your user ID function
  }),
});
```

**React Hook:**
```typescript
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function useAnalytics(userId: string) {
  const pathname = usePathname();
  
  useEffect(() => {
    fetch('http://localhost:3000/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        site_id: 'my-website',
        event_type: 'pageview',
        path: pathname,
        user_id: userId,
      }),
    }).catch(console.error);
  }, [pathname, userId]);
}
```

### 3. **Read the Full Docs**
- [README.md](README.md) - Complete documentation
- [API.md](API.md) - API reference with examples
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deploy to production
- [OVERVIEW.md](OVERVIEW.md) - System architecture

---

## 🐛 Troubleshooting

### Issue: "Cannot connect to MongoDB"

**Solution:**
```powershell
# Check if MongoDB container is running
docker ps | Select-String mongodb

# If not running, start it
npm run docker:up

# Check MongoDB logs
docker logs analytics-mongodb
```

### Issue: "Cannot connect to Redis"

**Solution:**
```powershell
# Check if Redis container is running
docker ps | Select-String redis

# Test Redis connection
docker exec -it analytics-redis redis-cli ping
# Should return: PONG
```

### Issue: "Events not being processed"

**Solution:**
1. Check worker is running in Terminal 2
2. Check worker logs for errors
3. Verify Redis queue:
```powershell
docker exec -it analytics-redis redis-cli
> LLEN bull:analytics_events:wait
```

### Issue: "Module not found"

**Solution:**
```powershell
# Reinstall dependencies
Remove-Item node_modules -Recurse -Force
npm install
```

---

## 📦 All Available Commands

```powershell
# Development
npm run dev              # Start Next.js API server
npm run worker           # Start background worker
npm run docker:up        # Start MongoDB & Redis

# Testing
npm run test:api         # Run API tests
npm run generate:data    # Generate sample data

# Production
npm run build            # Build for production
npm start                # Start production server
npm run worker:prod      # Start production worker

# Docker
npm run docker:down      # Stop Docker services
npm run docker:logs      # View Docker logs

# Utilities
npm run type-check       # TypeScript validation
npm run lint             # Run ESLint
```

---

## 🎓 Learning Path

New to these technologies?

1. **Next.js**: https://nextjs.org/learn
2. **TypeScript**: https://www.typescriptlang.org/docs/handbook/intro.html
3. **MongoDB**: https://www.mongodb.com/docs/manual/tutorial/getting-started/
4. **Redis**: https://redis.io/docs/getting-started/
5. **BullMQ**: https://docs.bullmq.io/

---

## 🔥 Pro Tips

1. **Use two monitors** - One for code, one for terminals
2. **Keep worker logs visible** - See events being processed in real-time
3. **Use the test suite** - Catch issues early
4. **Check health endpoint** - Quick system status check
5. **Monitor queue length** - Ensure workers keep up with load

---

## 📈 Performance Benchmarks

On typical development machine:

| Operation | Target | Typical |
|-----------|--------|---------|
| Event ingestion | < 50ms | 10-20ms |
| Stats query | < 100ms | 20-50ms |
| Worker processing | N/A | 50-100ms |

---

## 🎉 You're Ready!

Your analytics platform is now running and ready to track events!

**Next Steps:**
1. ✅ System is running
2. ✅ Tests passing
3. 🎯 Integrate with your application
4. 📊 Watch the data flow
5. 🚀 Deploy to production (see [DEPLOYMENT.md](DEPLOYMENT.md))

---

## 📞 Need Help?

- **Full Documentation**: [README.md](README.md)
- **API Reference**: [API.md](API.md)
- **System Architecture**: [OVERVIEW.md](OVERVIEW.md)
- **Deployment**: [DEPLOYMENT.md](DEPLOYMENT.md)

---

Happy tracking! 📊✨
