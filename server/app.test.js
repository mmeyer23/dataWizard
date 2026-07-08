import app from './app.js';
import request from 'supertest';

const mockQuery = `CREATE SCHEMA IF NOT EXISTS movie_db;

CREATE TABLE IF NOT EXISTS movie_db.movies (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  year INT,
  genre VARCHAR(100),
  director VARCHAR(255)
);

INSERT INTO movie_db.movies (title, year, genre, director)
VALUES
  ('Inception', 2010, 'Sci-Fi', 'Christopher Nolan'),
  ('The Matrix', 1999, 'Action', 'The Wachowskis'),
  ('The Dark Knight', 2008, 'Action', 'Christopher Nolan')
RETURNING *;`;

jest.mock('./controllers/naturalLanguageController', () => ({
  parseNaturalLanguageQuery: jest.fn((req, res, next) => {
    res.locals.naturalLanguageQuery = req.body.naturalLanguageQuery;
    next();
  }),
}));

jest.mock('./controllers/openaiController', () => ({
  queryOpenai: jest.fn((req, res, next) => {
    const mockCompletion = {
      choices: [
        {
          message: {
            content: mockQuery,
          },
        },
      ],
    };
    res.locals.aiQueryString = mockCompletion.choices[0].message.content;
    res.locals.databaseQuery = [mockCompletion.choices[0].message.content];
    next();
  }),
}));

jest.mock('./controllers/databaseQueryController', () => ({
  populateDatabase: jest.fn((req, res, next) => {
    res.locals.results = {
      rowCount: 1,
      rows: [
        {
          id: 1,
          title: 'Test1',
          year: 2010,
          genre: 'Sci-Fi',
          director: 'Christopher Nolan',
        },
      ],
    };
    next();
  }),
}));

describe('POST /api/query', () => {
  it('should return 200 and the expected response', async () => {
    const response = await request(app)
      .post('/api/query')
      .send(
        JSON.stringify({
          naturalLanguageQuery:
            'I would like a table of different pizzas with topping combinations and prices.  I want 10 rows.',
          postgreSqlUri: 'postgres://user:password@localhost:5432/mydb',
        })
      )
      .set('Content-Type', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      sql: mockQuery,
      rows: [
        {
          id: 1,
          title: 'Test1',
          year: 2010,
          genre: 'Sci-Fi',
          director: 'Christopher Nolan',
        },
      ],
      rowCount: 1,
      warnings: [],
    });
  });

  it('returns a consistent error when the PostgreSQL URI is missing', async () => {
    const response = await request(app).post('/api/query').send({
      naturalLanguageQuery: 'Create a table of movies',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'POSTGRESQL_URI_REQUIRED',
        message: 'A PostgreSQL connection URI is required.',
      },
    });
  });

  it('rejects unsupported methods on the query endpoint', async () => {
    const response = await request(app).get('/api/query');

    expect(response.status).toBe(404);
  });
});
describe('404 route', () => {
  it('should return a 404 error and "Page Not Found" for ummatched routes', async () => {
    const response = await request(app).get('/other-route');
    expect(response.status).toBe(404);
    expect(response.text).toBe('Page not found');
  });
});
