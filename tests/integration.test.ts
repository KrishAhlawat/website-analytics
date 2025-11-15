import request from 'supertest';
import { connectDB, Site, Event, DailyStats } from '../lib/db';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

describe('End-to-End Integration Tests', () => {
  let testApiKey: string;
  let testSiteId: string;
  const testDate = new Date().toISOString().split('T')[0];

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      if (testSiteId) {
        await Site.deleteOne({ site_id: testSiteId });
        await Event.deleteMany({ site_id: testSiteId });
        await DailyStats.deleteMany({ site_id: testSiteId });
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('Complete Analytics Flow', () => {
    test('Step 1: Create a new site', async () => {
      const response = await request(API_BASE)
        .post('/api/site/create')
        .send({ name: 'E2E Test Site' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.site_id).toBeDefined();
      expect(response.body.api_key).toBeDefined();

      testSiteId = response.body.site_id;
      testApiKey = response.body.api_key;

      console.log(`Created test site: ${testSiteId}`);
    });

    test('Step 2: Ingest multiple events', async () => {
      const events = [
        { event_type: 'pageview', path: '/', user_id: 'user-1' },
        { event_type: 'pageview', path: '/', user_id: 'user-2' },
        { event_type: 'pageview', path: '/about', user_id: 'user-1' },
        { event_type: 'pageview', path: '/pricing', user_id: 'user-3' },
        { event_type: 'click', path: '/pricing', user_id: 'user-3' },
      ];

      for (const event of events) {
        const response = await request(API_BASE)
          .post('/api/event')
          .set('x-api-key', testApiKey)
          .send(event)
          .expect(200);

        expect(response.body.success).toBe(true);
      }

      console.log(`Ingested ${events.length} events`);
    });

    test('Step 3: Wait for worker to process events', async () => {
      // Wait for worker to process the events
      console.log('Waiting 5 seconds for worker processing...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    });

    test('Step 4: Verify events are stored in database', async () => {
      const eventCount = await Event.countDocuments({ site_id: testSiteId });
      expect(eventCount).toBeGreaterThan(0);
      console.log(`Found ${eventCount} events in database`);
    });

    test('Step 5: Verify daily stats are aggregated', async () => {
      const stats = await DailyStats.findOne({
        site_id: testSiteId,
        date: testDate,
      });

      expect(stats).not.toBeNull();
      if (stats) {
        expect(stats.total_views).toBeGreaterThan(0);
        expect(stats.unique_users.length).toBeGreaterThan(0);
        console.log(`Stats aggregated: ${stats.total_views} views, ${stats.unique_users.length} unique users`);
      }
    });

    test('Step 6: Query stats via API', async () => {
      const response = await request(API_BASE)
        .get('/api/stats')
        .query({ site_id: testSiteId, date: testDate })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.total_views).toBeGreaterThan(0);
      expect(response.body.data.unique_users_count).toBeGreaterThan(0);
      expect(response.body.data.top_paths).toBeDefined();
      expect(Array.isArray(response.body.data.top_paths)).toBe(true);

      console.log('Stats API response:', JSON.stringify(response.body.data, null, 2));
    });

    test('Step 7: Verify top paths are correctly sorted', async () => {
      const response = await request(API_BASE)
        .get('/api/stats')
        .query({ site_id: testSiteId, date: testDate })
        .expect(200);

      const topPaths = response.body.data.top_paths;
      
      // Verify descending order
      for (let i = 1; i < topPaths.length; i++) {
        expect(topPaths[i - 1].views).toBeGreaterThanOrEqual(topPaths[i].views);
      }

      console.log('Top paths verified:', topPaths);
    });

    test('Step 8: Test rate limiting with rapid requests', async () => {
      const rapidRequests = Array.from({ length: 150 }, (_, i) =>
        request(API_BASE)
          .post('/api/event')
          .set('x-api-key', testApiKey)
          .send({
            event_type: 'pageview',
            path: `/rapid-${i}`,
            user_id: `rapid-user-${i}`,
          })
      );

      const responses = await Promise.all(rapidRequests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      console.log(`Rate limited: ${rateLimited.length} out of ${rapidRequests.length} requests`);
      
      // Should have some rate limited requests if limit is 100/min
      if (parseInt(process.env.RATE_LIMIT_PER_MINUTE || '100') < 150) {
        expect(rateLimited.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Handling', () => {
    test('Should handle invalid API key gracefully', async () => {
      const response = await request(API_BASE)
        .post('/api/event')
        .set('x-api-key', 'invalid-key')
        .send({
          event_type: 'pageview',
          path: '/test',
          user_id: 'test-user',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Unauthorized');
    });

    test('Should handle missing required fields', async () => {
      const response = await request(API_BASE)
        .post('/api/event')
        .set('x-api-key', testApiKey)
        .send({
          event_type: 'pageview',
          // missing path and user_id
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('Should handle non-existent site_id in stats query', async () => {
      const response = await request(API_BASE)
        .get('/api/stats')
        .query({ site_id: 'non-existent-site' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total_views).toBe(0);
    });
  });
});
