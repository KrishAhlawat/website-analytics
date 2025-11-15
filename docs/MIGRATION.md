# Migration Guide: Phase 1/2 → Phase 3

This guide helps you migrate from Phase 1 (backend only) or Phase 2 (dashboard added) to Phase 3 (production-ready with advanced features).

---

## Overview of Changes

### Phase 3 Enhancements

1. **Enhanced SDK**: Offline support, batching, retry logic, session management
2. **Session Tracking**: New session metrics (duration, bounce rate, pages per session)
3. **Database Schema**: Extended Event and DailyStats models
4. **Production Infrastructure**: Docker, Nginx, SSL, rate limiting
5. **Advanced Stats API**: Period comparisons, device breakdowns

---

## Breaking Changes

### ⚠️ Database Schema Changes

**Event Model** - New required fields:
- `session_id` (string, required)
- `visitor_id` (string, required)

**Action Required:**
- Existing events without these fields will fail validation
- You must update your SDK or API calls to include these fields

### ⚠️ SDK Configuration

**Old Configuration (Phase 1/2):**
```javascript
window.ANALYTICS_SITE_ID = 'my-site';
window.ANALYTICS_API_KEY = 'sk_xxx';
```

**New Configuration (Phase 3):**
```javascript
window.ANALYTICS_API_URL = 'https://your-domain.com/api/event';
window.ANALYTICS_SITE_ID = 'my-site';
window.ANALYTICS_API_KEY = 'sk_xxx';
window.ANALYTICS_AUTO_TRACK = true;
```

**Action Required:**
- Add `ANALYTICS_API_URL` (was hardcoded in SDK before)
- Add `ANALYTICS_AUTO_TRACK` if you want automatic page view tracking

---

## Migration Steps

### Step 1: Backup Database

```bash
# Backup MongoDB
mongodump --uri="mongodb://localhost:27017/analytics" --out=backup-$(date +%Y%m%d)

# Or with Docker
docker-compose exec mongodb mongodump --out=/backup
```

### Step 2: Update Dependencies

```bash
# Pull latest code
git pull origin main

# Install new dependencies
npm install
```

### Step 3: Database Migration

Create and run migration script:

```javascript
// scripts/migrate-phase3.ts
import mongoose from 'mongoose';
import { Event, DailyStats } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI!);
  
  console.log('Starting Phase 3 migration...');
  
  // 1. Add visitor_id and session_id to existing events
  const events = await Event.find({ 
    $or: [
      { visitor_id: { $exists: false } },
      { session_id: { $exists: false } }
    ]
  });
  
  console.log(`Found ${events.length} events to migrate`);
  
  for (const event of events) {
    if (!event.visitor_id) {
      event.visitor_id = event.user_id || `visitor-${uuidv4()}`;
    }
    if (!event.session_id) {
      event.session_id = `session-${uuidv4()}`;
    }
    await event.save();
  }
  
  console.log('Events migrated');
  
  // 2. Add new fields to DailyStats with default values
  const stats = await DailyStats.find({
    $or: [
      { sessions_count: { $exists: false } },
      { avg_session_duration: { $exists: false } }
    ]
  });
  
  console.log(`Found ${stats.length} daily stats to migrate`);
  
  for (const stat of stats) {
    if (!stat.sessions_count) stat.sessions_count = 0;
    if (!stat.avg_session_duration) stat.avg_session_duration = 0;
    if (!stat.avg_pages_per_session) stat.avg_pages_per_session = 0;
    if (!stat.bounce_rate) stat.bounce_rate = 0;
    if (!stat.device_counts) stat.device_counts = new Map();
    if (!stat.browser_counts) stat.browser_counts = new Map();
    if (!stat.referrer_counts) stat.referrer_counts = new Map();
    await stat.save();
  }
  
  console.log('Daily stats migrated');
  
  // 3. Create indexes
  await Event.collection.createIndex({ site_id: 1, session_id: 1 });
  await Event.collection.createIndex({ site_id: 1, visitor_id: 1 });
  await Event.collection.createIndex({ processed_at: 1 });
  
  console.log('Indexes created');
  
  console.log('Migration complete!');
  process.exit(0);
}

migrate().catch(console.error);
```

Run migration:

```bash
npx tsx scripts/migrate-phase3.ts
```

### Step 4: Update SDK Embeddings

**Replace old SDK:**

```html
<!-- OLD (Phase 1/2) -->
<script>
  window.ANALYTICS_SITE_ID = 'my-site';
  window.ANALYTICS_API_KEY = 'sk_xxx';
</script>
<script src="/old-analytics.js"></script>
```

**With new SDK:**

```html
<!-- NEW (Phase 3) -->
<script>
  window.ANALYTICS_API_URL = 'https://your-domain.com/api/event';
  window.ANALYTICS_SITE_ID = 'my-site';
  window.ANALYTICS_API_KEY = 'sk_xxx';
  window.ANALYTICS_AUTO_TRACK = true;
  window.ANALYTICS_BATCH_SIZE = 10;
  window.ANALYTICS_FLUSH_INTERVAL = 5000;
</script>
<script src="https://your-domain.com/analytics.js"></script>
```

### Step 5: Update Production Deployment

If you were running Phase 1/2 in production:

**Option A: In-place upgrade**

```bash
# 1. Stop services
docker-compose down

# 2. Backup data
docker-compose exec mongodb mongodump --out=/backup

# 3. Pull new code
git pull origin main

# 4. Update environment
cp .env.production .env
nano .env  # Update with your settings

# 5. Set up Nginx and SSL
mkdir -p nginx/ssl
sudo certbot certonly --standalone -d your-domain.com
sudo cp /etc/letsencrypt/live/your-domain.com/*.pem nginx/ssl/

# 6. Start with new stack
docker-compose -f docker-compose.prod.yml up -d

# 7. Run migration
docker-compose -f docker-compose.prod.yml exec app npx tsx scripts/migrate-phase3.ts
```

**Option B: Blue-green deployment**

1. Deploy Phase 3 to new servers
2. Run database migration on copy
3. Update DNS to point to new servers
4. Keep old deployment running for rollback

### Step 6: Verify Migration

```bash
# Check health
curl https://your-domain.com/api/health

# Check stats API
curl "https://your-domain.com/api/stats?site_id=my-site&start_date=2025-11-01&end_date=2025-11-15" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Check logs
docker-compose -f docker-compose.prod.yml logs -f app
docker-compose -f docker-compose.prod.yml logs -f worker
```

---

## API Changes

### Stats API Response

**Old Response (Phase 1/2):**
```json
{
  "summary": {
    "total_views": 15420,
    "unique_visitors": 3245
  },
  "daily": [...],
  "top_pages": [...]
}
```

**New Response (Phase 3):**
```json
{
  "summary": {
    "total_views": 15420,
    "unique_visitors": 3245,
    "sessions_count": 4521,
    "avg_session_duration": 185,
    "avg_pages_per_session": 3.4,
    "bounce_rate": 42.3,
    "change_views": 12.5,
    "change_visitors": 8.3,
    "change_duration": -2.1,
    "change_bounce": -5.4
  },
  "daily": [...],
  "devices": [...],
  "top_pages": [...]
}
```

**New Fields:**
- `sessions_count`: Total sessions in date range
- `avg_session_duration`: Average session duration (seconds)
- `avg_pages_per_session`: Average pages viewed per session
- `bounce_rate`: Percentage of single-page sessions
- `change_*`: Percentage change vs previous period
- `devices`: Device type breakdown

---

## Environment Variables

### New Required Variables

```env
# Production deployment
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/analytics
REDIS_URL=redis://:password@redis-host:6379

# Worker configuration
QUEUE_CONCURRENCY=20
BATCH_SIZE=100
BATCH_TIMEOUT=2000

# Monitoring (optional)
ENABLE_METRICS=true
METRICS_PORT=9090
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io
OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=YOUR_API_KEY

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Caching (future)
CACHE_TTL=300
HOT_STATS_CACHE_TTL=60

# Security
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

### Deprecated Variables

These are no longer needed:

```env
# Removed: Now configured per-site in database
API_KEY=xxx

# Removed: Now auto-configured
RATE_LIMIT=1000
```

---

## Dashboard Updates

### New Features Available

1. **Period Comparisons**: Compare current period to previous
2. **Session Metrics**: Duration, bounce rate, pages per session
3. **Device Breakdown**: See desktop, mobile, tablet distribution
4. **Real-time Updates**: Auto-refresh every 30 seconds

### UI Changes

- Stats cards now show percentage changes (green/red arrows)
- New session metrics section
- Device breakdown chart
- Improved loading states with React Query

---

## SDK Upgrade

### New SDK Features

1. **Offline Queue**: Events saved to localStorage
2. **Batch Processing**: Reduces network requests by 90%
3. **Automatic Retry**: Failed requests retry up to 3 times
4. **Session Management**: Automatic session tracking
5. **Configurable**: All options can be customized

### Migration Example

**Old SDK Usage (Phase 1/2):**
```javascript
// Events sent immediately
fetch('/api/event', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY
  },
  body: JSON.stringify({
    site_id: 'my-site',
    event_type: 'pageview',
    path: window.location.pathname
  })
});
```

**New SDK Usage (Phase 3):**
```javascript
// Events batched and retried automatically
window.analytics.track('pageview');

// Or with metadata
window.analytics.track('button_click', {
  button_id: 'signup',
  campaign: 'summer_2025'
});
```

---

## Rollback Plan

If you need to rollback to Phase 1/2:

### Step 1: Restore Database

```bash
# Restore from backup
mongorestore --uri="mongodb://localhost:27017/analytics" backup-20251115/
```

### Step 2: Revert Code

```bash
# Checkout previous version
git checkout phase-2

# Reinstall dependencies
npm install

# Restart services
docker-compose down
docker-compose up -d
```

### Step 3: Update SDK

Replace Phase 3 SDK with Phase 1/2 version on your websites.

---

## Testing After Migration

### 1. Test Event Ingestion

```bash
curl -X POST https://your-domain.com/api/event \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "site_id": "my-site",
    "session_id": "test-session-123",
    "visitor_id": "test-visitor-123",
    "event_type": "pageview",
    "path": "/test",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
  }'
```

### 2. Test Stats API

```bash
curl "https://your-domain.com/api/stats?site_id=my-site&start_date=2025-11-01&end_date=2025-11-15" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION"
```

### 3. Test Dashboard

1. Visit https://your-domain.com
2. Sign in with Google
3. Verify stats display correctly
4. Check period comparisons work
5. Verify device breakdown shows

### 4. Test SDK

```html
<!-- Embed on test page -->
<script>
  window.ANALYTICS_API_URL = 'https://your-domain.com/api/event';
  window.ANALYTICS_SITE_ID = 'my-site';
  window.ANALYTICS_API_KEY = 'your-api-key';
  window.ANALYTICS_DEBUG = true;
</script>
<script src="https://your-domain.com/analytics.js"></script>

<script>
  // Test tracking
  window.analytics.track('test_event', { test: true });
  
  // Verify in console
  console.log('Queue:', localStorage.getItem('analytics_queue'));
  console.log('Visitor ID:', localStorage.getItem('analytics_visitor_id'));
  console.log('Session ID:', sessionStorage.getItem('analytics_session_id'));
</script>
```

---

## Common Issues

### Issue: "session_id is required"

**Cause**: Using old SDK with new API

**Fix**: Update SDK to Phase 3 version

### Issue: Session metrics show as 0

**Cause**: Worker not calculating metrics yet

**Fix**: Wait 30 seconds for first calculation, or restart worker

### Issue: Period comparison not working

**Cause**: Not enough historical data

**Fix**: Ensure you have data for both current and previous period

### Issue: Device breakdown empty

**Cause**: Events missing device_type field

**Fix**: Update SDK to send device detection data

---

## Performance After Migration

Expected improvements:

- **90% reduction** in network requests (batching)
- **98% reduction** in database writes (batch processing)
- **Sub-50ms** event ingestion latency
- **Real session metrics** (not estimated)
- **Production-grade** infrastructure with SSL, rate limiting

---

## Support

Need help migrating?

- **Documentation**: [docs/](../docs/)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Email**: support@yourdomain.com

---

## Checklist

- [ ] Database backup created
- [ ] Dependencies updated
- [ ] Database migration script executed
- [ ] Indexes created
- [ ] SDK updated on all websites
- [ ] Production environment configured
- [ ] SSL certificates installed
- [ ] Services deployed
- [ ] Health checks passing
- [ ] Event ingestion tested
- [ ] Stats API tested
- [ ] Dashboard verified
- [ ] SDK tracking tested
- [ ] Monitoring configured

---

**Migration complete! Welcome to Phase 3. 🚀**
