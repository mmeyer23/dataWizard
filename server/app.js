import express from 'express';
import cors from 'cors';
import {
  validateExecuteQueryRequest,
  validateQueryRequest,
} from './controllers/requestValidationController.js';
import { validateGeneratedSql } from './controllers/sqlPolicyController.js';
import {
  createApiErrorResponse,
  createQueryPlanResponse,
  createQuerySuccessResponse,
  ERROR_CODES,
  QUERY_EXECUTE_ENDPOINT,
  QUERY_ENDPOINT,
  QUERY_PLAN_ENDPOINT,
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
    QUERY_PLAN_ENDPOINT,
    validateQueryRequest,
    generateDatasetPlan,
    validateGeneratedSql,
    (_req, res) => {
      res.status(200).json(
        createQueryPlanResponse({
          sql: res.locals.databaseQuery[0],
          warnings: res.locals.datasetPlan.warnings,
          plan: res.locals.datasetPlan,
          validation: res.locals.sqlValidation,
        })
      );
    }
  );

  app.post(
    QUERY_EXECUTE_ENDPOINT,
    validateExecuteQueryRequest,
    validateGeneratedSql,
    populateDatabase,
    (_req, res) => {
      res.status(200).json(
        createQuerySuccessResponse({
          sql: res.locals.databaseQuery[0],
          results: res.locals.results,
          validation: res.locals.sqlValidation,
        })
      );
    }
  );

  app.post(
    QUERY_ENDPOINT,
    validateQueryRequest,
    generateDatasetPlan,
    validateGeneratedSql,
    populateDatabase,
    (_req, res) => {
      res.status(200).json(
        createQuerySuccessResponse({
          sql: res.locals.databaseQuery[0],
          results: res.locals.results,
          warnings: res.locals.datasetPlan.warnings,
          plan: res.locals.datasetPlan,
          validation: res.locals.sqlValidation,
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
      .json(createApiErrorResponse(error.code, message, error.details));
  });

  return app;
};
