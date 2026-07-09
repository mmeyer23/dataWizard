// @ts-check

const DEFAULT_PORT = 3000;
const DEFAULT_JSON_BODY_LIMIT = '100kb';
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 60;
const DEFAULT_SHUTDOWN_GRACE_MS = 10_000;
const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:8080', 'http://127.0.0.1:8080'];

/**
 * @typedef {object} AppConfig
 * @property {string} openAiApiKey
 * @property {number} port
 * @property {string[]} allowedOrigins
 * @property {string} jsonBodyLimit
 * @property {number} rateLimitWindowMs
 * @property {number} rateLimitMaxRequests
 * @property {number} shutdownGraceMs
 */

/**
 * @param {Record<string, string | undefined>} env
 * @returns {AppConfig}
 */
export const loadConfig = (env) => {
  const openAiApiKey = env.OPENAI_API_KEY?.trim();
  if (!openAiApiKey) {
    throw new Error('OPENAI_API_KEY is required.');
  }

  const port = parsePort(env.PORT);

  return Object.freeze({
    openAiApiKey,
    port,
    allowedOrigins: parseAllowedOrigins(env.CORS_ALLOWED_ORIGINS),
    jsonBodyLimit: env.JSON_BODY_LIMIT?.trim() || DEFAULT_JSON_BODY_LIMIT,
    rateLimitWindowMs: parsePositiveInteger(
      env.RATE_LIMIT_WINDOW_MS,
      DEFAULT_RATE_LIMIT_WINDOW_MS,
      'RATE_LIMIT_WINDOW_MS'
    ),
    rateLimitMaxRequests: parsePositiveInteger(
      env.RATE_LIMIT_MAX_REQUESTS,
      DEFAULT_RATE_LIMIT_MAX_REQUESTS,
      'RATE_LIMIT_MAX_REQUESTS'
    ),
    shutdownGraceMs: parsePositiveInteger(
      env.SHUTDOWN_GRACE_MS,
      DEFAULT_SHUTDOWN_GRACE_MS,
      'SHUTDOWN_GRACE_MS'
    ),
  });
};

/**
 * @param {string | undefined} value
 * @returns {number}
 */
const parsePort = (value) => {
  if (value === undefined || value.trim() === '') return DEFAULT_PORT;

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  return port;
};

/**
 * @param {string | undefined} value
 * @returns {string[]}
 */
const parseAllowedOrigins = (value) => {
  if (value === undefined || value.trim() === '') return DEFAULT_ALLOWED_ORIGINS;

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

/**
 * @param {string | undefined} value
 * @param {number} fallback
 * @param {string} field
 * @returns {number}
 */
const parsePositiveInteger = (value, fallback, field) => {
  if (value === undefined || value.trim() === '') return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${field} must be a positive integer.`);
  }

  return parsed;
};
