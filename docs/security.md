# Data Wizard security notes

## PostgreSQL execution model

Data Wizard executes only SQL that has passed the local SQL policy. The policy
allows one idempotent schema creation, one idempotent table creation, and one
literal `INSERT ... VALUES ... RETURNING *` statement. PostgreSQL execution
adds a second guardrail by requiring that approval record before connecting to a
database.

Generated SQL runs inside one transaction. The executor:

- validates the PostgreSQL URI shape without returning the URI in API errors;
- redacts credential-bearing driver messages before they enter application logs;
- sets bounded connection, statement, lock, and transaction timeouts;
- sets a controlled `search_path` to the approved generated schema and `pg_temp`;
- rolls back only after `BEGIN` succeeds;
- preserves the original database error when rollback or cleanup also fails.

## Recommended database role

Use a dedicated PostgreSQL role for this application. Do not provide owner,
superuser, migration, production application, or personal database credentials.

Example setup:

```sql
CREATE DATABASE data_wizard_sandbox;

CREATE ROLE data_wizard_runner
  LOGIN
  PASSWORD 'replace-with-a-secret'
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION;

GRANT CONNECT ON DATABASE data_wizard_sandbox TO data_wizard_runner;
GRANT CREATE ON DATABASE data_wizard_sandbox TO data_wizard_runner;
```

The `CREATE` permission is intentionally scoped to the sandbox database so the
application can create the generated schema and table. Use a disposable database
or a database reserved for generated sample data.

## TLS expectations

For remote databases, use TLS and prefer certificate verification. A local
development database on `localhost` can use a non-TLS connection string, but
hosted PostgreSQL providers should be configured with SSL, for example by using
the provider's recommended `sslmode=require` or stricter equivalent.

Do not paste connection strings into bug reports, screenshots, issue comments,
or logs. Rotate the database password immediately if a connection string is
shared accidentally.
