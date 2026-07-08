import express from 'express';
import cors from 'cors';
import { validateQueryRequest } from './controllers/requestValidationController.js';
import {
  createApiErrorResponse,
  createQuerySuccessResponse,
  ERROR_CODES,
  QUERY_ENDPOINT,
} from '../shared/apiContracts.js';

export const createApp = ({ generateDatasetPlan, populateDatabase }) => {
  if (
    typeof generateDatasetPlan !== 'function' ||
    typeof populateDatabase !== 'function'
  ) {
    throw new TypeError(
      'createApp requires generateDatasetPlan and populateDatabase middleware.'
    );
  }

  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.post(
    QUERY_ENDPOINT,
    validateQueryRequest,
    generateDatasetPlan,
    populateDatabase,
    (_req, res) => {
      res.status(200).json(
        createQuerySuccessResponse({
          sql: res.locals.databaseQuery[0],
          results: res.locals.results,
          warnings: res.locals.datasetPlan.warnings,
          plan: res.locals.datasetPlan,
        })
      );
    }
  );

  app.use('*', (_req, res) => {
    res.status(404).send('Page not found');
  });

  app.use((err, _req, res, _next) => {
    const defaultError = {
      status: 500,
      code: ERROR_CODES.internalServerError,
      message: { err: 'An unexpected error occurred.' },
    };
    const error = Object.assign({}, defaultError, err);
    const message =
      typeof error.message === 'string'
        ? error.message
        : error.message?.err ?? defaultError.message.err;

    return res
      .status(error.status)
      .json(createApiErrorResponse(error.code, message));
  });

  return app;
};
