import {
  parseExecuteQueryRequest,
  parseQueryPlanRequest,
  parseQueryRequest,
} from '../../shared/apiContracts.js';

const assignQueryLocals = (parsedRequest, res) => {
  res.locals.naturalLanguageQuery = parsedRequest.value.naturalLanguageQuery;
  return parsedRequest;
};

export const validateQueryPlanRequest = (req, res, next) => {
  const parsedRequest = parseQueryPlanRequest(req.body);

  if (!parsedRequest.ok) {
    return next({
      log: `validateQueryPlanRequest: ${parsedRequest.error.code}`,
      status: 400,
      code: parsedRequest.error.code,
      message: { err: parsedRequest.error.message },
    });
  }

  req.body = parsedRequest.value;
  assignQueryLocals(parsedRequest, res);
  return next();
};

export const validateQueryRequest = (req, res, next) => {
  const parsedRequest = parseQueryRequest(req.body);

  if (!parsedRequest.ok) {
    return next({
      log: `validateQueryRequest: ${parsedRequest.error.code}`,
      status: 400,
      code: parsedRequest.error.code,
      message: { err: parsedRequest.error.message },
    });
  }

  req.body = parsedRequest.value;
  assignQueryLocals(parsedRequest, res);
  return next();
};

export const validateExecuteQueryRequest = (req, res, next) => {
  const parsedRequest = parseExecuteQueryRequest(req.body);

  if (!parsedRequest.ok) {
    return next({
      log: `validateExecuteQueryRequest: ${parsedRequest.error.code}`,
      status: 400,
      code: parsedRequest.error.code,
      message: { err: parsedRequest.error.message },
    });
  }

  req.body = parsedRequest.value;
  res.locals.databaseQuery = [parsedRequest.value.approvedSql];
  return next();
};
