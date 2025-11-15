# JavaScript SDK Documentation

Complete guide for integrating the Website Analytics JavaScript SDK.

## Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Advanced Usage](#advanced-usage)
- [Framework Integration](#framework-integration)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Embed SDK

Add this snippet to your website's `<head>` tag:

```html
<script>
  window.ANALYTICS_API_URL = 'https://your-analytics-domain.com/api/event';
  window.ANALYTICS_SITE_ID = 'your-site-id';
  window.ANALYTICS_API_KEY = 'your-api-key';
  window.ANALYTICS_AUTO_TRACK = true;
</script>
<script src="https://your-analytics-domain.com/analytics.js"></script>
```

### 2. Verify Installation

Open browser console and check:

```javascript
console.log(window.analytics); // Should show SDK object
window.analytics.track('test_event'); // Should send event
```

---

## Installation

### CDN (Recommended)

```html
<script src="https://your-domain.com/analytics.js"></script>
```

### Self-Hosted

1. Download `analytics.js` from your dashboard
2. Host on your CDN or web server
3. Update script src:

```html
<script src="/path/to/analytics.js"></script>
```

### NPM Package (Coming Soon)

```bash
npm install @your-org/analytics-sdk
```

---

## Configuration

### Basic Configuration

```html
<script>
  // Required
  window.ANALYTICS_API_URL = 'https://analytics.example.com/api/event';
  window.ANALYTICS_SITE_ID = 'my-website';
  window.ANALYTICS_API_KEY = 'sk_live_xxxxxxxxxxxxx';
  
  // Optional
  window.ANALYTICS_AUTO_TRACK = true;           // Auto-track page views
  window.ANALYTICS_BATCH_SIZE = 10;             // Events per batch
  window.ANALYTICS_FLUSH_INTERVAL = 5000;       // Flush interval (ms)
  window.ANALYTICS_MAX_RETRIES = 3;             // Retry attempts
  window.ANALYTICS_SESSION_TIMEOUT = 1800000;   // Session timeout (ms)
  window.ANALYTICS_DEBUG = false;               // Debug logging
</script>
<script src="https://your-domain.com/analytics.js"></script>
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ANALYTICS_API_URL` | string | **Required** | Event ingestion endpoint |
| `ANALYTICS_SITE_ID` | string | **Required** | Your site identifier |
| `ANALYTICS_API_KEY` | string | **Required** | API key from dashboard |
| `ANALYTICS_AUTO_TRACK` | boolean | `true` | Auto-track page views |
| `ANALYTICS_BATCH_SIZE` | number | `10` | Events per batch |
| `ANALYTICS_FLUSH_INTERVAL` | number | `5000` | Flush interval (milliseconds) |
| `ANALYTICS_MAX_RETRIES` | number | `3` | Max retry attempts |
| `ANALYTICS_SESSION_TIMEOUT` | number | `1800000` | Session timeout (30 minutes) |
| `ANALYTICS_DEBUG` | boolean | `false` | Enable debug logging |

---

## API Reference

### `track(eventName, metadata, userProps)`

Track custom events.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `eventName` | string | Yes | Event name (e.g., 'button_click') |
| `metadata` | object | No | Event-specific metadata |
| `userProps` | object | No | User properties |

#### Example

```javascript
// Simple event
window.analytics.track('signup_completed');

// With metadata
window.analytics.track('button_click', {
  button_id: 'cta-signup',
  page: 'homepage',
  position: 'hero'
});

// With user properties
window.analytics.track('purchase', {
  product_id: 'PRD-123',
  amount: 49.99,
  currency: 'USD'
}, {
  plan: 'premium',
  country: 'US'
});
```

### `trackPageView()`

Manually track a page view.

#### Example

```javascript
// Track current page
window.analytics.trackPageView();

// Useful for SPAs on route change
router.afterEach(() => {
  window.analytics.trackPageView();
});
```

### `trackOutbound(url)`

Track outbound link clicks.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | External URL |

#### Example

```javascript
// Manual tracking
document.querySelector('a[href^="https://external.com"]')
  .addEventListener('click', (e) => {
    window.analytics.trackOutbound(e.target.href);
  });
```

### `identify(userId, properties)`

Associate events with a user.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | Unique user identifier |
| `properties` | object | No | User properties |

#### Example

```javascript
// After user login
window.analytics.identify('user-12345', {
  email: 'user@example.com',
  name: 'John Doe',
  plan: 'premium',
  signup_date: '2025-01-15'
});

// Clear on logout
window.analytics.identify(null);
```

### `flush()`

Manually flush event queue.

#### Example

```javascript
// Force send all queued events
window.analytics.flush();

// Useful before navigation
window.addEventListener('beforeunload', () => {
  window.analytics.flush();
});
```

---

## Advanced Usage

### Offline Support

The SDK automatically queues events when offline and sends them when back online.

```javascript
// Events are queued in localStorage if offline
window.analytics.track('offline_event');

// Auto-flush when connection restored
window.addEventListener('online', () => {
  console.log('Connection restored, flushing queue...');
});
```

### Session Tracking

Sessions are automatically managed with a 30-minute timeout (configurable).

```javascript
// Session extends on any activity
window.analytics.track('user_action'); // Extends session

// Force new session
localStorage.removeItem('analytics_session_id');
window.analytics.trackPageView(); // Creates new session
```

### Visitor Tracking

Visitors are tracked with a persistent ID across sessions.

```javascript
// Get current visitor ID
const visitorId = localStorage.getItem('analytics_visitor_id');
console.log('Visitor ID:', visitorId);

// Clear visitor (for testing)
localStorage.removeItem('analytics_visitor_id');
```

### Error Handling

The SDK silently fails to avoid breaking your website.

```javascript
// Enable debug mode to see errors
window.ANALYTICS_DEBUG = true;

// Errors logged to console, but won't throw
window.analytics.track('invalid_event', 'this should be an object');
```

### Custom Event Metadata

```javascript
// E-commerce tracking
window.analytics.track('product_viewed', {
  product_id: 'SKU-123',
  product_name: 'Awesome Widget',
  category: 'Widgets',
  price: 29.99,
  currency: 'USD',
  stock: 'in_stock'
});

// Form tracking
window.analytics.track('form_submitted', {
  form_id: 'contact-form',
  form_name: 'Contact Us',
  fields: ['name', 'email', 'message'],
  success: true
});

// Video tracking
window.analytics.track('video_played', {
  video_id: 'intro-video',
  video_title: 'Product Introduction',
  duration: 120,
  position: 0
});
```

### Performance Optimization

```javascript
// Increase batch size for high-traffic pages
window.ANALYTICS_BATCH_SIZE = 20;

// Reduce flush interval for real-time tracking
window.ANALYTICS_FLUSH_INTERVAL = 2000; // 2 seconds

// Disable auto-tracking for manual control
window.ANALYTICS_AUTO_TRACK = false;
```

---

## Framework Integration

### React

```javascript
// hooks/useAnalytics.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export function usePageView() {
  const router = useRouter();
  
  useEffect(() => {
    const handleRouteChange = () => {
      window.analytics?.trackPageView();
    };
    
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);
}

// Component
function MyComponent() {
  const handleClick = () => {
    window.analytics?.track('button_click', {
      button_id: 'signup',
      component: 'MyComponent'
    });
  };
  
  return <button onClick={handleClick}>Sign Up</button>;
}
```

### Next.js

```javascript
// _app.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  
  useEffect(() => {
    // Track page views on route change
    const handleRouteChange = () => {
      window.analytics?.trackPageView();
    };
    
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);
  
  return <Component {...pageProps} />;
}
```

```html
<!-- _document.js -->
<Head>
  <script dangerouslySetInnerHTML={{
    __html: `
      window.ANALYTICS_API_URL = '${process.env.NEXT_PUBLIC_ANALYTICS_URL}';
      window.ANALYTICS_SITE_ID = '${process.env.NEXT_PUBLIC_SITE_ID}';
      window.ANALYTICS_API_KEY = '${process.env.NEXT_PUBLIC_API_KEY}';
    `
  }} />
  <script src="/analytics.js" />
</Head>
```

### Vue.js

```javascript
// router/index.js
import { createRouter } from 'vue-router';

const router = createRouter({
  // ...routes
});

router.afterEach(() => {
  window.analytics?.trackPageView();
});

// Component
export default {
  methods: {
    trackEvent() {
      window.analytics?.track('button_click', {
        button_id: 'cta',
        page: this.$route.path
      });
    }
  }
};
```

### Angular

```typescript
// app.component.ts
import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  constructor(private router: Router) {}
  
  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      (window as any).analytics?.trackPageView();
    });
  }
  
  trackEvent() {
    (window as any).analytics?.track('button_click', {
      component: 'AppComponent'
    });
  }
}
```

### WordPress

```php
<!-- Add to theme's header.php or functions.php -->
function analytics_sdk() {
  ?>
  <script>
    window.ANALYTICS_API_URL = '<?php echo get_option('analytics_api_url'); ?>';
    window.ANALYTICS_SITE_ID = '<?php echo get_option('analytics_site_id'); ?>';
    window.ANALYTICS_API_KEY = '<?php echo get_option('analytics_api_key'); ?>';
    window.ANALYTICS_AUTO_TRACK = true;
  </script>
  <script src="<?php echo get_option('analytics_sdk_url'); ?>"></script>
  <?php
}
add_action('wp_head', 'analytics_sdk');
```

---

## Troubleshooting

### Events Not Showing in Dashboard

**Check:**
1. SDK loaded: `console.log(window.analytics)`
2. Configuration: `console.log(window.ANALYTICS_SITE_ID)`
3. Network tab: Look for POST requests to `/api/event`
4. Console errors: Enable `ANALYTICS_DEBUG = true`

**Common Issues:**
- Wrong API key or site ID
- CORS blocking requests (check allowed origins)
- Ad blocker blocking analytics.js
- Rate limiting (too many requests)

### High Latency / Slow Tracking

**Solutions:**
- Increase batch size: `ANALYTICS_BATCH_SIZE = 20`
- Reduce flush interval: `ANALYTICS_FLUSH_INTERVAL = 10000`
- Use CDN for analytics.js
- Check network conditions

### Session Not Tracked

**Check:**
- Session timeout not too short
- localStorage available (private mode?)
- Session ID: `console.log(sessionStorage.getItem('analytics_session_id'))`

### Events Lost on Navigation

**Fix:**
```javascript
// Flush before navigation
window.addEventListener('beforeunload', () => {
  window.analytics.flush();
});

// For SPAs, flush before route change
router.beforeEach((to, from, next) => {
  window.analytics.flush();
  next();
});
```

### Ad Blockers

**Solutions:**
- Use first-party domain for API (subdomain.yourdomain.com)
- Rename analytics.js to custom name (app.js, tracker.js)
- Host SDK on same domain as website
- Add to allowlist documentation for users

### Debug Mode

Enable detailed logging:

```javascript
window.ANALYTICS_DEBUG = true;
```

You'll see:
- Event queuing
- Batch flushing
- Network requests
- Retry attempts
- Session management

---

## Best Practices

### Performance

✅ **Do:**
- Use batching (default config is optimized)
- Let SDK auto-track page views
- Flush on beforeunload for SPAs
- Host analytics.js on CDN

❌ **Don't:**
- Set BATCH_SIZE to 1 (too many requests)
- Set FLUSH_INTERVAL too low (<1000ms)
- Call flush() on every event
- Block page load waiting for SDK

### Privacy

✅ **Do:**
- Respect Do Not Track: `navigator.doNotTrack === '1'`
- Provide opt-out mechanism
- Document cookie usage
- Anonymize sensitive data

❌ **Don't:**
- Track PII without consent
- Track users across domains
- Store sensitive data in metadata
- Ignore privacy regulations (GDPR, CCPA)

### Data Quality

✅ **Do:**
- Use consistent event naming (snake_case)
- Structure metadata logically
- Validate data before tracking
- Test in staging environment

❌ **Don't:**
- Change event names frequently
- Use dynamic metadata keys
- Track too many events (signal vs. noise)
- Mix event types in metadata

---

## Examples

### E-commerce

```javascript
// Product view
window.analytics.track('product_viewed', {
  product_id: 'SKU-123',
  name: 'Blue Widget',
  category: 'Widgets',
  price: 29.99,
  currency: 'USD'
});

// Add to cart
window.analytics.track('added_to_cart', {
  product_id: 'SKU-123',
  quantity: 2,
  value: 59.98
});

// Purchase
window.analytics.track('purchase_completed', {
  order_id: 'ORD-789',
  revenue: 59.98,
  shipping: 5.00,
  tax: 5.25,
  currency: 'USD',
  items: [
    { id: 'SKU-123', quantity: 2, price: 29.99 }
  ]
});
```

### SaaS

```javascript
// Sign up
window.analytics.track('signup_completed', {
  plan: 'pro',
  trial: true,
  referrer: 'google'
});

// Feature usage
window.analytics.track('feature_used', {
  feature: 'export_data',
  format: 'csv',
  rows: 1000
});

// Upgrade
window.analytics.track('plan_upgraded', {
  from: 'pro',
  to: 'enterprise',
  mrr: 99
});
```

### Content

```javascript
// Article read
window.analytics.track('article_read', {
  article_id: 'post-123',
  title: 'How to Use Analytics',
  author: 'John Doe',
  category: 'Tutorials',
  read_time: 240 // seconds
});

// Video engagement
window.analytics.track('video_progress', {
  video_id: 'vid-456',
  progress: 50, // percentage
  duration: 300 // seconds
});
```

---

## Support

For SDK support:
- Documentation: https://docs.your-domain.com
- GitHub Issues: https://github.com/your-repo/issues
- Community: https://discord.gg/your-server
