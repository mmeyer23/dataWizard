import {
  createApiErrorResponse,
  createQueryRequest,
  createQuerySuccessResponse,
  getApiErrorMessage,
  isQuerySuccessResponse,
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

describe('API response contract', () => {
  it('creates and recognizes a success response', () => {
    const response = createQuerySuccessResponse({
      sql: 'INSERT INTO tests DEFAULT VALUES;',
      results: { rows: [{ id: 1 }] },
    });

    expect(response.rowCount).toBe(1);
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
