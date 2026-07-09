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

## Public API trust boundaries

Data Wizard treats all browser input, model output, and database driver errors
as untrusted.

Primary boundaries:

- Browser to API: requests are constrained by configured CORS origins, JSON body
  limits, request rate limits, and shared API contracts.
- API to OpenAI: prompts are sent only from validated requests. API keys stay in
  server configuration and must never be sent to the browser.
- OpenAI to SQL renderer: structured model output is parsed through domain
  validation before deterministic SQL rendering.
- SQL renderer to database: generated SQL must pass AST-based policy validation
  and explicit user confirmation before execution.
- Database to API: driver errors are mapped to safe API codes and redacted before
  logging or response handling.

## Concise threat model

| Threat                                 | Control                                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------------- |
| Cross-origin browser abuse             | Restrict `CORS_ALLOWED_ORIGINS`; requests without trusted origins are denied.                |
| Oversized request bodies               | `JSON_BODY_LIMIT` bounds request payload size and returns `REQUEST_BODY_TOO_LARGE`.          |
| Request flooding                       | In-memory rate limiting rejects excessive requests with `RATE_LIMIT_EXCEEDED`.               |
| Prompt injection producing unsafe SQL  | Structured output, domain validation, deterministic rendering, and AST allowlist validation. |
| Credential leakage through logs/errors | Request logs omit prompts and connection strings; error logs pass through redaction.         |
| Clickjacking and content sniffing      | Security headers set `X-Frame-Options`, `X-Content-Type-Options`, CSP, and related policies. |
| Unknown process shutdown state         | Readiness flips to `draining` and the HTTP server closes on `SIGTERM`/`SIGINT`.              |

## Operational configuration

Environment variables:

- `CORS_ALLOWED_ORIGINS`: comma-separated browser origins allowed to call the API.
  Defaults to local Webpack development origins.
- `JSON_BODY_LIMIT`: Express JSON payload limit. Defaults to `100kb`.
- `RATE_LIMIT_WINDOW_MS`: rate-limit window in milliseconds. Defaults to `60000`.
- `RATE_LIMIT_MAX_REQUESTS`: requests allowed per client/window. Defaults to `60`.
- `SHUTDOWN_GRACE_MS`: graceful shutdown timeout. Defaults to `10000`.

Each response includes `X-Request-Id`. Logs include the same request ID so a
request can be correlated across API layers without logging prompts or database
credentials by default.
