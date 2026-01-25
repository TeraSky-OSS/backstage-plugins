import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import { ConfigReader } from '@backstage/config';
import { mockServices } from '@backstage/backend-test-utils';

describe('createRouter', () => {
  let app: express.Express;
  const mockUrlReader = {
    readUrl: jest.fn(),
    readTree: jest.fn(),
    search: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const config = new ConfigReader({});
    const logger = mockServices.logger.mock();
    const discovery = mockServices.discovery.mock();

    const router = await createRouter({
      logger,
      config,
      discovery,
      urlReader: mockUrlReader as any,
    });

    app = express();
    app.use(router);
  });

  describe('GET /health', () => {
    it('should return ok status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /mcp-servers', () => {
    it('should return 400 when gitUrl is missing', async () => {
      const response = await request(app).get('/mcp-servers');
      
      expect(response.status).toBe(400);
    });

    it('should return servers when gitUrl is provided', async () => {
      mockUrlReader.readUrl.mockRejectedValue(new Error('Not found'));

      const response = await request(app)
        .get('/mcp-servers')
        .query({ gitUrl: 'https://github.com/test/repo' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('servers');
    });
  });

  describe('GET /rules', () => {
    it('should return 400 when gitUrl is missing', async () => {
      const response = await request(app).get('/rules');
      
      expect(response.status).toBe(400);
    });

    it('should return rules when gitUrl is provided', async () => {
      mockUrlReader.readUrl.mockRejectedValue(new Error('Not found'));
      mockUrlReader.readTree.mockRejectedValue(new Error('Not found'));

      const response = await request(app)
        .get('/rules')
        .query({ gitUrl: 'https://github.com/test/repo' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('rules');
      expect(response.body).toHaveProperty('totalCount');
      expect(response.body).toHaveProperty('ruleTypes');
    });

    it('should support ruleTypes parameter', async () => {
      mockUrlReader.readUrl.mockRejectedValue(new Error('Not found'));
      mockUrlReader.readTree.mockRejectedValue(new Error('Not found'));

      const response = await request(app)
        .get('/rules')
        .query({ gitUrl: 'https://github.com/test/repo', ruleTypes: 'cursor,copilot' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('rules');
    });
  });
});

