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
  //Safety check to make sure the AI generated query doesn't have dangerous SQL query keywords
  const forbiddenKeywords = [
    'DROP',
    'DELETE',
    'TRUNCATE',
    'ALTER',
    '--',
    '/*',
    '*/',
  ];
  // console.log(databaseQuery.length)
  const containsForbiddenKeyword = forbiddenKeywords.some((keyword) =>
    databaseQuery[0].toUpperCase().includes(keyword)
  );
  if (containsForbiddenKeyword) {
    return next({
      log: 'populateDatabase: Generated SQL contains a forbidden keyword',
      status: 400,
      code: 'UNSAFE_GENERATED_SQL',
      message: { err: 'The generated SQL did not pass validation.' },
    });
  }

  // console.log('Running query:', databaseQuery);
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
