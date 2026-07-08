import { renderPostgreSql } from './renderPostgreSql.js';

const plan = {
  schemaName: 'sample_data',
  tableName: 'people',
  columns: [
    { name: 'name', type: 'text', nullable: false },
    { name: 'score', type: 'numeric', nullable: true },
    { name: 'active', type: 'boolean', nullable: false },
  ],
  rows: [["O'Reilly", null, true]],
  assumptions: [],
  warnings: [],
};

describe('renderPostgreSql', () => {
  it('renders deterministic PostgreSQL from a validated plan', () => {
    const first = renderPostgreSql(plan);
    const second = renderPostgreSql(plan);

    expect(first).toBe(second);
    expect(first).toContain(
      'CREATE TABLE IF NOT EXISTS "sample_data"."people"'
    );
    expect(first).toContain('"name" TEXT NOT NULL');
    expect(first).toContain(`('O''Reilly', NULL, TRUE)`);
    expect(first).toContain('RETURNING *;');
  });
});
