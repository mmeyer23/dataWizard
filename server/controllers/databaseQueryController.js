import { executeValidatedSql } from '../database/postgresExecution.js';

export const populateDatabase = async (req, res, next) => {
  const pgUri = req.body.postgreSqlUri;
  if (!pgUri) {
    return next({
      log: 'populateDatabase: PostgreSQL URI not provided',
      status: 400,
      code: 'POSTGRESQL_URI_REQUIRED',
      message: { err: 'A PostgreSQL connection URI is required.' },
    });
  }
  const { databaseQuery } = res.locals;
  if (!databaseQuery) {
    return next({
      log: 'populateDatabase: Generated SQL not available',
      status: 500,
      code: 'GENERATED_SQL_UNAVAILABLE',
      message: { err: 'No generated SQL was available for execution.' },
    });
  }

  if (res.locals.sqlValidation?.ok !== true) {
    return next({
      log: 'populateDatabase: SQL policy approval not available',
      status: 500,
      code: 'SQL_VALIDATION_REQUIRED',
      message: { err: 'SQL policy approval is required before execution.' },
    });
  }

  try {
    const results = await executeValidatedSql({
      connectionString: pgUri,
      sql: databaseQuery[0],
      sqlValidation: res.locals.sqlValidation,
    });
    res.locals.results = results;
    return next();
  } catch (error) {
    return next({
      log: error.safeLog ?? 'populateDatabase: database execution failed',
      status: error.status ?? 500,
      code: error.code ?? 'DATABASE_QUERY_FAILED',
      message: {
        err:
          error.safeMessage ??
          'The database query could not be completed.',
      },
    });
  }
};
