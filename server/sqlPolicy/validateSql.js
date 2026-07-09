import { parse } from 'pgsql-ast-parser';

export const SQL_POLICY_LIMITS = Object.freeze({
  maxStatements: 3,
  maxTables: 1,
  maxColumns: 50,
  maxRows: 1000,
});

const ALLOWED_COLUMN_TYPES = new Set([
  'text',
  'integer',
  'numeric',
  'boolean',
  'date',
  'timestamp',
]);
const ALLOWED_VALUE_TYPES = new Set([
  'string',
  'integer',
  'numeric',
  'boolean',
  'null',
]);

export const validateSql = (sql, limits = SQL_POLICY_LIMITS) => {
  const findings = [];

  if (typeof sql !== 'string' || sql.trim().length === 0) {
    return denied('SQL_REQUIRED', 'Generated SQL is required.');
  }

  if (/--|\/\*|\*\//.test(sql)) {
    return denied(
      'SQL_COMMENTS_NOT_ALLOWED',
      'SQL comments are not permitted in generated statements.'
    );
  }

  let statements;
  try {
    statements = parse(sql);
  } catch {
    return denied(
      'SQL_PARSE_ERROR',
      'Generated SQL is not valid PostgreSQL.'
    );
  }

  if (statements.length > limits.maxStatements) {
    findings.push(
      errorFinding(
        'STATEMENT_LIMIT_EXCEEDED',
        `Generated SQL contains more than ${limits.maxStatements} statements.`
      )
    );
  }

  const tableCount = statements.filter(
    (statement) => statement.type === 'create table'
  ).length;
  if (tableCount > limits.maxTables) {
    findings.push(
      errorFinding(
        'TABLE_LIMIT_EXCEEDED',
        `Generated SQL creates more than ${limits.maxTables} table.`
      )
    );
  }

  if (statements.length !== 3) {
    findings.push(
      errorFinding(
        'INVALID_STATEMENT_SEQUENCE',
        'Generated SQL must contain CREATE SCHEMA, CREATE TABLE, and INSERT statements.'
      )
    );
  }

  const [createSchema, createTable, insert] = statements;
  validateStatementType(createSchema, 'create schema', 0, findings);
  validateStatementType(createTable, 'create table', 1, findings);
  validateStatementType(insert, 'insert', 2, findings);

  if (findings.length > 0) return rejected(findings);

  validateCreateSchema(createSchema, findings);
  validateCreateTable(createTable, createSchema, limits, findings);
  if (findings.length > 0) return rejected(findings);

  validateInsert(insert, createTable, limits, findings);

  if (findings.length > 0) return rejected(findings);

  const columnCount = createTable.columns.length;
  const rowCount = insert.insert.values.length;

  return {
    ok: true,
    findings: [
      {
        severity: 'info',
        code: 'SQL_POLICY_APPROVED',
        message: `Approved 1 table, ${columnCount} columns, and ${rowCount} rows.`,
      },
    ],
    summary: {
      statementCount: statements.length,
      tableCount: 1,
      columnCount,
      rowCount,
      schemaName: createSchema.name.name,
      tableName: createTable.name.name,
    },
  };
};

const validateStatementType = (
  statement,
  expectedType,
  statementIndex,
  findings
) => {
  if (!statement || statement.type !== expectedType) {
    findings.push(
      errorFinding(
        'STATEMENT_NOT_ALLOWED',
        `Statement ${statementIndex + 1} must be ${expectedType.toUpperCase()}.`,
        statementIndex
      )
    );
  }
};

const validateCreateSchema = (statement, findings) => {
  if (!statement.ifNotExists) {
    findings.push(
      errorFinding(
        'SCHEMA_MUST_BE_IDEMPOTENT',
        'CREATE SCHEMA must use IF NOT EXISTS.',
        0
      )
    );
  }
};

const validateCreateTable = (statement, createSchema, limits, findings) => {
  if (!statement.ifNotExists) {
    findings.push(
      errorFinding(
        'TABLE_MUST_BE_IDEMPOTENT',
        'CREATE TABLE must use IF NOT EXISTS.',
        1
      )
    );
  }

  if (
    statement.name.schema !== createSchema.name.name ||
    !statement.name.name
  ) {
    findings.push(
      errorFinding(
        'TABLE_SCHEMA_MISMATCH',
        'CREATE TABLE must target the generated schema.',
        1
      )
    );
  }

  if (
    !Array.isArray(statement.columns) ||
    statement.columns.length < 1 ||
    statement.columns.length > limits.maxColumns
  ) {
    findings.push(
      errorFinding(
        'COLUMN_LIMIT_VIOLATION',
        `CREATE TABLE must define between 1 and ${limits.maxColumns} columns.`,
        1
      )
    );
    return;
  }

  const names = new Set();
  statement.columns.forEach((column) => {
    if (column.kind !== 'column') {
      findings.push(
        errorFinding(
          'TABLE_ELEMENT_NOT_ALLOWED',
          'Only column definitions are allowed in CREATE TABLE.',
          1
        )
      );
      return;
    }

    if (names.has(column.name.name)) {
      findings.push(
        errorFinding(
          'DUPLICATE_COLUMN',
          `Column "${column.name.name}" is duplicated.`,
          1
        )
      );
    }
    names.add(column.name.name);

    if (
      column.dataType?.schema ||
      !ALLOWED_COLUMN_TYPES.has(column.dataType?.name)
    ) {
      findings.push(
        errorFinding(
          'COLUMN_TYPE_NOT_ALLOWED',
          `Column "${column.name.name}" uses an unsupported type.`,
          1
        )
      );
    }

    const constraints = column.constraints ?? [];
    if (
      constraints.some(
        (constraint) =>
          constraint.type !== 'not null' && constraint.type !== 'null'
      )
    ) {
      findings.push(
        errorFinding(
          'COLUMN_CONSTRAINT_NOT_ALLOWED',
          `Column "${column.name.name}" uses an unsupported constraint.`,
          1
        )
      );
    }
  });
};

const validateInsert = (statement, createTable, limits, findings) => {
  if (
    statement.into.schema !== createTable.name.schema ||
    statement.into.name !== createTable.name.name
  ) {
    findings.push(
      errorFinding(
        'INSERT_TARGET_MISMATCH',
        'INSERT must target the generated table.',
        2
      )
    );
  }

  const tableColumns = createTable.columns.map((column) => column.name.name);
  const insertColumns = statement.columns?.map((column) => column.name) ?? [];
  if (
    tableColumns.length !== insertColumns.length ||
    tableColumns.some((column, index) => column !== insertColumns[index])
  ) {
    findings.push(
      errorFinding(
        'INSERT_COLUMNS_MISMATCH',
        'INSERT columns must exactly match the generated table columns.',
        2
      )
    );
  }

  if (statement.insert?.type !== 'values') {
    findings.push(
      errorFinding(
        'INSERT_SOURCE_NOT_ALLOWED',
        'INSERT must use literal VALUES.',
        2
      )
    );
    return;
  }

  const rows = statement.insert.values;
  if (rows.length < 1 || rows.length > limits.maxRows) {
    findings.push(
      errorFinding(
        'ROW_LIMIT_VIOLATION',
        `INSERT must contain between 1 and ${limits.maxRows} rows.`,
        2
      )
    );
  }

  rows.forEach((row, rowIndex) => {
    if (row.length !== tableColumns.length) {
      findings.push(
        errorFinding(
          'INSERT_ROW_SHAPE_MISMATCH',
          `Inserted row ${rowIndex + 1} has the wrong number of values.`,
          2
        )
      );
    }

    row.forEach((value) => {
      if (!ALLOWED_VALUE_TYPES.has(value.type)) {
        findings.push(
          errorFinding(
            'INSERT_EXPRESSION_NOT_ALLOWED',
            'INSERT values must be string, number, boolean, or null literals.',
            2
          )
        );
      }
    });
  });

  const returning = statement.returning;
  if (
    !Array.isArray(returning) ||
    returning.length !== 1 ||
    returning[0].expr?.type !== 'ref' ||
    returning[0].expr?.name !== '*'
  ) {
    findings.push(
      errorFinding(
        'RETURNING_CLAUSE_REQUIRED',
        'INSERT must end with RETURNING *.',
        2
      )
    );
  }
};

const errorFinding = (code, message, statementIndex) => ({
  severity: 'error',
  code,
  message,
  ...(statementIndex === undefined ? {} : { statementIndex }),
});

const denied = (code, message) => rejected([errorFinding(code, message)]);

const rejected = (findings) => ({
  ok: false,
  findings,
});
