import { parseDatasetDraft } from './datasetPlan.js';

const validDraft = {
  schemaName: 'sample_data',
  tableName: 'people',
  columns: [
    { name: 'name', type: 'text', nullable: false },
    { name: 'age', type: 'integer', nullable: true },
  ],
  rows: [['Ada', 36], ['Grace', null]],
  assumptions: [],
  warnings: [],
};

describe('parseDatasetDraft', () => {
  it('accepts a valid dataset draft', () => {
    expect(parseDatasetDraft(validDraft)).toEqual({
      ok: true,
      value: validDraft,
    });
  });

  it.each([
    [{ ...validDraft, schemaName: 'bad-name' }, 'schemaName'],
    [{ ...validDraft, columns: [] }, 'columns'],
    [{ ...validDraft, rows: [] }, 'rows must contain'],
    [{ ...validDraft, assumptions: [1] }, 'assumptions'],
    [{ ...validDraft, warnings: [false] }, 'warnings'],
    [
      {
        ...validDraft,
        columns: [
          { name: 'name', type: 'text', nullable: false },
          { name: 'name', type: 'text', nullable: false },
        ],
      },
      'duplicated',
    ],
    [{ ...validDraft, rows: [['Ada']] }, 'exactly 2 values'],
    [{ ...validDraft, rows: [['Ada', 3.5]] }, 'incompatible'],
    [
      {
        ...validDraft,
        columns: [null],
        rows: [['Ada']],
      },
      'columns[0] must be an object',
    ],
    [
      {
        ...validDraft,
        columns: [{ name: 'name', type: 'json', nullable: 'no' }],
        rows: [['Ada']],
      },
      'type is not supported',
    ],
  ])('rejects invalid domain input %#', (input, issueText) => {
    const result = parseDatasetDraft(input);

    expect(result.ok).toBe(false);
    expect(result.issues.join(' ')).toContain(issueText);
  });

  it('rejects non-object model output', () => {
    expect(parseDatasetDraft(null)).toEqual({
      ok: false,
      issues: ['The generated plan must be an object.'],
    });
  });

  it('accepts compatible values for every supported type', () => {
    const draft = {
      schemaName: 'typed_data',
      tableName: 'records',
      columns: [
        { name: 'name', type: 'text', nullable: false },
        { name: 'count', type: 'integer', nullable: false },
        { name: 'score', type: 'numeric', nullable: false },
        { name: 'active', type: 'boolean', nullable: false },
        { name: 'published_on', type: 'date', nullable: false },
        { name: 'created_at', type: 'timestamp', nullable: false },
        { name: 'optional_note', type: 'text', nullable: true },
      ],
      rows: [
        [
          'Ada',
          1,
          1.5,
          true,
          '2026-07-09',
          '2026-07-09 12:00:00',
          null,
        ],
      ],
      assumptions: [],
      warnings: [],
    };

    expect(parseDatasetDraft(draft)).toEqual({ ok: true, value: draft });
  });
});
