// @ts-check

const SQL_TYPES = Object.freeze({
  text: 'TEXT',
  integer: 'INTEGER',
  numeric: 'NUMERIC',
  boolean: 'BOOLEAN',
  date: 'DATE',
  timestamp: 'TIMESTAMP',
});

/**
 * @param {import('./datasetPlan.js').DatasetDraft} plan
 * @returns {string}
 */
export const renderPostgreSql = (plan) => {
  const schema = quoteIdentifier(plan.schemaName);
  const table = quoteIdentifier(plan.tableName);
  const columns = plan.columns
    .map(
      (column) =>
        `  ${quoteIdentifier(column.name)} ${SQL_TYPES[column.type]}` +
        `${column.nullable ? '' : ' NOT NULL'}`
    )
    .join(',\n');
  const columnNames = plan.columns
    .map((column) => quoteIdentifier(column.name))
    .join(', ');
  const rows = plan.rows
    .map((row) => `  (${row.map(renderLiteral).join(', ')})`)
    .join(',\n');

  return [
    `CREATE SCHEMA IF NOT EXISTS ${schema};`,
    '',
    `CREATE TABLE IF NOT EXISTS ${schema}.${table} (`,
    columns,
    ');',
    '',
    `INSERT INTO ${schema}.${table} (${columnNames})`,
    'VALUES',
    rows,
    'RETURNING *;',
  ].join('\n');
};

/** @param {string} value */
const quoteIdentifier = (value) => `"${value}"`;

/**
 * @param {string | number | boolean | null} value
 * @returns {string}
 */
const renderLiteral = (value) => {
  if (value === null) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return `'${value.replaceAll("'", "''")}'`;
};
