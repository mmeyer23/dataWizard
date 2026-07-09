import { renderPostgreSql } from '../generation/renderPostgreSql.js';
import { validateSql } from './validateSql.js';

const plan = {
  schemaName: 'sample_data',
  tableName: 'records',
  columns: [
    { name: 'name', type: 'text', nullable: false },
    { name: 'count', type: 'integer', nullable: false },
    { name: 'score', type: 'numeric', nullable: true },
    { name: 'active', type: 'boolean', nullable: false },
    { name: 'published_on', type: 'date', nullable: false },
    { name: 'created_at', type: 'timestamp', nullable: false },
  ],
  rows: [['Ada', 1, null, true, '2026-07-08', '2026-07-08 12:00:00']],
  assumptions: [],
  warnings: [],
};

const validSql = renderPostgreSql(plan);

describe('validateSql', () => {
  it('approves the exact generated statement sequence', () => {
    expect(validateSql(validSql)).toEqual({
      ok: true,
      findings: [
        {
          severity: 'info',
          code: 'SQL_POLICY_APPROVED',
          message: 'Approved 1 table, 6 columns, and 1 rows.',
        },
      ],
      summary: {
        statementCount: 3,
        tableCount: 1,
        columnCount: 6,
        rowCount: 1,
        schemaName: 'sample_data',
        tableName: 'records',
      },
    });
  });

  it.each([
    ['UPDATE sample_data.records SET count = 0;', 'UPDATE'],
    ['DELETE FROM sample_data.records;', 'DELETE'],
    ['DROP TABLE sample_data.records;', 'DROP'],
    ['ALTER TABLE sample_data.records ADD COLUMN secret TEXT;', 'ALTER'],
    ['GRANT ALL ON sample_data.records TO public;', 'GRANT'],
    ['REVOKE ALL ON sample_data.records FROM public;', 'REVOKE'],
    [`COPY sample_data.records FROM '/tmp/data.csv';`, 'COPY'],
    [`DO $$ BEGIN RAISE NOTICE 'unsafe'; END $$;`, 'DO'],
    ['CREATE EXTENSION hstore;', 'CREATE EXTENSION'],
    ['SELECT pg_sleep(10);', 'FUNCTION CALL'],
  ])('rejects the unsupported %s statement', (sql) => {
    expect(validateSql(sql).ok).toBe(false);
  });

  it('rejects comments before parsing', () => {
    const result = validateSql(`${validSql}\n-- hidden statement`);

    expect(result).toEqual({
      ok: false,
      findings: [
        expect.objectContaining({ code: 'SQL_COMMENTS_NOT_ALLOWED' }),
      ],
    });
  });

  it('rejects malformed SQL', () => {
    expect(validateSql('not sql at all')).toEqual({
      ok: false,
      findings: [expect.objectContaining({ code: 'SQL_PARSE_ERROR' })],
    });
  });

  it('rejects function calls in inserted values', () => {
    const result = validateSql(validSql.replace(`'Ada'`, 'current_user'));

    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'INSERT_EXPRESSION_NOT_ALLOWED' }),
      ])
    );
  });

  it('rejects INSERT SELECT sources', () => {
    const sql = validSql.replace(
      /VALUES[\s\S]*RETURNING \*;/,
      'SELECT * FROM other.records RETURNING *;'
    );

    expect(validateSql(sql).findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'INSERT_SOURCE_NOT_ALLOWED' }),
      ])
    );
  });

  it('rejects cross-statement table mismatches', () => {
    const result = validateSql(
      validSql.replace(
        'INSERT INTO "sample_data"."records"',
        'INSERT INTO "sample_data"."other_records"'
      )
    );

    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'INSERT_TARGET_MISMATCH' }),
      ])
    );
  });

  it('rejects column constraint escalation', () => {
    const result = validateSql(
      validSql.replace('"name" TEXT NOT NULL', '"name" TEXT PRIMARY KEY')
    );

    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'COLUMN_CONSTRAINT_NOT_ALLOWED' }),
      ])
    );
  });

  it('enforces configured statement limits', () => {
    const result = validateSql(validSql, {
      maxStatements: 2,
      maxTables: 1,
      maxColumns: 50,
      maxRows: 1000,
    });

    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'STATEMENT_LIMIT_EXCEEDED' }),
      ])
    );
  });

  it('enforces configured table limits', () => {
    const secondTable =
      'CREATE TABLE IF NOT EXISTS "sample_data"."other" ("name" TEXT);';
    const result = validateSql(`${secondTable}\n${validSql}`, {
      maxStatements: 4,
      maxTables: 1,
      maxColumns: 50,
      maxRows: 1000,
    });

    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'TABLE_LIMIT_EXCEEDED' }),
      ])
    );
  });

  it('enforces configured column limits', () => {
    const result = validateSql(validSql, {
      maxStatements: 3,
      maxTables: 1,
      maxColumns: 2,
      maxRows: 1000,
    });

    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'COLUMN_LIMIT_VIOLATION' }),
      ])
    );
  });

  it('enforces configured row limits', () => {
    const result = validateSql(validSql, {
      maxStatements: 3,
      maxTables: 1,
      maxColumns: 50,
      maxRows: 0,
    });

    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'ROW_LIMIT_VIOLATION' }),
      ])
    );
  });
});
