import {
  createApiErrorResponse,
  createExecuteQueryRequest,
  createQueryPlanResponse,
  createQueryRequest,
  createQuerySuccessResponse,
  getApiErrorMessage,
  isQueryPlanResponse,
  isQuerySuccessResponse,
  parseExecuteQueryRequest,
  parseQueryRequest,
} from './apiContracts.js';

describe('query request contract', () => {
  it('parses and normalizes a valid request', () => {
    expect(
      parseQueryRequest({
        postgreSqlUri: ' postgres://localhost/test ',
        naturalLanguageQuery: ' Create one row ',
      })
    ).toEqual({
      ok: true,
      value: {
        postgreSqlUri: 'postgres://localhost/test',
        naturalLanguageQuery: 'Create one row',
      },
    });
  });

  it.each([
    [undefined, 'INVALID_REQUEST_BODY'],
    [{ naturalLanguageQuery: 12 }, 'INVALID_NATURAL_LANGUAGE_QUERY'],
    [{ naturalLanguageQuery: ' ' }, 'NATURAL_LANGUAGE_QUERY_REQUIRED'],
    [{ naturalLanguageQuery: 'Create one row' }, 'POSTGRESQL_URI_REQUIRED'],
  ])('rejects invalid input %#', (input, code) => {
    expect(parseQueryRequest(input)).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code }),
      })
    );
  });

  it('creates a normalized client request', () => {
    expect(
      createQueryRequest({
        postgreSqlUri: ' postgres://localhost/test ',
        naturalLanguageQuery: ' Create one row ',
      })
    ).toEqual({
      postgreSqlUri: 'postgres://localhost/test',
      naturalLanguageQuery: 'Create one row',
    });
  });
});

describe('execute query request contract', () => {
  it('parses and normalizes a confirmed execute request', () => {
    expect(
      parseExecuteQueryRequest({
        postgreSqlUri: ' postgres://localhost/test ',
        approvedSql: ' SELECT 1; ',
        confirmed: true,
      })
    ).toEqual({
      ok: true,
      value: {
        postgreSqlUri: 'postgres://localhost/test',
        approvedSql: 'SELECT 1;',
        confirmed: true,
      },
    });
  });

  it.each([
    [undefined, 'INVALID_REQUEST_BODY'],
    [{ approvedSql: 'SELECT 1;', confirmed: true }, 'POSTGRESQL_URI_REQUIRED'],
    [
      { postgreSqlUri: 'postgres://localhost/test', confirmed: true },
      'APPROVED_SQL_REQUIRED',
    ],
    [
      {
        postgreSqlUri: 'postgres://localhost/test',
        approvedSql: 'SELECT 1;',
      },
      'EXECUTION_CONFIRMATION_REQUIRED',
    ],
  ])('rejects invalid execute input %#', (input, code) => {
    expect(parseExecuteQueryRequest(input)).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code }),
      })
    );
  });

  it('creates a normalized execute request', () => {
    expect(
      createExecuteQueryRequest({
        postgreSqlUri: ' postgres://localhost/test ',
        approvedSql: ' SELECT 1; ',
        confirmed: true,
      })
    ).toEqual({
      postgreSqlUri: 'postgres://localhost/test',
      approvedSql: 'SELECT 1;',
      confirmed: true,
    });
  });
});

describe('API response contract', () => {
  const plan = {
    schemaName: 'test_data',
    tableName: 'tests',
    columns: [{ name: 'name', type: 'text', nullable: false }],
    rows: [['Ada']],
    assumptions: [],
    warnings: [],
    model: 'test-model',
    promptVersion: 'test-prompt',
  };
  const validation = {
    ok: true,
    findings: [],
    summary: {
      statementCount: 3,
      tableCount: 1,
      columnCount: 1,
      rowCount: 1,
    },
  };

  it('creates and recognizes a plan response', () => {
    const response = createQueryPlanResponse({
      sql: 'CREATE SCHEMA IF NOT EXISTS test_data;',
      plan,
      validation,
    });

    expect(response.plan).toBe(plan);
    expect(isQueryPlanResponse(response)).toBe(true);
  });

  it('creates and recognizes a success response', () => {
    const response = createQuerySuccessResponse({
      sql: 'INSERT INTO tests DEFAULT VALUES;',
      results: { rows: [{ id: 1 }] },
      plan,
      validation,
    });

    expect(response.rowCount).toBe(1);
    expect(response.plan).toBe(plan);
    expect(isQuerySuccessResponse(response)).toBe(true);
  });

  it('rejects malformed success responses', () => {
    expect(isQuerySuccessResponse({ rows: [] })).toBe(false);
  });

  it('creates and reads an error response', () => {
    const response = createApiErrorResponse('TEST_ERROR', 'Test failed.');

    expect(getApiErrorMessage(response, 'Fallback')).toBe('Test failed.');
    expect(getApiErrorMessage({}, 'Fallback')).toBe('Fallback');
  });
});
