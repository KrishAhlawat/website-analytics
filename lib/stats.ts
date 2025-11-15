import { DailyStats, Session } from './db';

/** Create a new daily stats document (if not exists) */
export async function createDailyStats(site_id: string, date: string) {
  return DailyStats.updateOne(
    { site_id, date },
    { 
      $setOnInsert: { 
        total_views: 0, 
        unique_users: [], 
        sessions_count: 0,
        avg_session_duration: 0,
        avg_pages_per_session: 0,
        bounce_rate: 0,
        path_counts: {},
        device_counts: {},
        browser_counts: {},
        referrer_counts: {},
      } 
    },
    { upsert: true }
  );
}

/** Increment counters for a single event */
export async function incrementStatsForEvent(
  site_id: string, 
  date: string, 
  visitor_id: string, 
  path: string,
  device_type?: string,
  browser?: string,
  referrer?: string
) {
  const update: any = {
    $inc: { total_views: 1 },
    $addToSet: { unique_users: visitor_id },
    $set: { updated_at: new Date() },
  };

  // Use dot notation for path_counts increment
  update.$inc[`path_counts.${path}`] = 1;
  
  if (device_type) {
    update.$inc[`device_counts.${device_type}`] = 1;
  }
  
  if (browser) {
    update.$inc[`browser_counts.${browser}`] = 1;
  }
  
  if (referrer) {
    update.$inc[`referrer_counts.${referrer}`] = 1;
  }

  return DailyStats.updateOne({ site_id, date }, update, { upsert: true });
}

/** Update session tracking */
export async function updateSession(
  session_id: string,
  site_id: string,
  visitor_id: string,
  referrer?: string,
  user_agent?: string
) {
  const now = new Date();
  
  return Session.updateOne(
    { session_id },
    {
      $set: {
        site_id,
        user_id: visitor_id,
        last_activity: now,
        referrer: referrer || undefined,
        user_agent: user_agent || undefined,
      },
      $inc: { page_count: 1 },
      $setOnInsert: {
        started_at: now,
      }
    },
    { upsert: true }
  );
}

/** Calculate session metrics for daily stats */
export async function calculateSessionMetrics(site_id: string, date: string) {
  // Get all sessions that were active on this date
  const startOfDay = new Date(date + 'T00:00:00.000Z');
  const endOfDay = new Date(date + 'T23:59:59.999Z');
  
  const sessions = await Session.find({
    site_id,
    started_at: { $gte: startOfDay, $lte: endOfDay }
  }).lean();
  
  if (sessions.length === 0) {
    return {
      sessions_count: 0,
      avg_session_duration: 0,
      avg_pages_per_session: 0,
      bounce_rate: 0,
    };
  }
  
  let totalDuration = 0;
  let totalPages = 0;
  let bouncedSessions = 0;
  
  for (const session of sessions) {
    const duration = (session.last_activity.getTime() - session.started_at.getTime()) / 1000; // in seconds
    totalDuration += duration;
    totalPages += session.page_count;
    
    if (session.page_count === 1) {
      bouncedSessions++;
    }
  }
  
  return {
    sessions_count: sessions.length,
    avg_session_duration: Math.round(totalDuration / sessions.length),
    avg_pages_per_session: Math.round((totalPages / sessions.length) * 10) / 10,
    bounce_rate: Math.round((bouncedSessions / sessions.length) * 1000) / 10, // percentage with 1 decimal
  };
}

/** Bulk update helper: takes array of events and builds bulkWrite operations */
export function buildDailyStatsBulkOps(events: Array<{ 
  site_id: string; 
  date: string; 
  visitor_id: string; 
  path: string;
  device_type?: string;
  browser?: string;
  referrer?: string;
}>) {
  const opsMap = new Map<string, any>();

  for (const ev of events) {
    const key = `${ev.site_id}::${ev.date}`;

    if (!opsMap.has(key)) {
      opsMap.set(key, { 
        site_id: ev.site_id, 
        date: ev.date, 
        inc: { total_views: 0 }, 
        addToSet: new Set<string>(), 
        pathCounts: new Map<string, number>(),
        deviceCounts: new Map<string, number>(),
        browserCounts: new Map<string, number>(),
        referrerCounts: new Map<string, number>(),
      });
    }

    const entry = opsMap.get(key);
    entry.inc.total_views += 1;
    entry.addToSet.add(ev.visitor_id);
    
    // Path counts
    const prevPath = entry.pathCounts.get(ev.path) || 0;
    entry.pathCounts.set(ev.path, prevPath + 1);
    
    // Device counts
    if (ev.device_type) {
      const prevDevice = entry.deviceCounts.get(ev.device_type) || 0;
      entry.deviceCounts.set(ev.device_type, prevDevice + 1);
    }
    
    // Browser counts
    if (ev.browser) {
      const prevBrowser = entry.browserCounts.get(ev.browser) || 0;
      entry.browserCounts.set(ev.browser, prevBrowser + 1);
    }
    
    // Referrer counts
    if (ev.referrer) {
      const prevReferrer = entry.referrerCounts.get(ev.referrer) || 0;
      entry.referrerCounts.set(ev.referrer, prevReferrer + 1);
    }
  }

  const ops: any[] = [];

  for (const [_, val] of opsMap.entries()) {
    const { site_id, date, inc, addToSet, pathCounts, deviceCounts, browserCounts, referrerCounts } = val;
    const incObj: any = { total_views: inc.total_views };
    
    for (const [p, cnt] of pathCounts.entries()) {
      incObj[`path_counts.${p}`] = cnt;
    }
    
    for (const [d, cnt] of deviceCounts.entries()) {
      incObj[`device_counts.${d}`] = cnt;
    }
    
    for (const [b, cnt] of browserCounts.entries()) {
      incObj[`browser_counts.${b}`] = cnt;
    }
    
    for (const [r, cnt] of referrerCounts.entries()) {
      incObj[`referrer_counts.${r}`] = cnt;
    }

    ops.push({
      updateOne: {
        filter: { site_id, date },
        update: {
          $inc: incObj,
          $addToSet: { unique_users: { $each: Array.from(addToSet) } },
          $set: { updated_at: new Date() },
        },
        upsert: true,
      }
    });
  }

  return ops;
}

