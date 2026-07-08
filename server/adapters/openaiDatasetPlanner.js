import { DATASET_PLAN_RESPONSE_SCHEMA } from '../generation/datasetPlanSchema.js';
import { GENERATION_CONFIG } from '../generation/generationConfig.js';
import { DATASET_PLANNER_PROMPT } from '../generation/prompt.js';
import { parseDatasetDraft } from '../generation/datasetPlan.js';
import { renderPostgreSql } from '../generation/renderPostgreSql.js';

export const createOpenAiDatasetPlanner = ({
  openai,
  config = GENERATION_CONFIG,
  responseSchema = DATASET_PLAN_RESPONSE_SCHEMA,
  systemPrompt = DATASET_PLANNER_PROMPT,
}) => ({
  generate: async (naturalLanguageQuery) => {
    const completion = await openai.chat.completions.create({
      model: config.model,
      temperature: config.temperature,
      n: 1,
      response_format: {
        type: 'json_schema',
        json_schema: responseSchema,
      },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: naturalLanguageQuery },
      ],
    });
    const message = completion.choices?.[0]?.message;

    if (!message || message.refusal || typeof message.content !== 'string') {
      throw new DatasetPlanError(
        'MODEL_RESPONSE_UNAVAILABLE',
        'The model did not return a dataset plan.'
      );
    }

    let generatedValue;
    try {
      generatedValue = JSON.parse(message.content);
    } catch {
      throw new DatasetPlanError(
        'INVALID_MODEL_RESPONSE',
        'The model returned invalid JSON.'
      );
    }

    const parsedDraft = parseDatasetDraft(generatedValue);
    if (!parsedDraft.ok) {
      throw new DatasetPlanError(
        'INVALID_DATASET_PLAN',
        'The generated dataset plan failed validation.',
        parsedDraft.issues
      );
    }

    return Object.freeze({
      ...parsedDraft.value,
      sql: renderPostgreSql(parsedDraft.value),
      model: completion.model ?? config.model,
      promptVersion: config.promptVersion,
    });
  },
});

export class DatasetPlanError extends Error {
  constructor(code, message, issues = []) {
    super(message);
    this.name = 'DatasetPlanError';
    this.code = code;
    this.issues = issues;
  }
}
