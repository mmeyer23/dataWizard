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
  ])('rejects invalid domain input %#', (input, issueText) => {
    const result = parseDatasetDraft(input);

    expect(result.ok).toBe(false);
    expect(result.issues.join(' ')).toContain(issueText);
  });
});
