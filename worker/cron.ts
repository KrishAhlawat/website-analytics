import 'dotenv/config';
import cron from 'node-cron';
import { connectDB } from '../lib/db';
import { createDailyStats } from '../lib/stats';
import { logWithTimestamp, logError } from '../lib/utils';

async function runCleanup() {
  try {
    await connectDB();
    logWithTimestamp('Cron: Running daily cleanup...');

    const daysToKeep = parseInt(process.env.EVENT_RETENTION_DAYS || '7', 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);

    const db = (await connectDB()).connection.db;
    const res = await db.collection('events').deleteMany({ timestamp: { $lt: cutoff } });
    logWithTimestamp(`Cron: Deleted ${res.deletedCount} old events older than ${daysToKeep} days`);

    // Precreate today's and next day's stats placeholders for active sites (optional)
    const sites = await db.collection('sites').find().toArray();
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayKey = today.toISOString().split('T')[0];
    const tomorrowKey = tomorrow.toISOString().split('T')[0];

    for (const s of sites) {
      await createDailyStats(s.site_id, todayKey);
      await createDailyStats(s.site_id, tomorrowKey);
    }

    logWithTimestamp('Cron: Daily stats placeholders created/ensured');
  } catch (err: any) {
    logError('Cron Cleanup', err);
  }
}

// Schedule at midnight UTC every day
cron.schedule('0 0 * * *', () => {
  void runCleanup();
}, { timezone: process.env.CRON_TIMEZONE || 'UTC' });

// Run immediately on start
void runCleanup();

logWithTimestamp('Cron worker started and scheduled');
