import 'dotenv/config';
import OpenAI from 'openai';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createQueryOpenai } from './controllers/openaiController.js';
import { populateDatabase } from './controllers/databaseQueryController.js';

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
  const app = createApp({
    queryOpenai: createQueryOpenai({ openai }),
    populateDatabase,
  });

  return startServer({ app, port: config.port, logger });
};
