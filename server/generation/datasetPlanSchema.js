export const DATASET_PLAN_RESPONSE_SCHEMA = Object.freeze({
  name: 'dataset_plan',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['schemaName', 'tableName', 'columns', 'rows', 'assumptions', 'warnings'],
    properties: {
      schemaName: { type: 'string' },
      tableName: { type: 'string' },
      columns: {
        type: 'array',
        minItems: 1,
        maxItems: 50,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'type', 'nullable'],
          properties: {
            name: { type: 'string' },
            type: {
              type: 'string',
              enum: ['text', 'integer', 'numeric', 'boolean', 'date', 'timestamp'],
            },
            nullable: { type: 'boolean' },
          },
        },
      },
      rows: {
        type: 'array',
        minItems: 1,
        maxItems: 1000,
        items: {
          type: 'array',
          items: {
            anyOf: [
              { type: 'string' },
              { type: 'number' },
              { type: 'boolean' },
              { type: 'null' },
            ],
          },
        },
      },
      assumptions: {
        type: 'array',
        items: { type: 'string' },
      },
      warnings: {
        type: 'array',
        items: { type: 'string' },
      },
    },
  },
});
