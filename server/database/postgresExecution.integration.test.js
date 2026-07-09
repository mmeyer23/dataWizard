import pg from 'pg';
import { renderPostgreSql } from '../generation/renderPostgreSql.js';
import { validateSql } from '../sqlPolicy/validateSql.js';
import { executeValidatedSql } from './postgresExecution.js';

const { Client } = pg;

const connectionString = process.env.DATA_WIZARD_TEST_DATABASE_URL;
const describeIfDatabase = connectionString ? describe : describe.skip;

describeIfDatabase('executeValidatedSql PostgreSQL integration', () => {
  const schemaName = `dw_integration_${Date.now()}`;
  const plan = {
    schemaName,
    tableName: 'records',
    columns: [{ name: 'name', type: 'text', nullable: false }],
    rows: [['Ada'], ['Grace']],
    assumptions: [],
    warnings: [],
  };
  const sql = renderPostgreSql(plan);

  afterAll(async () => {
    const client = new Client({ connectionString });
    await client.connect();
    try {
      await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    } finally {
      await client.end();
    }
  });

  it('runs approved SQL in an isolated disposable schema', async () => {
    const sqlValidation = validateSql(sql);

    expect(sqlValidation.ok).toBe(true);

    const result = await executeValidatedSql({
      connectionString,
      sql,
      sqlValidation,
      options: {
        connectionTimeoutMillis: 5000,
        statementTimeoutMillis: 5000,
        transactionTimeoutMillis: 10000,
      },
    });

    expect(result.rows).toEqual([{ name: 'Ada' }, { name: 'Grace' }]);
  });
});
