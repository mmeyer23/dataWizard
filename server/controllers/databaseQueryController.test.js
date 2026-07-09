import { populateDatabase } from './databaseQueryController';
import { executeValidatedSql } from '../database/postgresExecution.js';

jest.mock('../database/postgresExecution.js');

describe('populateDatabase Controller', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    executeValidatedSql.mockResolvedValue({ rows: [] });

    mockReq = {
      body: {
        postgreSqlUri: 'postgres://mock:mockpassword@localhost/postgres',
      },
    };
    mockRes = {
      locals: {
        sqlValidation: {
          ok: true,
          summary: { schemaName: 'test_db', tableName: 'tests' },
        },
        databaseQuery: [
          `CREATE SCHEMA IF NOT EXISTS test_db;

        CREATE TABLE IF NOT EXISTS test_db.tests (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255),
          year INT,
          genre VARCHAR(100),
          director VARCHAR(255)
        );

        INSERT INTO test_db.tests (title, year, genre, director)
        VALUES
          ('Test1', 2010, 'Sci-Fi', 'Christopher Nolan'),
          ('Test2', 1999, 'Action', 'The Wachowskis'),
          ('Test3', 2008, 'Action', 'Christopher Nolan')
        RETURNING *;`,
        ],
      },
    };
    mockNext = jest.fn();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 error if there is nothing in req.body.postreSqlUri', async () => {
    mockReq.body.postgreSqlUri = null;
    await populateDatabase(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'POSTGRESQL_URI_REQUIRED',
        status: 400,
      })
    );
  });

  it('should return 400 error if res.locals does not contain databaseQuery', async () => {
    mockRes.locals.databaseQuery = null;
    await populateDatabase(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'GENERATED_SQL_UNAVAILABLE',
        status: 500,
      })
    );
  });

  it('should refuse execution without SQL policy approval', async () => {
    mockRes.locals.sqlValidation = null;
    await populateDatabase(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'SQL_VALIDATION_REQUIRED',
        status: 500,
      })
    );
    expect(executeValidatedSql).not.toHaveBeenCalled();
  });
  it('should handle errors coming from the database query', async () => {
    const error = new Error('The database query could not be completed.');
    error.code = 'DATABASE_QUERY_FAILED';
    error.status = 500;
    error.safeMessage = 'The database query could not be completed.';
    error.safeLog = 'databaseExecution: DATABASE_QUERY_FAILED';
    executeValidatedSql.mockRejectedValueOnce(error);

    await populateDatabase(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'DATABASE_QUERY_FAILED',
        status: 500,
      })
    );
  });
  it('should execute the approved SQL with the provided connection string', async () => {
    await populateDatabase(mockReq, mockRes, mockNext);
    expect(executeValidatedSql).toHaveBeenCalledWith({
      connectionString: 'postgres://mock:mockpassword@localhost/postgres',
      sql: expect.stringContaining('CREATE SCHEMA IF NOT EXISTS test_db'),
      sqlValidation: mockRes.locals.sqlValidation,
    });
  });
  it('should call next with results when successful', async () => {
    executeValidatedSql.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          title: 'Test1',
          year: 2010,
          genre: 'Sci-Fi',
          director: 'Christopher Nolan',
        },
      ],
    });
    await populateDatabase(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
    expect(mockRes.locals.results).toEqual({
      rows: [
        {
          id: 1,
          title: 'Test1',
          year: 2010,
          genre: 'Sci-Fi',
          director: 'Christopher Nolan',
        },
      ],
    });
  });
});
