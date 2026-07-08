// @ts-check

const IDENTIFIER_PATTERN = /^[a-z][a-z0-9_]{0,62}$/;
const COLUMN_TYPES = new Set([
  'text',
  'integer',
  'numeric',
  'boolean',
  'date',
  'timestamp',
]);

/**
 * @typedef {'text' | 'integer' | 'numeric' | 'boolean' | 'date' | 'timestamp'} ColumnType
 * @typedef {{ name: string, type: ColumnType, nullable: boolean }} DatasetColumn
 * @typedef {{
 *   schemaName: string,
 *   tableName: string,
 *   columns: DatasetColumn[],
 *   rows: Array<Array<string | number | boolean | null>>,
 *   assumptions: string[],
 *   warnings: string[]
 * }} DatasetDraft
 */

/**
 * @param {unknown} value
 * @returns {{ ok: true, value: DatasetDraft } | { ok: false, issues: string[] }}
 */
export const parseDatasetDraft = (value) => {
  /** @type {string[]} */
  const issues = [];

  if (!isRecord(value)) {
    return { ok: false, issues: ['The generated plan must be an object.'] };
  }

  const schemaName = readIdentifier(value.schemaName, 'schemaName', issues);
  const tableName = readIdentifier(value.tableName, 'tableName', issues);
  const columns = readColumns(value.columns, issues);
  const rows = readRows(value.rows, columns, issues);
  const assumptions = readStringArray(value.assumptions, 'assumptions', issues);
  const warnings = readStringArray(value.warnings, 'warnings', issues);

  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    value: /** @type {DatasetDraft} */ ({
      schemaName,
      tableName,
      columns,
      rows,
      assumptions,
      warnings,
    }),
  };
};

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
const isRecord = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/**
 * @param {unknown} value
 * @param {string} field
 * @param {string[]} issues
 * @returns {string | undefined}
 */
const readIdentifier = (value, field, issues) => {
  if (typeof value !== 'string' || !IDENTIFIER_PATTERN.test(value)) {
    issues.push(`${field} must be a lowercase snake_case SQL identifier.`);
    return undefined;
  }

  return value;
};

/**
 * @param {unknown} value
 * @param {string[]} issues
 * @returns {DatasetColumn[] | undefined}
 */
const readColumns = (value, issues) => {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) {
    issues.push('columns must contain between 1 and 50 definitions.');
    return undefined;
  }

  const names = new Set();
  const columns = value.map((column, index) => {
    if (!isRecord(column)) {
      issues.push(`columns[${index}] must be an object.`);
      return undefined;
    }

    const name = readIdentifier(column.name, `columns[${index}].name`, issues);
    if (name && names.has(name)) {
      issues.push(`Column name "${name}" is duplicated.`);
    }
    if (name) names.add(name);

    if (typeof column.type !== 'string' || !COLUMN_TYPES.has(column.type)) {
      issues.push(`columns[${index}].type is not supported.`);
    }
    if (typeof column.nullable !== 'boolean') {
      issues.push(`columns[${index}].nullable must be a boolean.`);
    }

    return {
      name,
      type: column.type,
      nullable: column.nullable,
    };
  });

  return /** @type {DatasetColumn[]} */ (columns);
};

/**
 * @param {unknown} value
 * @param {DatasetColumn[] | undefined} columns
 * @param {string[]} issues
 * @returns {DatasetDraft['rows'] | undefined}
 */
const readRows = (value, columns, issues) => {
  if (!Array.isArray(value) || value.length < 1 || value.length > 1000) {
    issues.push('rows must contain between 1 and 1000 entries.');
    return undefined;
  }

  if (!columns) return undefined;

  value.forEach((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== columns.length) {
      issues.push(
        `rows[${rowIndex}] must contain exactly ${columns.length} values.`
      );
      return;
    }

    row.forEach((cell, columnIndex) => {
      if (!isCompatibleValue(cell, columns[columnIndex])) {
        issues.push(
          `rows[${rowIndex}][${columnIndex}] is incompatible with ` +
            `${columns[columnIndex].type}.`
        );
      }
    });
  });

  return /** @type {DatasetDraft['rows']} */ (value);
};

/**
 * @param {unknown} value
 * @param {DatasetColumn} column
 * @returns {boolean}
 */
const isCompatibleValue = (value, column) => {
  if (value === null) return column.nullable;

  switch (column.type) {
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'numeric':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    default:
      return typeof value === 'string';
  }
};

/**
 * @param {unknown} value
 * @param {string} field
 * @param {string[]} issues
 * @returns {string[] | undefined}
 */
const readStringArray = (value, field, issues) => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    issues.push(`${field} must be an array of strings.`);
    return undefined;
  }

  return /** @type {string[]} */ (value);
};
