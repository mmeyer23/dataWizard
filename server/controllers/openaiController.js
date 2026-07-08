import { DatasetPlanError } from '../adapters/openaiDatasetPlanner.js';

export const createGenerateDatasetPlan =
  ({ planner }) =>
  async (_req, res, next) => {
    const { naturalLanguageQuery } = res.locals;
    if (!naturalLanguageQuery) {
      return next({
        log: 'OpenAI query middleware did not receive a query',
        status: 500,
        code: 'GENERATION_INPUT_UNAVAILABLE',
        message: { err: 'The dataset request was unavailable for generation.' },
      });
    }

    try {
      const plan = await planner.generate(naturalLanguageQuery);
      res.locals.datasetPlan = plan;
      res.locals.databaseQuery = [plan.sql];
      return next();
    } catch (error) {
      const invalidPlan = error instanceof DatasetPlanError;

      return next({
        log: `openaiController.generateDatasetPlan: ${error}`,
        status: invalidPlan ? 422 : 502,
        code: invalidPlan ? error.code : 'AI_GENERATION_FAILED',
        message: {
          err: invalidPlan
            ? 'The generated dataset plan could not be validated.'
            : 'The AI provider could not generate a dataset plan.',
        },
      });
    }
  };
