import { connectDB, Event, DailyStats } from '../lib/db';

async function checkData() {
  await connectDB();
  
  console.log('\n📊 Events in database:');
  console.log('====================');
  const events = await Event.find({}).limit(10).sort({ timestamp: -1 });
  console.log(`Total events: ${await Event.countDocuments({})}`);
  
  if (events.length > 0) {
    events.forEach(event => {
      console.log(`\nSite: ${event.site_id}`);
      console.log(`Type: ${event.event_type}`);
      console.log(`Path: ${event.path}`);
      console.log(`Time: ${event.timestamp}`);
    });
  } else {
    console.log('No events found!');
  }
  
  console.log('\n\n📈 Daily Stats:');
  console.log('==============');
  const stats = await DailyStats.find({}).sort({ date: -1 }).limit(5);
  console.log(`Total daily stats: ${await DailyStats.countDocuments({})}`);
  
  if (stats.length > 0) {
    stats.forEach(stat => {
      console.log(`\nSite: ${stat.site_id}`);
      console.log(`Date: ${stat.date}`);
      console.log(`Views: ${stat.total_views}`);
      console.log(`Visitors: ${stat.unique_visitors}`);
      console.log(`Sessions: ${stat.sessions_count || 0}`);
    });
  } else {
    console.log('No daily stats found!');
  }
  
  process.exit(0);
}

checkData().catch(console.error);
