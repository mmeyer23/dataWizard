import {
  createOpenAiDatasetPlanner,
  DatasetPlanError,
} from './openaiDatasetPlanner.js';

const draft = {
  schemaName: 'movie_data',
  tableName: 'movies',
  columns: [
    { name: 'title', type: 'text', nullable: false },
    { name: 'year', type: 'integer', nullable: false },
  ],
  rows: [["Ocean's Eleven", 2001]],
  assumptions: ['Years are release years.'],
  warnings: [],
};

const createPlanner = (content = JSON.stringify(draft)) => {
  const create = jest.fn().mockResolvedValue({
    model: 'gpt-4o-structured',
    choices: [{ message: { content } }],
  });

  return {
    create,
    planner: createOpenAiDatasetPlanner({
      openai: { chat: { completions: { create } } },
    }),
  };
};

describe('createOpenAiDatasetPlanner', () => {
  it('requests strict structured output with deterministic settings', async () => {
    const { create, planner } = createPlanner();

    const result = await planner.generate('Create one movie');

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o',
        temperature: 0,
        n: 1,
        response_format: expect.objectContaining({
          type: 'json_schema',
          json_schema: expect.objectContaining({
            name: 'dataset_plan',
            strict: true,
          }),
        }),
      })
    );
    expect(result.model).toBe('gpt-4o-structured');
    expect(result.promptVersion).toBe('dataset-plan-v1');
    expect(result.sql).toContain(`'Ocean''s Eleven'`);
  });

  it('fails safely when the model returns invalid JSON', async () => {
    const { planner } = createPlanner('{not-json');

    await expect(planner.generate('Create data')).rejects.toMatchObject({
      name: 'DatasetPlanError',
      code: 'INVALID_MODEL_RESPONSE',
    });
  });

  it('fails safely when the structured plan violates domain rules', async () => {
    const { planner } = createPlanner(
      JSON.stringify({ ...draft, tableName: 'Movies; DROP TABLE users' })
    );

    await expect(planner.generate('Create data')).rejects.toMatchObject({
      code: 'INVALID_DATASET_PLAN',
    });
  });

  it('fails safely on a refusal', async () => {
    const create = jest.fn().mockResolvedValue({
      choices: [{ message: { refusal: 'Unable to comply', content: null } }],
    });
    const planner = createOpenAiDatasetPlanner({
      openai: { chat: { completions: { create } } },
    });

    await expect(planner.generate('Create data')).rejects.toBeInstanceOf(
      DatasetPlanError
    );
  });
});
