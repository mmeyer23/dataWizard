import { createGenerateDatasetPlan } from './openaiController.js';
import { DatasetPlanError } from '../adapters/openaiDatasetPlanner.js';

const plan = {
  schemaName: 'test_data',
  tableName: 'tests',
  columns: [{ name: 'name', type: 'text', nullable: false }],
  rows: [['Ada']],
  assumptions: [],
  warnings: [],
  sql: 'SELECT 1;',
  model: 'test-model',
  promptVersion: 'test-prompt',
};

describe('createGenerateDatasetPlan', () => {
  it('stores a generated plan for downstream middleware', async () => {
    const planner = { generate: jest.fn().mockResolvedValue(plan) };
    const middleware = createGenerateDatasetPlan({ planner });
    const res = { locals: { naturalLanguageQuery: 'Create one test row' } };
    const next = jest.fn();

    await middleware({}, res, next);

    expect(planner.generate).toHaveBeenCalledWith('Create one test row');
    expect(res.locals.datasetPlan).toBe(plan);
    expect(res.locals.databaseQuery).toEqual(['SELECT 1;']);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects missing generation input before calling the planner', async () => {
    const planner = { generate: jest.fn() };
    const middleware = createGenerateDatasetPlan({ planner });
    const next = jest.fn();

    await middleware({}, { locals: {} }, next);

    expect(planner.generate).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'GENERATION_INPUT_UNAVAILABLE' })
    );
  });

  it('maps invalid plans to a safe 422 response', async () => {
    const planner = {
      generate: jest.fn().mockRejectedValue(
        new DatasetPlanError('INVALID_DATASET_PLAN', 'Invalid plan')
      ),
    };
    const middleware = createGenerateDatasetPlan({ planner });
    const next = jest.fn();

    await middleware(
      {},
      { locals: { naturalLanguageQuery: 'Create data' } },
      next
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 422,
        code: 'INVALID_DATASET_PLAN',
      })
    );
  });

  it('maps provider failures to a safe 502 response', async () => {
    const planner = {
      generate: jest.fn().mockRejectedValue(new Error('Provider unavailable')),
    };
    const middleware = createGenerateDatasetPlan({ planner });
    const next = jest.fn();

    await middleware(
      {},
      { locals: { naturalLanguageQuery: 'Create data' } },
      next
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 502,
        code: 'AI_GENERATION_FAILED',
      })
    );
  });
});
