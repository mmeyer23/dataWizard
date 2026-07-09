import express from 'express';
import cors from 'cors';
import { createMetricsRecorder, createStageTimer } from './observability/metrics.js';
import {
  createCorsOptions,
  createErrorLogger,
  createRateLimiter,
  createRequestContext,
  createSecurityHeaders,
  createStructuredLogger,
  DEFAULT_SECURITY_OPTIONS,
  normalizeHttpError,
} from './security/httpSecurity.js';
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

export const createApp = ({
  generateDatasetPlan,
  populateDatabase,
  security = DEFAULT_SECURITY_OPTIONS,
  logger = console,
  requestIdFactory,
  metrics = createMetricsRecorder(),
  now = Date.now,
} = {}) => {
  if (
    typeof generateDatasetPlan !== 'function' ||
    typeof populateDatabase !== 'function'
  ) {
    throw new TypeError(
      'createApp requires generateDatasetPlan and populateDatabase middleware.'
    );
  }

  const app = express();
  app.locals.metrics = metrics;
  app.locals.ready = true;

  app.use(createRequestContext({ requestIdFactory, now }));
  app.use(createSecurityHeaders());
  app.use(cors(createCorsOptions(security.allowedOrigins)));
  app.use(createStructuredLogger({ logger, now }));
  app.use(
    createRateLimiter({
      windowMs: security.rateLimitWindowMs,
      maxRequests: security.rateLimitMaxRequests,
      now,
    })
  );
  app.use(express.json({ limit: security.jsonBodyLimit }));

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/ready', (_req, res) => {
    res
      .status(app.locals.ready ? 200 : 503)
      .json({ status: app.locals.ready ? 'ready' : 'draining' });
  });

  app.get('/metrics', (_req, res) => {
    res.status(200).json({ stages: metrics.snapshot() });
  });

  app.post(
    QUERY_PLAN_ENDPOINT,
    validateQueryRequest,
    observeStage('generation', generateDatasetPlan, metrics, now),
    observeStage('validation', validateGeneratedSql, metrics, now),
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
    observeStage('validation', validateGeneratedSql, metrics, now),
    observeStage('execution', populateDatabase, metrics, now),
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
    observeStage('generation', generateDatasetPlan, metrics, now),
    observeStage('validation', validateGeneratedSql, metrics, now),
    observeStage('execution', populateDatabase, metrics, now),
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

  const logError = createErrorLogger({ logger });

  app.use((err, req, res, _next) => {
    const error = normalizeHttpError(err);
    logError(error, req);

    return res
      .status(error.status)
      .json(createApiErrorResponse(error.code, error.message.err, error.details));
  });

  return app;
};

const observeStage = (stage, middleware, metrics, now) => async (req, res, next) => {
  const timer = createStageTimer({ metrics, stage, now });
  try {
    await middleware(req, res, (error) => {
      timer.complete(Boolean(error));
      next(error);
    });
  } catch (error) {
    timer.complete(true);
    next(error);
  }
};
