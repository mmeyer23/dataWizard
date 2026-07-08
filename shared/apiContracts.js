// @ts-check

export const QUERY_ENDPOINT = '/api/query';

export const ERROR_CODES = Object.freeze({
  internalServerError: 'INTERNAL_SERVER_ERROR',
  invalidRequestBody: 'INVALID_REQUEST_BODY',
  naturalLanguageQueryRequired: 'NATURAL_LANGUAGE_QUERY_REQUIRED',
  invalidNaturalLanguageQuery: 'INVALID_NATURAL_LANGUAGE_QUERY',
  postgreSqlUriRequired: 'POSTGRESQL_URI_REQUIRED',
  invalidApiResponse: 'INVALID_API_RESPONSE',
});

/**
 * @typedef {object} QueryRequest
 * @property {string} postgreSqlUri
 * @property {string} naturalLanguageQuery
 *
 * @typedef {object} QuerySuccessResponse
 * @property {string} sql
 * @property {unknown[]} rows
 * @property {number} rowCount
 * @property {string[]} warnings
 *
 * @typedef {object} ApiError
 * @property {string} code
 * @property {string} message
 *
 * @typedef {{ error: ApiError }} ApiErrorResponse
 */

/**
 * @param {unknown} body
 * @returns {{ ok: true, value: QueryRequest } | { ok: false, error: ApiError }}
 */
export const parseQueryRequest = (body) => {
  if (!body || typeof body !== 'object') {
    return invalidRequest(
      ERROR_CODES.invalidRequestBody,
      'The request body must be a JSON object.'
    );
  }

  const request = /** @type {Record<string, unknown>} */ (body);
  const naturalLanguageQuery = request.naturalLanguageQuery;
  const postgreSqlUri = request.postgreSqlUri;

  if (typeof naturalLanguageQuery !== 'string') {
    return invalidRequest(
      ERROR_CODES.invalidNaturalLanguageQuery,
      'The natural-language query must be a string.'
    );
  }

  if (naturalLanguageQuery.trim().length === 0) {
    return invalidRequest(
      ERROR_CODES.naturalLanguageQueryRequired,
      'A natural-language query is required.'
    );
  }

  if (typeof postgreSqlUri !== 'string' || postgreSqlUri.trim().length === 0) {
    return invalidRequest(
      ERROR_CODES.postgreSqlUriRequired,
      'A PostgreSQL connection URI is required.'
    );
  }

  return {
    ok: true,
    value: {
      postgreSqlUri: postgreSqlUri.trim(),
      naturalLanguageQuery: naturalLanguageQuery.trim(),
    },
  };
};

/**
 * @param {QueryRequest} request
 * @returns {QueryRequest}
 */
export const createQueryRequest = (request) => ({
  postgreSqlUri: request.postgreSqlUri.trim(),
  naturalLanguageQuery: request.naturalLanguageQuery.trim(),
});

/**
 * @param {object} value
 * @param {string} value.sql
 * @param {{ rows?: unknown[], rowCount?: number } | undefined} value.results
 * @param {string[]} [value.warnings]
 * @returns {QuerySuccessResponse}
 */
export const createQuerySuccessResponse = ({
  sql,
  results,
  warnings = [],
}) => {
  const rows = results?.rows ?? [];

  return {
    sql,
    rows,
    rowCount: results?.rowCount ?? rows.length,
    warnings,
  };
};

/**
 * @param {unknown} value
 * @returns {value is QuerySuccessResponse}
 */
export const isQuerySuccessResponse = (value) => {
  if (!value || typeof value !== 'object') return false;

  const response = /** @type {Record<string, unknown>} */ (value);

  return (
    typeof response.sql === 'string' &&
    Array.isArray(response.rows) &&
    Number.isInteger(response.rowCount) &&
    Array.isArray(response.warnings) &&
    response.warnings.every((warning) => typeof warning === 'string')
  );
};

/**
 * @param {string} code
 * @param {string} message
 * @returns {ApiErrorResponse}
 */
export const createApiErrorResponse = (code, message) => ({
  error: { code, message },
});

/**
 * @param {unknown} value
 * @param {string} fallback
 * @returns {string}
 */
export const getApiErrorMessage = (value, fallback) => {
  if (!value || typeof value !== 'object') return fallback;

  const response = /** @type {Record<string, unknown>} */ (value);
  if (!response.error || typeof response.error !== 'object') return fallback;

  const error = /** @type {Record<string, unknown>} */ (response.error);
  return typeof error.message === 'string' ? error.message : fallback;
};

/**
 * @param {string} code
 * @param {string} message
 * @returns {{ ok: false, error: ApiError }}
 */
const invalidRequest = (code, message) => ({
  ok: false,
  error: { code, message },
});
