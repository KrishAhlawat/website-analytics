/**
 * Sample data generator for testing
 * 
 * Generates realistic analytics events for multiple sites
 * Run with: tsx scripts/generate-sample-data.ts
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

const SITES = ['blog-site', 'ecommerce-site', 'landing-page'];
const EVENT_TYPES = ['pageview', 'click', 'scroll', 'form_submit'];
const PATHS = [
  '/',
  '/home',
  '/about',
  '/products',
  '/blog',
  '/contact',
  '/pricing',
  '/features',
  '/docs',
  '/api',
];

function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomUserId(): string {
  return `user-${Math.floor(Math.random() * 1000)}`;
}

function randomTimestamp(daysAgo: number = 0): string {
  const now = new Date();
  now.setDate(now.getDate() - daysAgo);
  now.setHours(Math.floor(Math.random() * 24));
  now.setMinutes(Math.floor(Math.random() * 60));
  return now.toISOString();
}

async function sendEvent(event: any): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function generateSampleData() {
  console.log('🎲 Generating sample analytics data...\n');
  console.log(`Target API: ${API_BASE}`);
  console.log(`Sites: ${SITES.join(', ')}`);
  console.log(`Generating data for last 7 days`);
  console.log('=' .repeat(60));
  
  const totalEvents = 500;
  let successCount = 0;
  let failCount = 0;
  
  const startTime = Date.now();
  
  for (let i = 0; i < totalEvents; i++) {
    const daysAgo = Math.floor(Math.random() * 7); // Last 7 days
    
    const event = {
      site_id: randomItem(SITES),
      event_type: randomItem(EVENT_TYPES),
      path: randomItem(PATHS),
      user_id: randomUserId(),
      timestamp: randomTimestamp(daysAgo),
    };
    
    const success = await sendEvent(event);
    
    if (success) {
      successCount++;
      if (successCount % 50 === 0) {
        console.log(`✅ Sent ${successCount} events...`);
      }
    } else {
      failCount++;
    }
  }
  
  const duration = Date.now() - startTime;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Generation Complete\n');
  console.log(`Total Events: ${totalEvents}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`📈 Rate: ${(totalEvents / (duration / 1000)).toFixed(2)} events/sec`);
  
  console.log('\n🎯 Next Steps:');
  console.log(`1. Wait a few seconds for the worker to process events`);
  console.log(`2. Check stats for each site:`);
  SITES.forEach(site => {
    console.log(`   curl "${API_BASE}/api/stats?site_id=${site}"`);
  });
}

generateSampleData().catch(error => {
  console.error('Error generating data:', error);
  process.exit(1);
});
