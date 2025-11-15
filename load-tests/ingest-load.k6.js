import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 VUs
    { duration: '1m', target: 100 },  // Stay at 100 VUs
    { duration: '30s', target: 200 }, // Spike to 200 VUs
    { duration: '1m', target: 100 },  // Back to 100 VUs
    { duration: '30s', target: 0 },   // Ramp down to 0 VUs
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'], // 95% under 200ms, 99% under 500ms
    http_req_failed: ['rate<0.05'], // Error rate below 5%
    errors: ['rate<0.05'],
  },
};

// Environment variables
const BASE_URL = __ENV.API_BASE || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'your-api-key-here';

// Test data generators
const paths = [
  '/',
  '/about',
  '/pricing',
  '/contact',
  '/blog',
  '/docs',
  '/features',
  '/signup',
  '/login',
  '/dashboard',
];

const eventTypes = ['pageview', 'click', 'scroll', 'form_submit'];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomUserId() {
  return `user-${Math.floor(Math.random() * 10000)}`;
}

export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);
  console.log(`Using API key: ${API_KEY.substring(0, 8)}...`);
  
  // Health check
  const healthCheck = http.get(`${BASE_URL}/api/health`);
  check(healthCheck, {
    'API is healthy': (r) => r.status === 200,
  });
  
  return { apiKey: API_KEY };
}

export default function (data) {
  const payload = JSON.stringify({
    event_type: randomElement(eventTypes),
    path: randomElement(paths),
    user_id: randomUserId(),
    timestamp: new Date().toISOString(),
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': data.apiKey,
    },
  };

  const response = http.post(`${BASE_URL}/api/event`, payload, params);

  // Check response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'response is successful': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    errorRate.add(1);
    console.error(`Request failed: ${response.status} - ${response.body}`);
  } else {
    errorRate.add(0);
  }

  // Think time: simulate realistic user behavior
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5 seconds
}

export function teardown(data) {
  console.log('Load test completed');
}
