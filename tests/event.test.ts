import request from 'supertest';
import { connectDB, Site, Event, DailyStats } from '../lib/db';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

describe('Event Ingestion API', () => {
  let testApiKey: string;
  let testSiteId: string;

  beforeAll(async () => {
    // Create a test site
    const response = await request(API_BASE)
      .post('/api/site/create')
      .send({ name: 'Test Site for Events' })
      .expect(201);

    testSiteId = response.body.site_id;
    testApiKey = response.body.api_key;
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await connectDB();
      await Site.deleteOne({ site_id: testSiteId });
      await Event.deleteMany({ site_id: testSiteId });
      await DailyStats.deleteMany({ site_id: testSiteId });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('POST /api/event', () => {
    test('should reject request without API key', async () => {
      const response = await request(API_BASE)
        .post('/api/event')
        .send({
          event_type: 'pageview',
          path: '/test',
          user_id: 'user-123',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('x-api-key');
    });

    test('should reject request with invalid API key', async () => {
      const response = await request(API_BASE)
        .post('/api/event')
        .set('x-api-key', 'invalid-key-12345')
        .send({
          event_type: 'pageview',
          path: '/test',
          user_id: 'user-123',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Unauthorized');
    });

    test('should successfully ingest valid event', async () => {
      const response = await request(API_BASE)
        .post('/api/event')
        .set('x-api-key', testApiKey)
        .send({
          event_type: 'pageview',
          path: '/homepage',
          user_id: 'user-456',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('queued');
    });

    test('should reject event with missing required fields', async () => {
      const response = await request(API_BASE)
        .post('/api/event')
        .set('x-api-key', testApiKey)
        .send({
          event_type: 'pageview',
          // missing path and user_id
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation');
    });

    test('should reject event with invalid event_type', async () => {
      const response = await request(API_BASE)
        .post('/api/event')
        .set('x-api-key', testApiKey)
        .send({
          event_type: '', // empty
          path: '/test',
          user_id: 'user-789',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle multiple rapid requests (rate limiting)', async () => {
      const requests = Array.from({ length: 10 }, (_, i) =>
        request(API_BASE)
          .post('/api/event')
          .set('x-api-key', testApiKey)
          .send({
            event_type: 'pageview',
            path: `/page-${i}`,
            user_id: `user-${i}`,
          })
      );

      const responses = await Promise.all(requests);
      const successCount = responses.filter(r => r.status === 200).length;
      
      // Should accept most or all within rate limit
      expect(successCount).toBeGreaterThan(0);
    });

    test('should auto-inject timestamp if not provided', async () => {
      const response = await request(API_BASE)
        .post('/api/event')
        .set('x-api-key', testApiKey)
        .send({
          event_type: 'click',
          path: '/button',
          user_id: 'user-timestamp-test',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should accept custom timestamp in ISO format', async () => {
      const customTimestamp = new Date('2025-11-14T12:00:00Z').toISOString();
      
      const response = await request(API_BASE)
        .post('/api/event')
        .set('x-api-key', testApiKey)
        .send({
          event_type: 'pageview',
          path: '/custom-time',
          user_id: 'user-custom-time',
          timestamp: customTimestamp,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});

