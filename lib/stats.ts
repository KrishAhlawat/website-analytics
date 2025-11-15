import { DailyStats } from './db';

/** Create a new daily stats document (if not exists) */
export async function createDailyStats(site_id: string, date: string) {
  return DailyStats.updateOne(
    { site_id, date },
    { $setOnInsert: { total_views: 0, unique_users: [], path_counts: {} } },
    { upsert: true }
  );
}

/** Increment counters for a single event */
export async function incrementStatsForEvent(site_id: string, date: string, user_id: string, path: string) {
  const update: any = {
    $inc: { total_views: 1 },
    $addToSet: { unique_users: user_id },
    $set: { updated_at: new Date() },
  };

  // Use dot notation for path_counts increment
  update.$inc[`path_counts.${path}`] = 1;

  return DailyStats.updateOne({ site_id, date }, update, { upsert: true });
}

/** Bulk update helper: takes array of { site_id, date, user_id, path } and builds bulkWrite operations */
export function buildDailyStatsBulkOps(events: Array<{ site_id: string; date: string; user_id: string; path: string }>) {
  const opsMap = new Map<string, any>();

  for (const ev of events) {
    const key = `${ev.site_id}::${ev.date}`;
    const p = ev.path.replace(/\./g, '\\u002e');

    if (!opsMap.has(key)) {
      opsMap.set(key, { site_id: ev.site_id, date: ev.date, inc: { total_views: 0 }, addToSet: new Set<string>(), pathCounts: new Map<string, number>() });
    }

    const entry = opsMap.get(key);
    entry.inc.total_views += 1;
    entry.addToSet.add(ev.user_id);
    const prev = entry.pathCounts.get(ev.path) || 0;
    entry.pathCounts.set(ev.path, prev + 1);
  }

  const ops: any[] = [];

  for (const [_, val] of opsMap.entries()) {
    const { site_id, date, inc, addToSet, pathCounts } = val;
    const incObj: any = { total_views: inc.total_views };
    for (const [p, cnt] of pathCounts.entries()) {
      incObj[`path_counts.${p}`] = cnt;
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
