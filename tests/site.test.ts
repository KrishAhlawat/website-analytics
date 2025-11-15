import request from 'supertest';
import { connectDB, Site } from '../lib/db';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

describe('Site Management API', () => {
  const createdSiteIds: string[] = [];

  afterAll(async () => {
    // Cleanup all created test sites
    try {
      await connectDB();
      for (const siteId of createdSiteIds) {
        await Site.deleteOne({ site_id: siteId });
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('POST /api/site/create', () => {
    test('should create a new site with valid name', async () => {
      const response = await request(API_BASE)
        .post('/api/site/create')
        .send({ name: 'My Awesome Website' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.site_id).toBeDefined();
      expect(response.body.api_key).toBeDefined();
      expect(response.body.site_id).toMatch(/^my-awesome-website-[a-f0-9]{6}$/);
      expect(response.body.api_key).toHaveLength(48);

      createdSiteIds.push(response.body.site_id);
    });

    test('should generate unique site_id for sites with same name', async () => {
      const response1 = await request(API_BASE)
        .post('/api/site/create')
        .send({ name: 'Duplicate Name Test' })
        .expect(201);

      const response2 = await request(API_BASE)
        .post('/api/site/create')
        .send({ name: 'Duplicate Name Test' })
        .expect(201);

      expect(response1.body.site_id).not.toBe(response2.body.site_id);
      expect(response1.body.api_key).not.toBe(response2.body.api_key);

      createdSiteIds.push(response1.body.site_id, response2.body.site_id);
    });

    test('should reject request without name', async () => {
      const response = await request(API_BASE)
        .post('/api/site/create')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation');
    });

    test('should reject request with empty name', async () => {
      const response = await request(API_BASE)
        .post('/api/site/create')
        .send({ name: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should normalize site_id from name (lowercase, dashes)', async () => {
      const response = await request(API_BASE)
        .post('/api/site/create')
        .send({ name: 'Test Site 123!@#' })
        .expect(201);

      expect(response.body.site_id).toMatch(/^test-site-123-[a-f0-9]{6}$/);
      createdSiteIds.push(response.body.site_id);
    });

    test('should persist site to database', async () => {
      const response = await request(API_BASE)
        .post('/api/site/create')
        .send({ name: 'Persistence Test Site' })
        .expect(201);

      createdSiteIds.push(response.body.site_id);

      // Verify in database
      await connectDB();
      const site = await Site.findOne({ site_id: response.body.site_id });
      
      expect(site).not.toBeNull();
      expect(site!.name).toBe('Persistence Test Site');
      expect(site!.api_key).toBe(response.body.api_key);
    });

    test('should create API key with sufficient entropy', async () => {
      const response = await request(API_BASE)
        .post('/api/site/create')
        .send({ name: 'Entropy Test' })
        .expect(201);

      const apiKey = response.body.api_key;
      expect(apiKey).toMatch(/^[a-f0-9]{48}$/); // 24 bytes in hex
      
      createdSiteIds.push(response.body.site_id);
    });
  });
});
