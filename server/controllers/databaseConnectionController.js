export const validateDatabaseConnection = (req, _res, next) => {
  const { postgreSqlUri } = req.body ?? {};

  if (typeof postgreSqlUri !== 'string' || postgreSqlUri.trim().length === 0) {
    return next({
      log: 'validateDatabaseConnection: PostgreSQL URI not provided',
      status: 400,
      code: 'POSTGRESQL_URI_REQUIRED',
      message: { err: 'A PostgreSQL connection URI is required.' },
    });
  }

  return next();
};
