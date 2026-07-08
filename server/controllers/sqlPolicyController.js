import { validateSql } from '../sqlPolicy/validateSql.js';

export const validateGeneratedSql = (_req, res, next) => {
  const sql = res.locals.databaseQuery?.[0];
  const validation = validateSql(sql);

  res.locals.sqlValidation = validation;

  if (!validation.ok) {
    return next({
      log: `validateGeneratedSql: ${validation.findings
        .map((finding) => finding.code)
        .join(', ')}`,
      status: 422,
      code: 'SQL_POLICY_VIOLATION',
      message: {
        err: 'The generated SQL did not satisfy the execution policy.',
      },
      details: validation.findings,
    });
  }

  return next();
};
