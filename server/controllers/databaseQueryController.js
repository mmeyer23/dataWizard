import pg from 'pg';
const { Client } = pg;

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
  const client = new Client({
    connectionString: pgUri,
  });

  const { databaseQuery } = res.locals;
  // console.log('database query: ', databaseQuery[0])
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
    await client.connect();
    await client.query('BEGIN');
    const results = await client.query(databaseQuery[0]);
    await client.query('COMMIT');
    res.locals.results = results;
    // console.log(`Upload result: ${JSON.stringify(results,null,2)}`);
    return next();
  } catch (error) {
    await client.query('ROLLBACK');
    return next({
      log: `populateDatabase: ${error.message}`,
      status: 500,
      code: 'DATABASE_QUERY_FAILED',
      message: { err: 'The database query could not be completed.' },
    });
  } finally {
    await client.end();
  }
};
