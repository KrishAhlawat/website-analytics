import request from 'supertest';
import { connectDB, Site, DailyStats } from '../lib/db';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

describe('Stats API', () => {
  let testApiKey: string;
  let testSiteId: string;
  const testDate = '2025-11-15';

  beforeAll(async () => {
    // Create a test site
    const response = await request(API_BASE)
      .post('/api/site/create')
      .send({ name: 'Test Site for Stats' })
      .expect(201);

    testSiteId = response.body.site_id;
    testApiKey = response.body.api_key;

    // Insert mock daily stats data
    await connectDB();
    await DailyStats.create({
      site_id: testSiteId,
      date: testDate,
      total_views: 150,
      unique_users: ['user-1', 'user-2', 'user-3'],
      path_counts: {
        '/homepage': 100,
        '/about': 30,
        '/contact': 20,
      },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await connectDB();
      await Site.deleteOne({ site_id: testSiteId });
      await DailyStats.deleteMany({ site_id: testSiteId });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('GET /api/stats', () => {
    test('should reject request without site_id parameter', async () => {
      const response = await request(API_BASE)
        .get('/api/stats')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation');
    });

    test('should return stats for valid site_id and date', async () => {
      const response = await request(API_BASE)
        .get('/api/stats')
        .query({ site_id: testSiteId, date: testDate })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.site_id).toBe(testSiteId);
      expect(response.body.data.date).toBe(testDate);
      expect(response.body.data.total_views).toBe(150);
      expect(response.body.data.unique_users_count).toBe(3);
      expect(response.body.data.top_paths).toHaveLength(3);
    });

    test('should return top paths sorted by views', async () => {
      const response = await request(API_BASE)
        .get('/api/stats')
        .query({ site_id: testSiteId, date: testDate })
        .expect(200);

      const topPaths = response.body.data.top_paths;
      expect(topPaths[0].path).toBe('/homepage');
      expect(topPaths[0].views).toBe(100);
      expect(topPaths[1].path).toBe('/about');
      expect(topPaths[1].views).toBe(30);
      expect(topPaths[2].path).toBe('/contact');
      expect(topPaths[2].views).toBe(20);
    });

    test('should return empty stats for non-existent date', async () => {
      const response = await request(API_BASE)
        .get('/api/stats')
        .query({ site_id: testSiteId, date: '2025-01-01' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total_views).toBe(0);
      expect(response.body.data.unique_users_count).toBe(0);
      expect(response.body.data.top_paths).toHaveLength(0);
    });

    test('should reject invalid date format', async () => {
      const response = await request(API_BASE)
        .get('/api/stats')
        .query({ site_id: testSiteId, date: 'invalid-date' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation');
    });

    test('should default to current date when date not provided', async () => {
      const response = await request(API_BASE)
        .get('/api/stats')
        .query({ site_id: testSiteId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('should return stats for non-existent site_id gracefully', async () => {
      const response = await request(API_BASE)
        .get('/api/stats')
        .query({ site_id: 'non-existent-site-id', date: testDate })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total_views).toBe(0);
    });
  });
});

