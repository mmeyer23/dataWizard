import {
  DEFAULT_POSTGRES_EXECUTION_OPTIONS,
  executeValidatedSql,
  redactSensitiveText,
  validatePostgreSqlUri,
} from './postgresExecution.js';

const safeSql = 'CREATE SCHEMA IF NOT EXISTS "sample_data";';
const sqlValidation = {
  ok: true,
  summary: {
    schemaName: 'sample_data',
    tableName: 'records',
  },
};

const createMockClientClass = ({
  connect = jest.fn().mockResolvedValue(undefined),
  query = jest.fn().mockResolvedValue({ rows: [] }),
  end = jest.fn().mockResolvedValue(undefined),
} = {}) => {
  const instances = [];
  const Client = jest.fn(function MockClient(config) {
    this.config = config;
    this.connect = connect;
    this.query = query;
    this.end = end;
    instances.push(this);
  });

  Client.instances = instances;
  Client.connect = connect;
  Client.query = query;
  Client.end = end;

  return Client;
};

describe('validatePostgreSqlUri', () => {
  it('accepts PostgreSQL URIs after trimming whitespace', () => {
    expect(
      validatePostgreSqlUri(' postgresql://user:secret@localhost/app ')
    ).toEqual({
      ok: true,
      connectionString: 'postgresql://user:secret@localhost/app',
    });
  });

  it.each([
    undefined,
    '',
    'https://localhost/app',
    'postgres://localhost',
    'not a uri',
  ])('rejects invalid PostgreSQL URI shape %#', (connectionString) => {
    expect(validatePostgreSqlUri(connectionString).ok).toBe(false);
  });
});

describe('redactSensitiveText', () => {
  it('removes connection strings and password query parameters', () => {
    expect(
      redactSensitiveText(
        'failed for postgres://user:secret@db.example/app?password=secret'
      )
    ).toBe('failed for postgres://[redacted]');
  });
});

describe('executeValidatedSql', () => {
  const connectionString = 'postgres://user:secret@localhost/app';

  it('configures bounded connection and query execution', async () => {
    const Client = createMockClientClass();

    await executeValidatedSql({
      connectionString,
      sql: safeSql,
      sqlValidation,
      Client,
    });

    expect(Client).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionString,
        application_name: 'data-wizard',
        connectionTimeoutMillis:
          DEFAULT_POSTGRES_EXECUTION_OPTIONS.connectionTimeoutMillis,
        query_timeout:
          DEFAULT_POSTGRES_EXECUTION_OPTIONS.statementTimeoutMillis,
        statement_timeout:
          DEFAULT_POSTGRES_EXECUTION_OPTIONS.statementTimeoutMillis,
        lock_timeout: DEFAULT_POSTGRES_EXECUTION_OPTIONS.lockTimeoutMillis,
      })
    );
  });

  it('sets a controlled transaction search path before generated SQL', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const Client = createMockClientClass({ query });

    await executeValidatedSql({
      connectionString,
      sql: safeSql,
      sqlValidation,
      Client,
    });

    expect(query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(query).toHaveBeenNthCalledWith(
      2,
      'SET LOCAL search_path TO "sample_data", pg_temp'
    );
    expect(query).toHaveBeenCalledWith(safeSql);
    expect(query).toHaveBeenLastCalledWith('COMMIT');
  });

  it('rejects execution when SQL policy approval is missing', async () => {
    const Client = createMockClientClass();

    await expect(
      executeValidatedSql({
        connectionString,
        sql: safeSql,
        sqlValidation: null,
        Client,
      })
    ).rejects.toMatchObject({
      code: 'SQL_VALIDATION_REQUIRED',
      safeMessage: 'SQL policy approval is required before execution.',
    });

    expect(Client).not.toHaveBeenCalled();
  });

  it('rejects approved SQL without a safe target schema', async () => {
    await expect(
      executeValidatedSql({
        connectionString,
        sql: safeSql,
        sqlValidation: { ok: true, summary: { schemaName: 'bad-schema' } },
        Client: createMockClientClass(),
      })
    ).rejects.toMatchObject({
      code: 'SQL_VALIDATION_REQUIRED',
    });
  });

  it('does not rollback when connection fails before BEGIN', async () => {
    const connect = jest
      .fn()
      .mockRejectedValue(new Error(`connect failed ${connectionString}`));
    const query = jest.fn();
    const end = jest.fn();
    const Client = createMockClientClass({ connect, query, end });

    await expect(
      executeValidatedSql({
        connectionString,
        sql: safeSql,
        sqlValidation,
        Client,
      })
    ).rejects.toMatchObject({
      code: 'DATABASE_QUERY_FAILED',
      safeLog: expect.not.stringContaining('secret'),
    });

    expect(query).not.toHaveBeenCalledWith('ROLLBACK');
    expect(end).not.toHaveBeenCalled();
  });

  it('rolls back only after BEGIN succeeds', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('insert failed'))
      .mockResolvedValueOnce(undefined);
    const Client = createMockClientClass({ query });

    await expect(
      executeValidatedSql({
        connectionString,
        sql: safeSql,
        sqlValidation,
        Client,
      })
    ).rejects.toMatchObject({
      code: 'DATABASE_QUERY_FAILED',
    });

    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
  });

  it('preserves the original failure when rollback also fails', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('search path failed'))
      .mockRejectedValueOnce(new Error('rollback failed'));
    const Client = createMockClientClass({ query });

    await expect(
      executeValidatedSql({
        connectionString,
        sql: safeSql,
        sqlValidation,
        Client,
      })
    ).rejects.toMatchObject({
      code: 'DATABASE_QUERY_FAILED',
      cause: expect.objectContaining({ message: 'search path failed' }),
      cleanupError: expect.objectContaining({ message: 'rollback failed' }),
    });
  });

  it('maps statement timeouts to a specific error code', async () => {
    const never = new Promise(() => {});
    const query = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockReturnValueOnce(never);
    const Client = createMockClientClass({ query });
    const promise = executeValidatedSql({
      connectionString,
      sql: safeSql,
      sqlValidation,
      Client,
      options: { statementTimeoutMillis: 10 },
    });

    await expect(promise).rejects.toMatchObject({
      code: 'DATABASE_STATEMENT_TIMEOUT',
    });
  });
});
