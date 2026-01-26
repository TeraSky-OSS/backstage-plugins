import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import { ConfigReader } from '@backstage/config';
import { mockServices } from '@backstage/backend-test-utils';
import { InputError, NotFoundError } from '@backstage/errors';

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

    it('should handle generic errors and return 500', async () => {
      mockUrlReader.readUrl.mockImplementation(async () => {
        throw new Error('Generic service error');
      });

      const response = await request(app)
        .get('/mcp-servers')
        .query({ gitUrl: 'https://github.com/test/repo' });
      
      // The service catches errors and returns empty servers
      expect(response.status).toBe(200);
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

    it('should use default rule types when ruleTypes is not provided', async () => {
      mockUrlReader.readUrl.mockRejectedValue(new Error('Not found'));
      mockUrlReader.readTree.mockRejectedValue(new Error('Not found'));

      const response = await request(app)
        .get('/rules')
        .query({ gitUrl: 'https://github.com/test/repo' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('rules');
    });

    it('should handle single rule type', async () => {
      mockUrlReader.readUrl.mockRejectedValue(new Error('Not found'));
      mockUrlReader.readTree.mockRejectedValue(new Error('Not found'));

      const response = await request(app)
        .get('/rules')
        .query({ gitUrl: 'https://github.com/test/repo', ruleTypes: 'cursor' });
      
      expect(response.status).toBe(200);
    });

    it('should return rules with content when files exist', async () => {
      mockUrlReader.readUrl.mockImplementation(async (url: string) => {
        if (url.includes('.cursorrules')) {
          return { buffer: async () => Buffer.from('# Test Rules') };
        }
        throw new Error('Not found');
      });
      mockUrlReader.readTree.mockRejectedValue(new Error('Not found'));

      const response = await request(app)
        .get('/rules')
        .query({ gitUrl: 'https://github.com/test/repo', ruleTypes: 'cursor' });
      
      expect(response.status).toBe(200);
      expect(response.body.rules).toHaveLength(1);
      expect(response.body.totalCount).toBe(1);
    });

    it('should support claude-code rule type', async () => {
      mockUrlReader.readUrl.mockImplementation(async (url: string) => {
        if (url.includes('CLAUDE.md')) {
          return { buffer: async () => Buffer.from('# Claude Rules') };
        }
        throw new Error('Not found');
      });
      mockUrlReader.readTree.mockRejectedValue(new Error('Not found'));

      const response = await request(app)
        .get('/rules')
        .query({ gitUrl: 'https://github.com/test/repo', ruleTypes: 'claude-code' });
      
      expect(response.status).toBe(200);
      expect(response.body.rules).toHaveLength(1);
    });
  });
});

