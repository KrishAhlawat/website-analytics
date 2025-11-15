import assert from 'assert';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

async function run() {
  console.log('Stats Test: Get stats for test-site');
  const resp = await fetch(`${API_BASE}/api/stats?site_id=test-site`);
  const data = await resp.json();
  assert(resp.ok && data.success, 'Stats API failed');
  console.log('Stats test passed');
}

run().catch(err => { console.error(err); process.exit(1); });
