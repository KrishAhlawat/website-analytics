(function() {
  'use strict';

  // Configuration
  const config = {
    apiUrl: window.ANALYTICS_API_URL || 'http://localhost:3000/api/event',
    apiKey: window.ANALYTICS_API_KEY || '',
    siteId: window.ANALYTICS_SITE_ID || '',
    autoTrack: window.ANALYTICS_AUTO_TRACK !== false,
    trackOutbound: window.ANALYTICS_TRACK_OUTBOUND !== false,
  };

  // Validate configuration
  if (!config.apiKey || !config.siteId) {
    console.error('Analytics: Missing API key or Site ID');
    return;
  }

  // Session management
  let sessionId = getOrCreateSession();
  let pageViewCount = 0;
  let sessionStartTime = Date.now();

  function getOrCreateSession() {
    const storageKey = `analytics_session_${config.siteId}`;
    let session = sessionStorage.getItem(storageKey);
    
    if (!session) {
      session = generateId();
      sessionStorage.setItem(storageKey, session);
    }
    
    return session;
  }

  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Get visitor ID (persistent across sessions)
  function getVisitorId() {
    const storageKey = `analytics_visitor_${config.siteId}`;
    let visitorId = localStorage.getItem(storageKey);
    
    if (!visitorId) {
      visitorId = generateId();
      localStorage.setItem(storageKey, visitorId);
    }
    
    return visitorId;
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

  // Track event
  async function trackEvent(eventData) {
    try {
      const payload = {
        site_id: config.siteId,
        session_id: sessionId,
        visitor_id: getVisitorId(),
        event_type: eventData.event_type || 'pageview',
        page_url: eventData.page_url || window.location.href,
        page_title: eventData.page_title || document.title,
        referrer: eventData.referrer || document.referrer || null,
        device_type: eventData.device_type || getDeviceType(),
        browser: getBrowser(),
        os: getOS(),
        ...eventData.metadata && { metadata: eventData.metadata }
      };

      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey,
        },
        body: JSON.stringify(payload),
        keepalive: true,
      });

      if (!response.ok) {
        console.error('Analytics: Failed to track event', response.status);
      }
    } catch (error) {
      console.error('Analytics: Error tracking event', error);
    }
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

  // Track page view
  function trackPageView() {
    pageViewCount++;
    trackEvent({
      event_type: 'pageview',
      metadata: {
        page_count: pageViewCount,
        session_duration: Math.floor((Date.now() - sessionStartTime) / 1000),
      }
    });
  }

  // Track custom event
  function track(eventName, metadata = {}) {
    trackEvent({
      event_type: eventName,
      metadata: metadata,
    });
  }

  // Track outbound link clicks
  function trackOutboundLink(url) {
    trackEvent({
      event_type: 'outbound_click',
      metadata: {
        destination: url,
      }
    });
  }

  // Auto-tracking setup
  if (config.autoTrack) {
    // Track initial page view
    if (document.readyState === 'complete') {
      trackPageView();
    } else {
      window.addEventListener('load', trackPageView);
    }

    // Track page visibility changes (tab switching)
    let lastVisibilityChange = Date.now();
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') {
        const duration = Math.floor((Date.now() - lastVisibilityChange) / 1000);
        trackEvent({
          event_type: 'page_hidden',
          metadata: {
            duration: duration,
          }
        });
      } else {
        lastVisibilityChange = Date.now();
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
  }

  // Expose public API
  window.analytics = {
    track: track,
    trackPageView: trackPageView,
    trackOutbound: trackOutboundLink,
    config: config,
  };

  console.log('Analytics SDK initialized for site:', config.siteId);
})();
