(function() {
  'use strict';

  // Configuration
  const config = {
    apiUrl: window.ANALYTICS_API_URL || 'http://localhost:3000/api/event',
    apiKey: window.ANALYTICS_API_KEY || '',
    siteId: window.ANALYTICS_SITE_ID || '',
    autoTrack: window.ANALYTICS_AUTO_TRACK !== false,
    trackOutbound: window.ANALYTICS_TRACK_OUTBOUND !== false,
    sessionTimeout: window.ANALYTICS_SESSION_TIMEOUT || 30 * 60 * 1000, // 30 minutes
    batchSize: window.ANALYTICS_BATCH_SIZE || 10,
    flushInterval: window.ANALYTICS_FLUSH_INTERVAL || 5000, // 5 seconds
    maxRetries: window.ANALYTICS_MAX_RETRIES || 3,
    debug: window.ANALYTICS_DEBUG || false,
  };

  // Validate configuration
  if (!config.apiKey || !config.siteId) {
    console.error('Analytics: Missing API key or Site ID');
    return;
  }

  // Queue for offline events
  const QUEUE_KEY = `analytics_queue_${config.siteId}`;
  const VISITOR_KEY = `analytics_visitor_${config.siteId}`;
  const SESSION_KEY = `analytics_session_${config.siteId}`;
  const SESSION_START_KEY = `analytics_session_start_${config.siteId}`;
  const LAST_ACTIVITY_KEY = `analytics_last_activity_${config.siteId}`;

  let eventQueue = [];
  let flushTimer = null;
  let pageViewCount = 0;
  let sessionStartTime = Date.now();
  let isOnline = navigator.onLine;

  // Session management
  let sessionId = getOrCreateSession();
  let visitorId = getOrCreateVisitor();

  function getOrCreateSession() {
    const lastActivity = parseInt(sessionStorage.getItem(LAST_ACTIVITY_KEY) || '0');
    const now = Date.now();
    
    // Check if session expired
    if (lastActivity && (now - lastActivity) > config.sessionTimeout) {
      // Create new session
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_START_KEY);
    }

    let session = sessionStorage.getItem(SESSION_KEY);
    
    if (!session) {
      session = generateId();
      sessionStorage.setItem(SESSION_KEY, session);
      sessionStorage.setItem(SESSION_START_KEY, now.toString());
      sessionStartTime = now;
    } else {
      sessionStartTime = parseInt(sessionStorage.getItem(SESSION_START_KEY) || now.toString());
    }
    
    sessionStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    return session;
  }

  function getOrCreateVisitor() {
    let visitor = localStorage.getItem(VISITOR_KEY);
    
    if (!visitor) {
      visitor = generateId();
      localStorage.setItem(VISITOR_KEY, visitor);
    }
    
    return visitor;
  }

  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Update session activity
  function updateSessionActivity() {
    sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    sessionId = getOrCreateSession(); // Refresh session if needed
  }

  // Load queued events from localStorage
  function loadQueue() {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      if (stored) {
        eventQueue = JSON.parse(stored);
        if (config.debug) console.log('Analytics: Loaded', eventQueue.length, 'queued events');
      }
    } catch (e) {
      if (config.debug) console.error('Analytics: Failed to load queue', e);
      eventQueue = [];
    }
  }

  // Save queue to localStorage
  function saveQueue() {
    try {
      if (eventQueue.length > 0) {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(eventQueue));
      } else {
        localStorage.removeItem(QUEUE_KEY);
      }
    } catch (e) {
      if (config.debug) console.error('Analytics: Failed to save queue', e);
    }
  }

  // Detect device type
  function getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }

  // Get browser name
  function getBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox/')) return 'Firefox';
    if (ua.includes('Edg/')) return 'Edge';
    if (ua.includes('Chrome/')) return 'Chrome';
    if (ua.includes('Safari/')) return 'Safari';
    if (ua.includes('Opera/') || ua.includes('OPR/')) return 'Opera';
    return 'Unknown';
  }

  // Get OS name
  function getOS() {
    const ua = navigator.userAgent;
    if (ua.includes('Win')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Unknown';
  }

  // Get screen resolution
  function getScreenResolution() {
    return `${window.screen.width}x${window.screen.height}`;
  }

  // Get viewport size
  function getViewportSize() {
    return `${window.innerWidth}x${window.innerHeight}`;
  }

  // Queue event for batching
  function queueEvent(eventData) {
    updateSessionActivity();
    
    const event = {
      site_id: config.siteId,
      session_id: sessionId,
      visitor_id: visitorId,
      event_type: eventData.event_type || 'pageview',
      page_url: eventData.page_url || window.location.href,
      page_title: eventData.page_title || document.title,
      referrer: eventData.referrer || document.referrer || null,
      device_type: eventData.device_type || getDeviceType(),
      browser: getBrowser(),
      os: getOS(),
      screen_resolution: getScreenResolution(),
      viewport_size: getViewportSize(),
      timestamp: new Date().toISOString(),
      user_props: eventData.user_props || {},
      ...eventData.metadata && { metadata: eventData.metadata },
      _retries: 0,
    };

    eventQueue.push(event);
    saveQueue();

    if (config.debug) {
      console.log('Analytics: Queued event', event.event_type, '(queue size:', eventQueue.length + ')');
    }

    // Flush if batch size reached
    if (eventQueue.length >= config.batchSize) {
      flushQueue();
    } else if (!flushTimer) {
      // Schedule flush
      flushTimer = setTimeout(flushQueue, config.flushInterval);
    }
  }

  // Send events to server
  async function sendEvents(events) {
    if (!isOnline) {
      if (config.debug) console.log('Analytics: Offline, keeping events in queue');
      return false;
    }

    try {
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey,
        },
        body: JSON.stringify(events.length === 1 ? events[0] : { batch: events }),
        keepalive: true,
      });

      if (response.ok) {
        if (config.debug) console.log('Analytics: Sent', events.length, 'events');
        return true;
      } else {
        console.error('Analytics: Server error', response.status);
        return false;
      }
    } catch (error) {
      console.error('Analytics: Network error', error.message);
      return false;
    }
  }

  // Flush queue with retry logic
  async function flushQueue() {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }

    if (eventQueue.length === 0) return;

    const eventsToSend = eventQueue.splice(0, config.batchSize);
    const success = await sendEvents(eventsToSend);

    if (success) {
      // Remove sent events from queue
      saveQueue();
    } else {
      // Retry logic
      const retriableEvents = eventsToSend.filter(e => {
        e._retries = (e._retries || 0) + 1;
        return e._retries <= config.maxRetries;
      });

      if (retriableEvents.length > 0) {
        // Put back in queue with exponential backoff
        eventQueue.unshift(...retriableEvents);
        saveQueue();
        
        const backoffDelay = Math.min(30000, 1000 * Math.pow(2, retriableEvents[0]._retries));
        if (config.debug) {
          console.log('Analytics: Retry in', backoffDelay, 'ms');
        }
        setTimeout(flushQueue, backoffDelay);
      } else {
        if (config.debug) {
          console.log('Analytics: Max retries reached, discarding', eventsToSend.length, 'events');
        }
      }
    }

    // Continue flushing if queue not empty
    if (eventQueue.length > 0) {
      flushTimer = setTimeout(flushQueue, config.flushInterval);
    }
  }

  // Track page view
  function trackPageView() {
    pageViewCount++;
    queueEvent({
      event_type: 'pageview',
      metadata: {
        page_count: pageViewCount,
        session_duration: Math.floor((Date.now() - sessionStartTime) / 1000),
      }
    });
  }

  // Track custom event
  function track(eventName, metadata = {}, userProps = {}) {
    queueEvent({
      event_type: eventName,
      metadata: metadata,
      user_props: userProps,
    });
  }

  // Track outbound link clicks
  function trackOutboundLink(url) {
    queueEvent({
      event_type: 'outbound_click',
      metadata: {
        destination: url,
      }
    });
  }

  // Set user properties
  function identify(userId, properties = {}) {
    visitorId = userId;
    localStorage.setItem(VISITOR_KEY, userId);
    
    queueEvent({
      event_type: 'identify',
      user_props: properties,
    });
  }

  // Track time on page
  let pageStartTime = Date.now();
  function trackTimeOnPage() {
    const duration = Math.floor((Date.now() - pageStartTime) / 1000);
    if (duration > 0) {
      queueEvent({
        event_type: 'time_on_page',
        metadata: {
          duration: duration,
          page_count: pageViewCount,
        }
      });
    }
  }

  // Initialize
  loadQueue();

  // Online/offline handlers
  window.addEventListener('online', function() {
    isOnline = true;
    if (config.debug) console.log('Analytics: Online, flushing queue');
    flushQueue();
  });

  window.addEventListener('offline', function() {
    isOnline = false;
    if (config.debug) console.log('Analytics: Offline mode');
  });

  // Auto-tracking setup
  if (config.autoTrack) {
    // Track initial page view
    if (document.readyState === 'complete') {
      trackPageView();
    } else {
      window.addEventListener('load', trackPageView);
    }

    // Track page visibility changes
    let lastVisibilityChange = Date.now();
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') {
        const duration = Math.floor((Date.now() - lastVisibilityChange) / 1000);
        queueEvent({
          event_type: 'page_hidden',
          metadata: {
            duration: duration,
          }
        });
        // Flush immediately before page potentially closes
        flushQueue();
      } else {
        lastVisibilityChange = Date.now();
        updateSessionActivity();
      }
    });

    // Track outbound links
    if (config.trackOutbound) {
      document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (!link) return;
        
        const href = link.getAttribute('href');
        if (!href) return;
        
        // Check if it's an outbound link
        if (href.startsWith('http') && !href.includes(window.location.hostname)) {
          trackOutboundLink(href);
        }
      });
    }

    // Track page unload
    window.addEventListener('beforeunload', function() {
      trackTimeOnPage();
      flushQueue();
    });

    // Periodic session activity update
    setInterval(updateSessionActivity, 60000); // Every minute
  }

  // Expose public API
  window.analytics = {
    track: track,
    trackPageView: trackPageView,
    trackOutbound: trackOutboundLink,
    identify: identify,
    flush: flushQueue,
    config: config,
  };

  if (config.debug) {
    console.log('Analytics SDK initialized', {
      siteId: config.siteId,
      visitorId: visitorId,
      sessionId: sessionId,
    });
  }
})();
