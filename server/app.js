import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { queryOpenai } from './controllers/openaiController.js';
import { parseNaturalLanguageQuery } from './controllers/naturalLanguageController.js';
import { populateDatabase } from './controllers/databaseQueryController.js';
import { validateDatabaseConnection } from './controllers/databaseConnectionController.js';

const app = express();

app.use(cors());
app.use(express.json());

app.post(
  '/api/query',
  parseNaturalLanguageQuery,
  validateDatabaseConnection,
  queryOpenai,
  populateDatabase,
  (_req, res, _next) => {
    const rows = res.locals.results?.rows ?? [];

    res.status(200).json({
      sql: res.locals.databaseQuery[0],
      rows,
      rowCount: res.locals.results?.rowCount ?? rows.length,
      warnings: [],
    });
  }
);

app.use('*', (req, res) => {
  res.status(404).send('Page not found');
});

app.use((err, req, res, next) => {
  const defaultErr = {
    log: 'Express error handler caught unknown middleware error',
    status: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: { err: 'An unexpected error occurred.' },
  };
  const errorObj = Object.assign({}, defaultErr, err);
  const message =
    typeof errorObj.message === 'string'
      ? errorObj.message
      : errorObj.message?.err ?? defaultErr.message.err;

  return res.status(errorObj.status).json({
    error: {
      code: errorObj.code ?? defaultErr.code,
      message,
    },
  });
});

export default app;
