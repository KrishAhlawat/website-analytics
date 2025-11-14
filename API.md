# API Documentation - Website Analytics Platform

Complete API reference for the analytics platform endpoints.

---

## Table of Contents
1. [Authentication](#authentication)
2. [Event Ingestion API](#event-ingestion-api)
3. [Reporting API](#reporting-api)
4. [Health Check API](#health-check-api)
5. [Error Codes](#error-codes)
6. [Rate Limiting](#rate-limiting)
7. [SDKs & Examples](#sdks--examples)

---

## Base URL

```
Development:  http://localhost:3000
Production:   https://your-domain.com
```

---

## Authentication

> **Note**: Currently no authentication is required. In production, implement API key authentication.

**Future Implementation:**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" https://api.example.com/api/event
```

---

## Event Ingestion API

### POST /api/event

Ingest analytics events into the system. Events are queued for asynchronous processing.

**Performance:** < 50ms typical response time

#### Request

**Headers:**
```
Content-Type: application/json
```

**Body Parameters:**

| Field | Type | Required | Description | Max Length |
|-------|------|----------|-------------|------------|
| `site_id` | string | Yes | Unique identifier for your website/app | 100 |
| `event_type` | string | Yes | Type of event (pageview, click, etc.) | 50 |
| `path` | string | Yes | URL path or screen name | 500 |
| `user_id` | string | Yes | Unique user/session identifier | 100 |
| `timestamp` | string | No | ISO 8601 timestamp (defaults to now) | - |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -d '{
    "site_id": "my-website",
    "event_type": "pageview",
    "path": "/products/laptop",
    "user_id": "user-abc-123",
    "timestamp": "2024-01-15T10:30:00Z"
  }'
```

**JavaScript/TypeScript:**

```typescript
const response = await fetch('http://localhost:3000/api/event', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    site_id: 'my-website',
    event_type: 'pageview',
    path: '/products/laptop',
    user_id: 'user-abc-123',
  }),
});

const data = await response.json();
console.log(data);
```

**Python:**

```python
import requests

response = requests.post('http://localhost:3000/api/event', json={
    'site_id': 'my-website',
    'event_type': 'pageview',
    'path': '/products/laptop',
    'user_id': 'user-abc-123'
})

print(response.json())
```

#### Response

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Event queued successfully",
  "processing_time_ms": 12
}
```

**Validation Error (400 Bad Request):**

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "site_id",
      "message": "site_id is required"
    },
    {
      "field": "path",
      "message": "path is required"
    }
  ]
}
```

**Server Error (500 Internal Server Error):**

```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Redis connection failed"
}
```

#### Event Types

Common event types (you can use any string):

| Type | Description | Example Path |
|------|-------------|--------------|
| `pageview` | Page view | `/home`, `/products/123` |
| `click` | Button/link click | `/cta/signup`, `/button/buy` |
| `scroll` | Scroll depth | `/article/50%`, `/article/100%` |
| `form_submit` | Form submission | `/forms/contact`, `/forms/signup` |
| `video_play` | Video started | `/videos/intro` |
| `search` | Search performed | `/search/query` |
| `purchase` | Purchase completed | `/checkout/success` |
| `error` | Error occurred | `/errors/404` |

---

## Reporting API

### GET /api/stats

Retrieve aggregated analytics statistics for a specific site.

**Performance:** < 100ms typical response time

#### Request

**Query Parameters:**

| Parameter | Type | Required | Description | Format |
|-----------|------|----------|-------------|--------|
| `site_id` | string | Yes | Site identifier | - |
| `date` | string | No | Specific date (defaults to today) | YYYY-MM-DD |

**Example Requests:**

```bash
# Get today's stats
curl "http://localhost:3000/api/stats?site_id=my-website"

# Get specific date
curl "http://localhost:3000/api/stats?site_id=my-website&date=2024-01-15"
```

**JavaScript/TypeScript:**

```typescript
// Today's stats
const response = await fetch(
  'http://localhost:3000/api/stats?site_id=my-website'
);
const data = await response.json();

// Specific date
const response = await fetch(
  'http://localhost:3000/api/stats?site_id=my-website&date=2024-01-15'
);
const data = await response.json();
```

**Python:**

```python
import requests

# Today's stats
response = requests.get(
    'http://localhost:3000/api/stats',
    params={'site_id': 'my-website'}
)

# Specific date
response = requests.get(
    'http://localhost:3000/api/stats',
    params={'site_id': 'my-website', 'date': '2024-01-15'}
)

print(response.json())
```

#### Response

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "site_id": "my-website",
    "date": "2024-01-15",
    "total_views": 15234,
    "unique_users_count": 3421,
    "top_paths": [
      {
        "path": "/home",
        "views": 4567
      },
      {
        "path": "/products",
        "views": 2891
      },
      {
        "path": "/about",
        "views": 1876
      },
      {
        "path": "/contact",
        "views": 1234
      },
      {
        "path": "/blog",
        "views": 987
      }
    ]
  },
  "processing_time_ms": 23,
  "note": "Showing stats for current date (last 24 hours)"
}
```

**No Data Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "site_id": "my-website",
    "date": "2024-01-15",
    "total_views": 0,
    "unique_users_count": 0,
    "top_paths": []
  },
  "message": "No data found for this date"
}
```

**Validation Error (400 Bad Request):**

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

**Server Error (500 Internal Server Error):**

```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Database connection failed"
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `site_id` | string | Site identifier |
| `date` | string | Date in YYYY-MM-DD format |
| `total_views` | number | Total number of events/views |
| `unique_users_count` | number | Count of unique user IDs |
| `top_paths` | array | Top 10 paths by view count |
| `top_paths[].path` | string | URL path |
| `top_paths[].views` | number | View count for this path |

---

## Health Check API

### GET /api/health

Check the health status of the application and its dependencies.

**Use Case:** Load balancer health checks, monitoring, status pages

#### Request

```bash
curl http://localhost:3000/api/health
```

#### Response

**Healthy (200 OK):**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 86400.5,
  "services": {
    "mongodb": {
      "status": "connected",
      "latency_ms": 12
    },
    "redis": {
      "status": "connected",
      "latency_ms": 3
    }
  },
  "version": "1.0.0"
}
```

**Unhealthy (503 Service Unavailable):**

```json
{
  "status": "unhealthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 86400.5,
  "services": {
    "mongodb": {
      "status": "error",
      "error": "Connection timeout"
    },
    "redis": {
      "status": "connected",
      "latency_ms": 3
    }
  },
  "version": "1.0.0"
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | "healthy", "unhealthy", or "error" |
| `timestamp` | string | ISO 8601 timestamp |
| `uptime` | number | Server uptime in seconds |
| `services` | object | Status of each service |
| `version` | string | API version |

---

## Error Codes

| HTTP Code | Meaning | Common Causes |
|-----------|---------|---------------|
| **200** | Success | Request completed successfully |
| **400** | Bad Request | Invalid input, validation failed |
| **401** | Unauthorized | Invalid or missing API key (future) |
| **429** | Too Many Requests | Rate limit exceeded (future) |
| **500** | Internal Server Error | Database error, Redis connection failed |
| **503** | Service Unavailable | Service is down or unhealthy |

---

## Rate Limiting

> **Note**: Rate limiting is not currently implemented. Add in production.

**Planned Implementation:**

```
Rate Limit: 1000 requests per minute per IP
Headers:
  X-RateLimit-Limit: 1000
  X-RateLimit-Remaining: 999
  X-RateLimit-Reset: 1642252800
```

**Rate Limit Error (429):**
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "retry_after": 60
}
```

---

## SDKs & Examples

### JavaScript SDK

Create a simple client wrapper:

```typescript
// analytics-client.ts
export class AnalyticsClient {
  constructor(
    private baseUrl: string,
    private siteId: string
  ) {}

  async trackEvent(
    eventType: string,
    path: string,
    userId: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id: this.siteId,
          event_type: eventType,
          path,
          user_id: userId,
        }),
      });
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Analytics error:', error);
      return false;
    }
  }

  async getStats(date?: string): Promise<any> {
    const url = new URL(`${this.baseUrl}/api/stats`);
    url.searchParams.set('site_id', this.siteId);
    if (date) url.searchParams.set('date', date);

    const response = await fetch(url.toString());
    return response.json();
  }
}

// Usage
const analytics = new AnalyticsClient(
  'http://localhost:3000',
  'my-website'
);

// Track page view
await analytics.trackEvent('pageview', '/home', 'user-123');

// Get stats
const stats = await analytics.getStats();
console.log(stats);
```

### React Hook

```typescript
// useAnalytics.ts
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function useAnalytics(userId: string) {
  const pathname = usePathname();

  useEffect(() => {
    // Track page view on route change
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

// Usage in component
function MyApp() {
  const userId = getUserId(); // Your user ID logic
  useAnalytics(userId);
  
  return <div>Your app</div>;
}
```

### Python SDK

```python
# analytics_client.py
import requests
from typing import Optional, Dict, Any
from datetime import datetime

class AnalyticsClient:
    def __init__(self, base_url: str, site_id: str):
        self.base_url = base_url
        self.site_id = site_id
    
    def track_event(
        self,
        event_type: str,
        path: str,
        user_id: str,
        timestamp: Optional[str] = None
    ) -> bool:
        """Track an analytics event"""
        try:
            response = requests.post(
                f'{self.base_url}/api/event',
                json={
                    'site_id': self.site_id,
                    'event_type': event_type,
                    'path': path,
                    'user_id': user_id,
                    'timestamp': timestamp or datetime.utcnow().isoformat()
                }
            )
            return response.json().get('success', False)
        except Exception as e:
            print(f'Analytics error: {e}')
            return False
    
    def get_stats(self, date: Optional[str] = None) -> Dict[str, Any]:
        """Get analytics statistics"""
        params = {'site_id': self.site_id}
        if date:
            params['date'] = date
        
        response = requests.get(
            f'{self.base_url}/api/stats',
            params=params
        )
        return response.json()

# Usage
analytics = AnalyticsClient('http://localhost:3000', 'my-website')

# Track event
analytics.track_event('pageview', '/home', 'user-123')

# Get stats
stats = analytics.get_stats(date='2024-01-15')
print(stats)
```

### cURL Examples

**Track Page View:**
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

**Track Custom Event:**
```bash
curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -d '{
    "site_id": "my-website",
    "event_type": "purchase",
    "path": "/checkout/success",
    "user_id": "user-123"
  }'
```

**Get Today's Stats:**
```bash
curl "http://localhost:3000/api/stats?site_id=my-website"
```

**Get Specific Date:**
```bash
curl "http://localhost:3000/api/stats?site_id=my-website&date=2024-01-15"
```

**Check Health:**
```bash
curl http://localhost:3000/api/health
```

---

## Best Practices

### 1. User ID Management

Generate consistent user IDs:
```typescript
// Browser
const userId = localStorage.getItem('analytics_user_id') || 
  crypto.randomUUID();
localStorage.setItem('analytics_user_id', userId);

// Server
const userId = req.cookies.analytics_user_id || 
  generateUUID();
res.cookie('analytics_user_id', userId, { maxAge: 365 * 24 * 60 * 60 * 1000 });
```

### 2. Error Handling

Always handle failures gracefully:
```typescript
try {
  await trackEvent(...);
} catch (error) {
  // Don't let analytics break your app
  console.error('Analytics failed:', error);
}
```

### 3. Batch Events

For high-volume apps, consider batching:
```typescript
const eventQueue: Event[] = [];

function queueEvent(event: Event) {
  eventQueue.push(event);
  
  if (eventQueue.length >= 10) {
    flushEvents();
  }
}

async function flushEvents() {
  const events = [...eventQueue];
  eventQueue.length = 0;
  
  await Promise.all(
    events.map(event => trackEvent(event))
  );
}

// Flush on page unload
window.addEventListener('beforeunload', flushEvents);
```

### 4. Privacy Considerations

- Use anonymous user IDs
- Don't send PII in paths or event types
- Respect Do Not Track headers
- Provide opt-out mechanism
- Follow GDPR/CCPA requirements

---

## Postman Collection

Import this collection for easy testing:

```json
{
  "info": {
    "name": "Analytics API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Track Event",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"site_id\": \"my-website\",\n  \"event_type\": \"pageview\",\n  \"path\": \"/home\",\n  \"user_id\": \"user-123\"\n}"
        },
        "url": {
          "raw": "http://localhost:3000/api/event",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "event"]
        }
      }
    },
    {
      "name": "Get Stats",
      "request": {
        "method": "GET",
        "url": {
          "raw": "http://localhost:3000/api/stats?site_id=my-website",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "stats"],
          "query": [
            {
              "key": "site_id",
              "value": "my-website"
            }
          ]
        }
      }
    },
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": {
          "raw": "http://localhost:3000/api/health",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "health"]
        }
      }
    }
  ]
}
```

---

For more information, see:
- [README.md](README.md) - Complete documentation
- [QUICKSTART.md](QUICKSTART.md) - Quick start guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
