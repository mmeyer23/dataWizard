import request from 'supertest';
import { createApp } from './app.js';

const mockQuery = 'INSERT INTO tests DEFAULT VALUES RETURNING *;';
const mockRows = [{ id: 1 }];

const queryOpenai = (_req, res, next) => {
  res.locals.databaseQuery = [mockQuery];
  next();
};

const populateDatabase = (_req, res, next) => {
  res.locals.results = { rows: mockRows, rowCount: 1 };
  next();
};

const app = createApp({ queryOpenai, populateDatabase });

describe('createApp', () => {
  it('requires both external middleware dependencies', () => {
    expect(() => createApp({})).toThrow(
      'createApp requires queryOpenai and populateDatabase middleware.'
    );
  });
});

describe('POST /api/query', () => {
  it('returns the stable success contract', async () => {
    const response = await request(app).post('/api/query').send({
      naturalLanguageQuery: 'Create one test row',
      postgreSqlUri: 'postgres://localhost/test',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      sql: mockQuery,
      rows: mockRows,
      rowCount: 1,
      warnings: [],
    });
  });

  it('validates requests before invoking external middleware', async () => {
    const queryOpenaiSpy = jest.fn(queryOpenai);
    const databaseSpy = jest.fn(populateDatabase);
    const validationApp = createApp({
      queryOpenai: queryOpenaiSpy,
      populateDatabase: databaseSpy,
    });

    const response = await request(validationApp).post('/api/query').send({
      naturalLanguageQuery: 'Create one test row',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('POSTGRESQL_URI_REQUIRED');
    expect(queryOpenaiSpy).not.toHaveBeenCalled();
    expect(databaseSpy).not.toHaveBeenCalled();
  });

  it('rejects unsupported methods', async () => {
    const response = await request(app).get('/api/query');

    expect(response.status).toBe(404);
  });
});

describe('application routes', () => {
  it('reports health without invoking external dependencies', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('returns 404 for unmatched routes', async () => {
    const response = await request(app).get('/other-route');

    expect(response.status).toBe(404);
    expect(response.text).toBe('Page not found');
  });
});
