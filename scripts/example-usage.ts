#!/usr/bin/env tsx

/**
 * Example Usage Script
 * 
 * Demonstrates complete workflow:
 * 1. Create a site
 * 2. Send multiple events
 * 3. Wait for processing
 * 4. Query statistics
 */

import 'dotenv/config';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createSite(name: string) {
  log(`\n📝 Creating site: "${name}"...`, colors.blue);
  
  const response = await fetch(`${API_BASE}/api/site/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create site: ${error}`);
  }

  const data = await response.json();
  log(`✅ Site created successfully!`, colors.green);
  log(`   Site ID: ${data.site_id}`, colors.cyan);
  log(`   API Key: ${data.api_key}`, colors.cyan);
  
  return data;
}

async function sendEvent(apiKey: string, event: any) {
  const response = await fetch(`${API_BASE}/api/event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send event: ${error}`);
  }

  return await response.json();
}

async function getStats(siteId: string, date?: string) {
  const url = new URL(`${API_BASE}/api/stats`);
  url.searchParams.append('site_id', siteId);
  if (date) {
    url.searchParams.append('date', date);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get stats: ${error}`);
  }

  return await response.json();
}

async function main() {
  try {
    log('\n🚀 Website Analytics Example Usage', colors.yellow);
    log('=' .repeat(50), colors.yellow);

    // Step 1: Create a site
    const site = await createSite('Example Website');
    const { site_id, api_key } = site;

    // Step 2: Send multiple events
    log(`\n📊 Sending sample events...`, colors.blue);
    
    const events = [
      { event_type: 'pageview', path: '/', user_id: 'user-1' },
      { event_type: 'pageview', path: '/', user_id: 'user-2' },
      { event_type: 'pageview', path: '/', user_id: 'user-1' }, // same user again
      { event_type: 'pageview', path: '/about', user_id: 'user-3' },
      { event_type: 'pageview', path: '/about', user_id: 'user-4' },
      { event_type: 'pageview', path: '/pricing', user_id: 'user-1' },
      { event_type: 'pageview', path: '/pricing', user_id: 'user-5' },
      { event_type: 'pageview', path: '/pricing', user_id: 'user-6' },
      { event_type: 'pageview', path: '/contact', user_id: 'user-2' },
      { event_type: 'click', path: '/pricing', user_id: 'user-5' },
    ];

    let successCount = 0;
    for (const event of events) {
      try {
        await sendEvent(api_key, event);
        successCount++;
        process.stdout.write('.');
      } catch (error) {
        process.stdout.write('x');
      }
    }
    
    log(`\n✅ Sent ${successCount}/${events.length} events successfully`, colors.green);

    // Step 3: Wait for worker to process
    log(`\n⏳ Waiting 5 seconds for worker to process events...`, colors.yellow);
    await sleep(5000);

    // Step 4: Query statistics
    log(`\n📈 Fetching statistics...`, colors.blue);
    const stats = await getStats(site_id);

    if (stats.success) {
      log(`\n✅ Statistics retrieved successfully!`, colors.green);
      log(`\n📊 Analytics Summary for ${site_id}:`, colors.cyan);
      log(`   Date: ${stats.data.date}`);
      log(`   Total Views: ${stats.data.total_views}`);
      log(`   Unique Users: ${stats.data.unique_users_count}`);
      
      log(`\n🔝 Top Pages:`, colors.cyan);
      stats.data.top_paths.forEach((path: any, index: number) => {
        log(`   ${index + 1}. ${path.path} - ${path.views} views`);
      });

      log(`\n⏱️  Processing Time: ${stats.processing_time_ms}ms`, colors.yellow);
    } else {
      log(`❌ Failed to retrieve stats`, colors.red);
    }

    // Step 5: Demonstrate rate limiting (optional)
    log(`\n🔒 Testing rate limiting...`, colors.blue);
    const rateLimitTest = [];
    for (let i = 0; i < 10; i++) {
      rateLimitTest.push(
        sendEvent(api_key, {
          event_type: 'test',
          path: `/test-${i}`,
          user_id: `user-${i}`,
        })
      );
    }
    
    const rateLimitResults = await Promise.allSettled(rateLimitTest);
    const rateLimitSuccess = rateLimitResults.filter(r => r.status === 'fulfilled').length;
    log(`✅ Rate limiting working: ${rateLimitSuccess}/10 requests succeeded`, colors.green);

    // Final summary
    log(`\n${'='.repeat(50)}`, colors.yellow);
    log(`🎉 Example completed successfully!`, colors.green);
    log(`\n💡 Tips:`, colors.cyan);
    log(`   - Save your API key: ${api_key}`);
    log(`   - Use it in the x-api-key header for all requests`);
    log(`   - View your stats at any time with site_id: ${site_id}`);
    log(`   - Check the README.md for more details\n`);

  } catch (error: any) {
    log(`\n❌ Error: ${error.message}`, colors.red);
    if (error.stack) {
      log(error.stack, colors.red);
    }
    process.exit(1);
  }
}

// Run the example
main();
