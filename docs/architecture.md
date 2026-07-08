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
3. The injected AI middleware generates SQL.
4. The injected database middleware applies the current checks and executes the
   SQL. Issue #2 will replace those checks with a deterministic policy parser.
5. The HTTP layer converts the result into the shared success contract.
6. The client validates the response shape before rendering it.

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

- Issue #4: structured dataset planning and AI provider adapter.
- Issue #2: deterministic SQL parser and policy validator.
- Issue #3: bounded PostgreSQL execution service.
- Issue #6: generate, preview, approve, and execute client workflow.

Each boundary should expose plain inputs and outputs so its core behavior can be
tested without Express, live network access, or production credentials.
