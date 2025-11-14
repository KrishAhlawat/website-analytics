/**
 * Test Script for Analytics Platform
 * 
 * Run with: tsx scripts/test-analytics.ts
 * Or add to package.json: "test:api": "tsx scripts/test-analytics.ts"
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
}

async function testEventIngestion(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_BASE}/api/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        site_id: 'test-site',
        event_type: 'pageview',
        path: '/test-page',
        user_id: `test-user-${Date.now()}`,
      }),
    });
    
    const data = await response.json();
    const duration = Date.now() - startTime;
    
    return {
      name: 'Event Ingestion',
      success: response.ok && data.success,
      duration,
      data,
    };
  } catch (error: any) {
    return {
      name: 'Event Ingestion',
      success: false,
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

async function testStatsRetrieval(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_BASE}/api/stats?site_id=test-site`);
    const data = await response.json();
    const duration = Date.now() - startTime;
    
    return {
      name: 'Stats Retrieval',
      success: response.ok && data.success,
      duration,
      data,
    };
  } catch (error: any) {
    return {
      name: 'Stats Retrieval',
      success: false,
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

async function testValidationError(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_BASE}/api/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        site_id: '',
        event_type: 'pageview',
      }),
    });
    
    const data = await response.json();
    const duration = Date.now() - startTime;
    
    return {
      name: 'Validation Error Handling',
      success: response.status === 400 && !data.success,
      duration,
      data,
    };
  } catch (error: any) {
    return {
      name: 'Validation Error Handling',
      success: false,
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

async function testLoadPerformance(): Promise<TestResult> {
  const startTime = Date.now();
  const eventCount = 50;
  
  try {
    const promises = Array.from({ length: eventCount }, (_, i) =>
      fetch(`${API_BASE}/api/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id: 'load-test-site',
          event_type: 'pageview',
          path: `/page-${i}`,
          user_id: `user-${i}`,
        }),
      })
    );
    
    const responses = await Promise.all(promises);
    const successCount = responses.filter(r => r.ok).length;
    const duration = Date.now() - startTime;
    const avgDuration = duration / eventCount;
    
    return {
      name: 'Load Performance Test',
      success: successCount === eventCount && avgDuration < 100,
      duration,
      data: {
        total_events: eventCount,
        successful: successCount,
        failed: eventCount - successCount,
        avg_duration_ms: avgDuration.toFixed(2),
      },
    };
  } catch (error: any) {
    return {
      name: 'Load Performance Test',
      success: false,
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

function printResult(result: TestResult) {
  const status = result.success ? '✅ PASS' : '❌ FAIL';
  console.log(`\n${status} | ${result.name} (${result.duration}ms)`);
  
  if (result.error) {
    console.log(`   Error: ${result.error}`);
  }
  
  if (result.data && Object.keys(result.data).length > 0) {
    console.log(`   Data:`, JSON.stringify(result.data, null, 2));
  }
}

async function runTests() {
  console.log('🧪 Starting Analytics Platform Tests...\n');
  console.log(`Testing API at: ${API_BASE}`);
  console.log('=' .repeat(60));
  
  const tests = [
    testEventIngestion,
    testValidationError,
    testStatsRetrieval,
    testLoadPerformance,
  ];
  
  const results: TestResult[] = [];
  
  for (const test of tests) {
    const result = await test();
    results.push(result);
    printResult(result);
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary\n');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Total Duration: ${totalDuration}ms`);
  console.log(`📈 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
