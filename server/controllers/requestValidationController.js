import { parseQueryRequest } from '../../shared/apiContracts.js';

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
  res.locals.naturalLanguageQuery = parsedRequest.value.naturalLanguageQuery;
  return next();
};
