# Data Wizard architecture

## Purpose

Data Wizard converts a natural-language dataset description into PostgreSQL seed
data. The architecture keeps HTTP delivery, AI generation, SQL policy, and
database execution separate so each boundary can be tested and hardened
independently.

## Request flow

1. The React client creates a request using `shared/apiContracts.js`.
2. The Express application validates the request against the same shared
   contract before calling external services.
3. The OpenAI adapter requests a strict structured dataset draft.
4. Domain validation checks identifiers, columns, row shapes, and value types.
5. A deterministic renderer converts the validated draft to PostgreSQL.
6. The SQL policy parses the rendered SQL into an AST and approves only the
   expected CREATE SCHEMA, CREATE TABLE, and literal INSERT sequence.
7. The injected database middleware requires that recorded approval before it
   can execute SQL.
8. The HTTP layer converts the plan, policy findings, and result into the shared
   success contract.
9. The client validates the response shape before rendering it.

## Module responsibilities

### `shared/`

Owns transport-level request and response contracts. Runtime parsers protect
system boundaries, while JSDoc types and the TypeScript checker provide static
feedback without requiring an all-at-once language migration.

This layer must not import client, server, provider, or database modules.

### `client/`

Owns user interaction and presentation. It may use shared API contracts but
must not depend on server implementation modules.

### `server/app.js`

Constructs the Express application. External AI and database middleware are
required dependencies passed to `createApp`; importing this module does not
start a server, read configuration, or construct network clients.

### `server/controllers/`

Adapts HTTP request state to application operations. Controllers should remain
small and delegate generation, validation, and execution rules to services as
those layers are introduced.

### `server/adapters/`

Owns provider-specific integration. The OpenAI adapter requests strict JSON
Schema output and converts provider responses into a validated dataset plan.
Provider credentials are supplied only by the composition root.

### `server/generation/`

Owns provider-independent dataset-plan validation, versioned prompt and model
configuration, and deterministic PostgreSQL rendering. No module in this layer
opens a network connection or depends on Express.

### `server/sqlPolicy/`

Owns the fail-closed SQL execution policy. It parses PostgreSQL into an AST,
requires one idempotent schema, one idempotent table, and one literal insert,
then verifies cross-statement schema, table, and column consistency. Unknown
statements, expressions, constraints, comments, and parser failures are denied.
Limits bound statement, table, column, and row counts. Findings are returned in
the API contract for the preview workflow.

### `server/database/`

Owns bounded PostgreSQL execution. It validates connection URI shape without
echoing credentials, requires SQL policy approval, sets transaction-local
timeouts and a controlled search path, tracks transaction state for rollback,
and redacts credential-bearing driver messages before they reach HTTP errors or
logs.

### `server/config.js`

Owns startup configuration parsing and validation. Invalid configuration is
reported before external clients or listening sockets are created.

### `server/server.js`

Is the composition root and executable entry point. It loads configuration,
constructs external adapters, assembles the Express application, and starts the
listener. Importing it for tests has no startup side effect. `server/index.js`
is the deliberately small executable entry point that starts the application.

## Dependency direction

```text
client ---------> shared contracts <--------- server HTTP
                                                |
                                                v
                                      application services
                                      /        |        \
                                  AI adapter  SQL policy  PostgreSQL adapter
```

Dependencies point inward toward contracts and application rules. Provider and
database implementations must not be imported by shared contracts or client
code.

## Planned boundaries

The following issues extend this structure:

- Issue #6: generate, preview, approve, and execute client workflow.

Each boundary should expose plain inputs and outputs so its core behavior can be
tested without Express, live network access, or production credentials.
