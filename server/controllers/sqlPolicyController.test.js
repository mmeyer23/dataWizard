import { validateGeneratedSql } from './sqlPolicyController.js';
import { renderPostgreSql } from '../generation/renderPostgreSql.js';

const validSql = renderPostgreSql({
  schemaName: 'sample_data',
  tableName: 'people',
  columns: [{ name: 'name', type: 'text', nullable: false }],
  rows: [['Ada']],
  assumptions: [],
  warnings: [],
});

describe('validateGeneratedSql', () => {
  it('continues and stores preview findings for approved SQL', () => {
    const res = { locals: { databaseQuery: [validSql] } };
    const next = jest.fn();

    validateGeneratedSql({}, res, next);

    expect(res.locals.sqlValidation).toEqual(
      expect.objectContaining({ ok: true })
    );
    expect(next).toHaveBeenCalledWith();
  });

  it('stops execution and returns findings for rejected SQL', () => {
    const res = { locals: { databaseQuery: ['DROP TABLE users;'] } };
    const next = jest.fn();

    validateGeneratedSql({}, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 422,
        code: 'SQL_POLICY_VIOLATION',
        details: expect.any(Array),
      })
    );
  });
});
