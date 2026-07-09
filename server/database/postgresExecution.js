import pg from 'pg';

const { Client: PgClient } = pg;

export const DEFAULT_POSTGRES_EXECUTION_OPTIONS = Object.freeze({
  applicationName: 'data-wizard',
  connectionTimeoutMillis: 5000,
  statementTimeoutMillis: 10000,
  lockTimeoutMillis: 5000,
  transactionTimeoutMillis: 15000,
});

const POSTGRES_PROTOCOLS = new Set(['postgres:', 'postgresql:']);

/**
 * @param {object} params
 * @param {string} params.connectionString
 * @param {string} params.sql
 * @param {object} params.sqlValidation
 * @param {typeof PgClient} [params.Client]
 * @param {Partial<typeof DEFAULT_POSTGRES_EXECUTION_OPTIONS>} [params.options]
 * @returns {Promise<object>}
 */
export const executeValidatedSql = async ({
  connectionString,
  sql,
  sqlValidation,
  Client = PgClient,
  options = {},
}) => {
  const validatedConnection = validatePostgreSqlUri(connectionString);
  if (!validatedConnection.ok) {
    throw createDatabaseExecutionError({
      code: 'POSTGRESQL_URI_INVALID',
      status: 400,
      safeMessage: 'The PostgreSQL connection URI is invalid.',
      cause: validatedConnection.error,
    });
  }

  if (typeof sql !== 'string' || sql.trim().length === 0) {
    throw createDatabaseExecutionError({
      code: 'GENERATED_SQL_UNAVAILABLE',
      safeMessage: 'No generated SQL was available for execution.',
    });
  }

  if (sqlValidation?.ok !== true) {
    throw createDatabaseExecutionError({
      code: 'SQL_VALIDATION_REQUIRED',
      safeMessage: 'SQL policy approval is required before execution.',
    });
  }

  const schemaName = sqlValidation.summary?.schemaName;
  if (!isSafeIdentifier(schemaName)) {
    throw createDatabaseExecutionError({
      code: 'SQL_VALIDATION_REQUIRED',
      safeMessage: 'SQL policy approval is required before execution.',
      cause: new Error('Approved SQL did not include a safe target schema.'),
    });
  }

  const executionOptions = normalizeExecutionOptions(options);
  const client = new Client({
    connectionString: validatedConnection.connectionString,
    application_name: executionOptions.applicationName,
    connectionTimeoutMillis: executionOptions.connectionTimeoutMillis,
    query_timeout: executionOptions.statementTimeoutMillis,
    statement_timeout: executionOptions.statementTimeoutMillis,
    lock_timeout: executionOptions.lockTimeoutMillis,
    options: buildServerOptions(executionOptions),
  });

  let connected = false;
  let transactionStarted = false;

  try {
    await withTimeout(
      client.connect(),
      executionOptions.connectionTimeoutMillis,
      'DATABASE_CONNECTION_TIMEOUT',
      'PostgreSQL connection timed out.'
    );
    connected = true;

    await runBoundedQuery(client, 'BEGIN', executionOptions);
    transactionStarted = true;

    await runBoundedQuery(
      client,
      `SET LOCAL search_path TO ${quoteIdentifier(schemaName)}, pg_temp`,
      executionOptions
    );
    await runBoundedQuery(
      client,
      `SET LOCAL statement_timeout = ${toPostgresIntegerLiteral(
        executionOptions.statementTimeoutMillis
      )}`,
      executionOptions
    );
    await runBoundedQuery(
      client,
      `SET LOCAL lock_timeout = ${toPostgresIntegerLiteral(
        executionOptions.lockTimeoutMillis
      )}`,
      executionOptions
    );
    await runBoundedQuery(
      client,
      `SET LOCAL idle_in_transaction_session_timeout = ${toPostgresIntegerLiteral(
        executionOptions.transactionTimeoutMillis
      )}`,
      executionOptions
    );

    const results = await withTimeout(
      runBoundedQuery(client, sql, executionOptions),
      executionOptions.transactionTimeoutMillis,
      'DATABASE_TRANSACTION_TIMEOUT',
      'PostgreSQL transaction timed out.'
    );
    await runBoundedQuery(client, 'COMMIT', executionOptions);
    transactionStarted = false;

    return results;
  } catch (error) {
    if (transactionStarted) {
      try {
        await runBoundedQuery(client, 'ROLLBACK', executionOptions);
      } catch (rollbackError) {
        throw createDatabaseExecutionError({
          code: normalizeDatabaseErrorCode(error),
          safeMessage: 'The database query could not be completed.',
          cause: error,
          cleanupError: rollbackError,
        });
      }
    }

    throw createDatabaseExecutionError({
      code: normalizeDatabaseErrorCode(error),
      safeMessage: 'The database query could not be completed.',
      cause: error,
    });
  } finally {
    if (connected) {
      await endClient(client);
    }
  }
};

/**
 * @param {string | undefined} connectionString
 * @returns {{ ok: true, connectionString: string } | { ok: false, error: Error }}
 */
export const validatePostgreSqlUri = (connectionString) => {
  if (typeof connectionString !== 'string' || connectionString.trim() === '') {
    return {
      ok: false,
      error: new Error('PostgreSQL URI is required.'),
    };
  }

  const trimmedConnectionString = connectionString.trim();

  try {
    const url = new URL(trimmedConnectionString);
    if (!POSTGRES_PROTOCOLS.has(url.protocol)) {
      return {
        ok: false,
        error: new Error('PostgreSQL URI must use postgres:// or postgresql://.'),
      };
    }

    if (!url.hostname || url.pathname === '/' || url.pathname.length === 0) {
      return {
        ok: false,
        error: new Error('PostgreSQL URI must include a host and database name.'),
      };
    }

    return { ok: true, connectionString: trimmedConnectionString };
  } catch {
    return {
      ok: false,
      error: new Error('PostgreSQL URI could not be parsed.'),
    };
  }
};

/**
 * @param {unknown} value
 * @returns {string}
 */
export const redactSensitiveText = (value) => {
  if (typeof value !== 'string') return '';

  return value
    .replace(/postgres(?:ql)?:\/\/[^\s'")]+/gi, 'postgres://[redacted]')
    .replace(/password=[^&\s'")]+/gi, 'password=[redacted]');
};

const runBoundedQuery = (client, text, executionOptions) =>
  withTimeout(
    client.query(text),
    executionOptions.statementTimeoutMillis,
    'DATABASE_STATEMENT_TIMEOUT',
    'PostgreSQL statement timed out.'
  );

const endClient = async (client) => {
  try {
    await client.end();
  } catch {
    // The request has already completed or failed. Swallow cleanup errors so
    // they do not leak credential-bearing driver messages or mask the original
    // operation result.
  }
};

const withTimeout = (promise, timeoutMillis, code, message) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(message);
      error.code = code;
      reject(error);
    }, timeoutMillis);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
};

const normalizeExecutionOptions = (options) => {
  const normalized = {
    ...DEFAULT_POSTGRES_EXECUTION_OPTIONS,
    ...options,
  };

  return Object.freeze({
    applicationName: String(normalized.applicationName).slice(0, 63),
    connectionTimeoutMillis: parsePositiveInteger(
      normalized.connectionTimeoutMillis,
      DEFAULT_POSTGRES_EXECUTION_OPTIONS.connectionTimeoutMillis
    ),
    statementTimeoutMillis: parsePositiveInteger(
      normalized.statementTimeoutMillis,
      DEFAULT_POSTGRES_EXECUTION_OPTIONS.statementTimeoutMillis
    ),
    lockTimeoutMillis: parsePositiveInteger(
      normalized.lockTimeoutMillis,
      DEFAULT_POSTGRES_EXECUTION_OPTIONS.lockTimeoutMillis
    ),
    transactionTimeoutMillis: parsePositiveInteger(
      normalized.transactionTimeoutMillis,
      DEFAULT_POSTGRES_EXECUTION_OPTIONS.transactionTimeoutMillis
    ),
  });
};

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const buildServerOptions = ({
  statementTimeoutMillis,
  lockTimeoutMillis,
  transactionTimeoutMillis,
}) =>
  [
    `-c statement_timeout=${toPostgresIntegerLiteral(statementTimeoutMillis)}`,
    `-c lock_timeout=${toPostgresIntegerLiteral(lockTimeoutMillis)}`,
    `-c idle_in_transaction_session_timeout=${toPostgresIntegerLiteral(
      transactionTimeoutMillis
    )}`,
  ].join(' ');

const normalizeDatabaseErrorCode = (error) =>
  error?.code === 'DATABASE_CONNECTION_TIMEOUT' ||
  error?.code === 'DATABASE_STATEMENT_TIMEOUT' ||
  error?.code === 'DATABASE_TRANSACTION_TIMEOUT'
    ? error.code
    : 'DATABASE_QUERY_FAILED';

const createDatabaseExecutionError = ({
  code,
  status = 500,
  safeMessage,
  cause,
  cleanupError,
}) => {
  const error = new Error(safeMessage);
  error.code = code;
  error.status = status;
  error.safeMessage = safeMessage;
  error.cause = cause;
  error.cleanupError = cleanupError;
  error.safeLog = buildSafeLog(code, cause, cleanupError);
  return error;
};

const buildSafeLog = (code, cause, cleanupError) => {
  const causeMessage = redactSensitiveText(cause?.message);
  const cleanupMessage = redactSensitiveText(cleanupError?.message);
  const parts = [`databaseExecution: ${code}`];

  if (causeMessage) parts.push(`cause=${causeMessage}`);
  if (cleanupMessage) parts.push(`cleanup=${cleanupMessage}`);

  return parts.join('; ');
};

const isSafeIdentifier = (value) =>
  typeof value === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);

const quoteIdentifier = (identifier) =>
  `"${identifier.replaceAll('"', '""')}"`;

const toPostgresIntegerLiteral = (value) =>
  String(parsePositiveInteger(value, 1));
