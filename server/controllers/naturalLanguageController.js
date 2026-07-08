export const parseNaturalLanguageQuery = async (req, res, next) => {
  if (req.body === undefined) {
    const error = {
      log: 'parseNaturalLanguageQuery: Request body is undefined',
      status: 400,
      code: 'INVALID_REQUEST_BODY',
      message: { err: 'An error occurred while parsing the user query' },
    };
    return next(error);
  }
  if (req.body === null) {
    const error = {
      log: 'parseNaturalLanguageQuery: Request body is null',
      status: 400,
      code: 'INVALID_REQUEST_BODY',
      message: { err: 'An error occurred while parsing the user query' },
    };
    return next(error);
  }
  if (!req.body.naturalLanguageQuery && req.body.naturalLanguageQuery !== '') {
    const error = {
      log: 'parseNaturalLanguageQuery: Natural Language Query not provided',
      status: 400,
      code: 'NATURAL_LANGUAGE_QUERY_REQUIRED',
      message: { err: 'A natural-language query is required.' },
    };
    return next(error);
  }
  const { naturalLanguageQuery } = req.body;
  if (typeof naturalLanguageQuery !== 'string') {
    const error = {
      log: 'parseNaturalLanguageQuery: Natural Language Query is not a string',
      status: 400,
      code: 'INVALID_NATURAL_LANGUAGE_QUERY',
      message: { err: 'The natural-language query must be a string.' },
    };
    return next(error);
  }
  if (naturalLanguageQuery.trim().length === 0) {
    const error = {
      log: 'parseNaturalLanguageQuery: Natural Language Query is an empty string',
      status: 400,
      code: 'NATURAL_LANGUAGE_QUERY_REQUIRED',
      message: { err: 'A natural-language query is required.' },
    };
    return next(error);
  }
  res.locals.naturalLanguageQuery = naturalLanguageQuery.trim();
  return next();
};
