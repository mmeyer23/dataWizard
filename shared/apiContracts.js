// @ts-check

export const QUERY_ENDPOINT = '/api/query';
export const QUERY_PLAN_ENDPOINT = '/api/query/plan';
export const QUERY_EXECUTE_ENDPOINT = '/api/query/execute';

export const ERROR_CODES = Object.freeze({
  internalServerError: 'INTERNAL_SERVER_ERROR',
  invalidRequestBody: 'INVALID_REQUEST_BODY',
  naturalLanguageQueryRequired: 'NATURAL_LANGUAGE_QUERY_REQUIRED',
  invalidNaturalLanguageQuery: 'INVALID_NATURAL_LANGUAGE_QUERY',
  postgreSqlUriRequired: 'POSTGRESQL_URI_REQUIRED',
  approvedSqlRequired: 'APPROVED_SQL_REQUIRED',
  executionConfirmationRequired: 'EXECUTION_CONFIRMATION_REQUIRED',
  invalidApiResponse: 'INVALID_API_RESPONSE',
});

/**
 * @typedef {object} QueryRequest
 * @property {string} postgreSqlUri
 * @property {string} naturalLanguageQuery
 *
 * @typedef {object} QueryPlanRequest
 * @property {string} [postgreSqlUri]
 * @property {string} naturalLanguageQuery
 *
 * @typedef {object} ExecuteQueryRequest
 * @property {string} postgreSqlUri
 * @property {string} approvedSql
 * @property {true} confirmed
 *
 * @typedef {object} QueryPlanResponse
 * @property {string} sql
 * @property {string[]} warnings
 * @property {DatasetPlanSummary} plan
 * @property {SqlValidationSummary} validation
 *
 * @typedef {object} QuerySuccessResponse
 * @property {string} sql
 * @property {unknown[]} rows
 * @property {number} rowCount
 * @property {string[]} warnings
 * @property {DatasetPlanSummary} [plan]
 * @property {SqlValidationSummary} validation
 *
 * @typedef {object} DatasetPlanSummary
 * @property {string} schemaName
 * @property {string} tableName
 * @property {Array<{name: string, type: string, nullable: boolean}>} columns
 * @property {Array<Array<string | number | boolean | null>>} rows
 * @property {string[]} assumptions
 * @property {string[]} warnings
 * @property {string} model
 * @property {string} promptVersion
 *
 * @typedef {object} SqlValidationSummary
 * @property {true} ok
 * @property {Array<{severity: string, code: string, message: string}>} findings
 * @property {{statementCount: number, tableCount: number, columnCount: number, rowCount: number}} summary
 *
 * @typedef {object} ApiError
 * @property {string} code
 * @property {string} message
 * @property {unknown} [details]
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
 * @param {unknown} body
 * @returns {{ ok: true, value: QueryPlanRequest } | { ok: false, error: ApiError }}
 */
export const parseQueryPlanRequest = (body) => {
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

  if (postgreSqlUri !== undefined && typeof postgreSqlUri !== 'string') {
    return invalidRequest(
      ERROR_CODES.invalidRequestBody,
      'The PostgreSQL connection URI must be a string when provided.'
    );
  }

  const normalizedUri = postgreSqlUri?.trim();

  return {
    ok: true,
    value: {
      naturalLanguageQuery: naturalLanguageQuery.trim(),
      ...(normalizedUri ? { postgreSqlUri: normalizedUri } : {}),
    },
  };
};

/**
 * @param {QueryPlanRequest} request
 * @returns {QueryPlanRequest}
 */
export const createQueryPlanRequest = (request) => {
  const postgreSqlUri = request.postgreSqlUri?.trim();

  return {
    naturalLanguageQuery: request.naturalLanguageQuery.trim(),
    ...(postgreSqlUri ? { postgreSqlUri } : {}),
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
 * @param {unknown} body
 * @returns {{ ok: true, value: ExecuteQueryRequest } | { ok: false, error: ApiError }}
 */
export const parseExecuteQueryRequest = (body) => {
  if (!body || typeof body !== 'object') {
    return invalidRequest(
      ERROR_CODES.invalidRequestBody,
      'The request body must be a JSON object.'
    );
  }

  const request = /** @type {Record<string, unknown>} */ (body);
  const postgreSqlUri = request.postgreSqlUri;
  const approvedSql = request.approvedSql;

  if (typeof postgreSqlUri !== 'string' || postgreSqlUri.trim().length === 0) {
    return invalidRequest(
      ERROR_CODES.postgreSqlUriRequired,
      'A PostgreSQL connection URI is required.'
    );
  }

  if (typeof approvedSql !== 'string' || approvedSql.trim().length === 0) {
    return invalidRequest(
      ERROR_CODES.approvedSqlRequired,
      'Approved SQL is required before execution.'
    );
  }

  if (request.confirmed !== true) {
    return invalidRequest(
      ERROR_CODES.executionConfirmationRequired,
      'Execution requires explicit confirmation.'
    );
  }

  return {
    ok: true,
    value: {
      postgreSqlUri: postgreSqlUri.trim(),
      approvedSql: approvedSql.trim(),
      confirmed: true,
    },
  };
};

/**
 * @param {ExecuteQueryRequest} request
 * @returns {ExecuteQueryRequest}
 */
export const createExecuteQueryRequest = (request) => ({
  postgreSqlUri: request.postgreSqlUri.trim(),
  approvedSql: request.approvedSql.trim(),
  confirmed: true,
});

/**
 * @param {object} value
 * @param {string} value.sql
 * @param {string[]} [value.warnings]
 * @param {DatasetPlanSummary} value.plan
 * @param {SqlValidationSummary} value.validation
 * @returns {QueryPlanResponse}
 */
export const createQueryPlanResponse = ({
  sql,
  warnings = [],
  plan,
  validation,
}) => ({
  sql,
  warnings,
  plan,
  validation,
});

/**
 * @param {object} value
 * @param {string} value.sql
 * @param {{ rows?: unknown[], rowCount?: number } | undefined} value.results
 * @param {string[]} [value.warnings]
 * @param {DatasetPlanSummary} value.plan
 * @param {SqlValidationSummary} value.validation
 * @returns {QuerySuccessResponse}
 */
export const createQuerySuccessResponse = ({
  sql,
  results,
  warnings = [],
  plan,
  validation,
}) => {
  const rows = results?.rows ?? [];

  return {
    sql,
    rows,
    rowCount: results?.rowCount ?? rows.length,
    warnings,
    ...(plan === undefined ? {} : { plan }),
    validation,
  };
};

/**
 * @param {unknown} value
 * @returns {value is QueryPlanResponse}
 */
export const isQueryPlanResponse = (value) => {
  if (!value || typeof value !== 'object') return false;

  const response = /** @type {Record<string, unknown>} */ (value);

  return (
    typeof response.sql === 'string' &&
    Array.isArray(response.warnings) &&
    response.warnings.every((warning) => typeof warning === 'string') &&
    isDatasetPlanSummary(response.plan) &&
    isSqlValidationSummary(response.validation)
  );
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
    response.warnings.every((warning) => typeof warning === 'string') &&
    (response.plan === undefined || isDatasetPlanSummary(response.plan)) &&
    isSqlValidationSummary(response.validation)
  );
};

/** @param {unknown} value */
const isSqlValidationSummary = (value) => {
  if (!value || typeof value !== 'object') return false;

  const validation = /** @type {Record<string, unknown>} */ (value);
  return (
    validation.ok === true &&
    Array.isArray(validation.findings) &&
    Boolean(validation.summary) &&
    typeof validation.summary === 'object'
  );
};

/** @param {unknown} value */
const isDatasetPlanSummary = (value) => {
  if (!value || typeof value !== 'object') return false;

  const plan = /** @type {Record<string, unknown>} */ (value);
  return (
    typeof plan.schemaName === 'string' &&
    typeof plan.tableName === 'string' &&
    Array.isArray(plan.columns) &&
    Array.isArray(plan.rows) &&
    Array.isArray(plan.assumptions) &&
    Array.isArray(plan.warnings) &&
    typeof plan.model === 'string' &&
    typeof plan.promptVersion === 'string'
  );
};

/**
 * @param {string} code
 * @param {string} message
 * @param {unknown} [details]
 * @returns {ApiErrorResponse}
 */
export const createApiErrorResponse = (code, message, details) => ({
  error: {
    code,
    message,
    ...(details === undefined ? {} : { details }),
  },
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
