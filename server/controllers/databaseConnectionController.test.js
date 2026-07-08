import { validateDatabaseConnection } from './databaseConnectionController';

describe('validateDatabaseConnection', () => {
  it('rejects a missing PostgreSQL URI', () => {
    const next = jest.fn();

    validateDatabaseConnection({ body: {} }, {}, next);

    expect(next).toHaveBeenCalledWith({
      log: 'validateDatabaseConnection: PostgreSQL URI not provided',
      status: 400,
      code: 'POSTGRESQL_URI_REQUIRED',
      message: { err: 'A PostgreSQL connection URI is required.' },
    });
  });

  it('rejects a blank PostgreSQL URI', () => {
    const next = jest.fn();

    validateDatabaseConnection(
      { body: { postgreSqlUri: '   ' } },
      {},
      next
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'POSTGRESQL_URI_REQUIRED' })
    );
  });

  it('continues for a non-empty PostgreSQL URI', () => {
    const next = jest.fn();

    validateDatabaseConnection(
      { body: { postgreSqlUri: 'postgres://localhost/test' } },
      {},
      next
    );

    expect(next).toHaveBeenCalledWith();
  });
});
