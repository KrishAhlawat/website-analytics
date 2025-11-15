# API Reference

Complete API documentation for the Website Analytics Platform.

## Table of Contents

- [Authentication](#authentication)
- [Event Ingestion](#event-ingestion)
- [Stats & Reporting](#stats--reporting)
- [Site Management](#site-management)
- [Health & Monitoring](#health--monitoring)
- [Error Codes](#error-codes)

## Authentication

### API Key Authentication

For event ingestion, use API key authentication:

```http
X-API-Key: your-api-key-here
```

### Session Authentication

For dashboard API endpoints, use NextAuth session authentication (cookie-based).

---

## Event Ingestion

### POST /api/event

Track analytics events from client websites.

**Authentication:** API Key (Header: `X-API-Key`)

**Rate Limit:** 1000 requests/second per IP

#### Request Body

```json
{
  "site_id": "my-site-123",
  "session_id": "uuid-session-id",
  "visitor_id": "uuid-visitor-id",
  "event_type": "pageview",
  "path": "/blog/article",
  "timestamp": "2025-11-15T10:30:00.000Z",
  "referrer": "https://google.com",
  "device_type": "desktop",
  "browser": "Chrome",
  "os": "Windows",
  "screen_resolution": "1920x1080",
  "viewport_size": "1024x768",
  "user_props": {
    "plan": "premium",
    "country": "US"
  },
  "metadata": {
    "page_count": 3,
    "session_duration": 120
  }
}
```

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `site_id` | string | Yes | Unique site identifier |
| `session_id` | string | Yes | Unique session identifier |
| `visitor_id` | string | Yes | Unique visitor identifier |
| `event_type` | string | Yes | Type of event (pageview, click, etc.) |
| `path` | string | Yes | URL path |
| `timestamp` | string | Yes | ISO 8601 timestamp |
| `referrer` | string | No | Referrer URL |
| `device_type` | string | No | desktop, mobile, tablet |
| `browser` | string | No | Browser name |
| `os` | string | No | Operating system |
| `screen_resolution` | string | No | Screen resolution (WxH) |
| `viewport_size` | string | No | Viewport size (WxH) |
| `user_props` | object | No | Custom user properties |
| `metadata` | object | No | Additional event metadata |

#### Response

**Success (200)**

```json
{
  "success": true,
  "queued": true,
  "job_id": "job-12345"
}
```

**Error (400)**

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "site_id",
      "message": "Site ID is required"
    }
  ]
}
```

**Error (401)**

```json
{
  "success": false,
  "error": "Invalid or missing API key"
}
```

**Error (429)**

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "retry_after": 60
}
```

#### Example

```javascript
// Using JavaScript SDK
window.analytics.track('button_click', {
  button_id: 'signup',
  campaign: 'summer_2025'
});

// Using fetch API
fetch('https://your-domain.com/api/event', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key'
  },
  body: JSON.stringify({
    site_id: 'my-site-123',
    session_id: sessionId,
    visitor_id: visitorId,
    event_type: 'pageview',
    path: window.location.pathname,
    timestamp: new Date().toISOString()
  })
});
```

---

## Stats & Reporting

### GET /api/stats

Get aggregated analytics statistics for a date range.

**Authentication:** Session (NextAuth)

**Rate Limit:** 100 requests/second

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `site_id` | string | Yes | Site identifier |
| `start_date` | string | Yes | Start date (YYYY-MM-DD) |
| `end_date` | string | Yes | End date (YYYY-MM-DD) |

#### Response

**Success (200)**

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
  "daily": [
    {
      "date": "2025-11-08",
      "views": 2104,
      "visitors": 445
    },
    {
      "date": "2025-11-09",
      "views": 2287,
      "visitors": 478
    }
  ],
  "devices": [
    {
      "device": "desktop",
      "count": 8542
    },
    {
      "device": "mobile",
      "count": 5821
    },
    {
      "device": "tablet",
      "count": 1057
    }
  ],
  "top_pages": [
    {
      "path": "/",
      "views": 3421
    },
    {
      "path": "/blog",
      "views": 2145
    },
    {
      "path": "/about",
      "views": 1523
    }
  ]
}
```

#### Summary Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `total_views` | number | Total page views |
| `unique_visitors` | number | Unique visitor count |
| `sessions_count` | number | Total sessions |
| `avg_session_duration` | number | Average session duration (seconds) |
| `avg_pages_per_session` | number | Average pages per session |
| `bounce_rate` | number | Bounce rate percentage |
| `change_*` | number | Percentage change vs previous period |

#### Example

```javascript
// Using React Query
const { data } = useQuery({
  queryKey: ['stats', siteId, dateRange],
  queryFn: async () => {
    const params = new URLSearchParams({
      site_id: siteId,
      start_date: '2025-11-08',
      end_date: '2025-11-15'
    });
    const res = await fetch(`/api/stats?${params}`);
    return res.json();
  }
});
```

---

## Site Management

### GET /api/sites

List all sites for the authenticated user.

**Authentication:** Session (NextAuth)

#### Response

**Success (200)**

```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "site_id": "my-blog-abc123",
    "name": "My Blog",
    "api_key": "sk_live_xxxxxxxxxxxx",
    "created_at": "2025-11-01T10:00:00.000Z"
  },
  {
    "_id": "507f1f77bcf86cd799439012",
    "site_id": "company-website-xyz789",
    "name": "Company Website",
    "api_key": "sk_live_yyyyyyyyyyyy",
    "created_at": "2025-11-10T15:30:00.000Z"
  }
]
```

### POST /api/site/create

Create a new site.

**Authentication:** Session (NextAuth)

#### Request Body

```json
{
  "name": "My New Website",
  "site_id": "my-new-site"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Site display name |
| `site_id` | string | No | Custom site ID (auto-generated if not provided) |

#### Response

**Success (201)**

```json
{
  "success": true,
  "site_id": "my-new-site",
  "api_key": "sk_live_xxxxxxxxxxxx"
}
```

**Error (400)**

```json
{
  "error": "Site ID already exists"
}
```

### DELETE /api/sites/[site_id]

Delete a site.

**Authentication:** Session (NextAuth)

#### Response

**Success (200)**

```json
{
  "success": true
}
```

**Error (404)**

```json
{
  "error": "Site not found"
}
```

---

## Health & Monitoring

### GET /api/health

Health check endpoint for load balancers and monitoring systems.

**Authentication:** None

#### Response

**Healthy (200)**

```json
{
  "status": "healthy",
  "timestamp": "2025-11-15T10:30:00.000Z",
  "uptime": 86400,
  "mongodb": {
    "status": "connected",
    "latency_ms": 5
  },
  "redis": {
    "status": "connected",
    "latency_ms": 2
  },
  "queue": {
    "pending": 42,
    "active": 10
  }
}
```

**Degraded (503)**

```json
{
  "status": "degraded",
  "timestamp": "2025-11-15T10:30:00.000Z",
  "mongodb": {
    "status": "unhealthy",
    "error": "Connection timeout"
  },
  "redis": {
    "status": "connected",
    "latency_ms": 2
  }
}
```

---

## Error Codes

### HTTP Status Codes

| Code | Name | Description |
|------|------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Access denied |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "details": [/* optional detailed errors */],
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_API_KEY` | API key is missing or invalid |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `VALIDATION_ERROR` | Request validation failed |
| `SITE_NOT_FOUND` | Site does not exist |
| `UNAUTHORIZED` | Authentication required |
| `DB_ERROR` | Database operation failed |
| `QUEUE_ERROR` | Queue operation failed |

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/event` | 1000 req/s | Per IP |
| `/api/stats` | 100 req/s | Per user |
| `/api/site/create` | 10 req/min | Per user |
| `/api/sites` | 100 req/min | Per user |

When rate limit is exceeded, you'll receive a `429` response with a `Retry-After` header.

---

## SDK Integration

### JavaScript SDK

```html
<script>
  window.ANALYTICS_API_URL = 'https://your-domain.com/api/event';
  window.ANALYTICS_SITE_ID = 'your-site-id';
  window.ANALYTICS_API_KEY = 'your-api-key';
  window.ANALYTICS_AUTO_TRACK = true;
</script>
<script src="https://your-domain.com/analytics.js"></script>
```

### SDK API

```javascript
// Track page view
window.analytics.trackPageView();

// Track custom event
window.analytics.track('button_click', {
  button_id: 'signup',
  page: 'homepage'
});

// Identify user
window.analytics.identify('user-123', {
  email: 'user@example.com',
  plan: 'premium'
});

// Track outbound link
window.analytics.trackOutbound('https://external-site.com');

// Manual flush
window.analytics.flush();
```

---

## Webhooks (Future)

Webhook support for real-time event notifications will be added in a future release.

---

## Support

For API support and questions:
- GitHub Issues: https://github.com/your-repo/issues
- Email: support@your-domain.com
- Documentation: https://docs.your-domain.com
