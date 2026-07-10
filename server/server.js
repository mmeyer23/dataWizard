import 'dotenv/config';
import OpenAI from 'openai';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createGenerateDatasetPlan } from './controllers/openaiController.js';
import { populateDatabase } from './controllers/databaseQueryController.js';
import { createOpenAiDatasetPlanner } from './adapters/openaiDatasetPlanner.js';
import { createDemoDatasetPlanner } from './adapters/demoDatasetPlanner.js';

export const startServer = ({
  app,
  port,
  logger = console,
  shutdownGraceMs = 10_000,
  processRef = process,
}) => {
  const server = app.listen(port, () => {
    logger.log(`Server listening on port: ${port}`);
  });

  const shutdown = (signal) => {
    app.locals.ready = false;
    logger.log(`Received ${signal}; shutting down gracefully.`);

    const timeoutId = setTimeout(() => {
      logger.error?.('Graceful shutdown timed out.');
      processRef.exitCode = 1;
    }, shutdownGraceMs);

    server.close((error) => {
      clearTimeout(timeoutId);
      if (error) {
        logger.error?.(error);
        processRef.exitCode = 1;
      }
    });
  };

  processRef.once?.('SIGTERM', shutdown);
  processRef.once?.('SIGINT', shutdown);

  return server;
};

export const startApplication = ({
  env = process.env,
  logger = console,
  OpenAIClient = OpenAI,
  createAppFactory = createApp,
} = {}) => {
  const config = loadConfig(env);
  const planner = config.demoMode
    ? createDemoDatasetPlanner()
    : createOpenAiDatasetPlanner({
        openai: new OpenAIClient({ apiKey: config.openAiApiKey }),
      });
  const app = createAppFactory({
    generateDatasetPlan: createGenerateDatasetPlan({ planner }),
    populateDatabase: config.demoMode ? rejectDemoExecution : populateDatabase,
    security: config,
    logger,
  });

  return startServer({
    app,
    port: config.port,
    logger,
    shutdownGraceMs: config.shutdownGraceMs,
  });
};

const rejectDemoExecution = (_req, _res, next) =>
  next({
    status: 409,
    code: 'DEMO_EXECUTION_DISABLED',
    message: { err: 'Database execution is disabled in DEMO_MODE.' },
  });
