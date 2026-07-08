import 'dotenv/config';
import OpenAI from 'openai';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createGenerateDatasetPlan } from './controllers/openaiController.js';
import { populateDatabase } from './controllers/databaseQueryController.js';
import { createOpenAiDatasetPlanner } from './adapters/openaiDatasetPlanner.js';

export const startServer = ({ app, port, logger = console }) =>
  app.listen(port, () => {
    logger.log(`Server listening on port: ${port}`);
  });

export const startApplication = ({
  env = process.env,
  logger = console,
  OpenAIClient = OpenAI,
} = {}) => {
  const config = loadConfig(env);
  const openai = new OpenAIClient({ apiKey: config.openAiApiKey });
  const planner = createOpenAiDatasetPlanner({ openai });
  const app = createApp({
    generateDatasetPlan: createGenerateDatasetPlan({ planner }),
    populateDatabase,
  });

  return startServer({ app, port: config.port, logger });
};
