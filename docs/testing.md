# Data Wizard testing strategy

## Default local test command

```bash
npm test
```

Jest is configured with `watchman: false` so a clean checkout does not require a
working Watchman daemon.

## Coverage

```bash
npm run testc
```

Coverage thresholds are enforced for the highest-risk modules:

- shared API contracts;
- dataset-plan validation;
- SQL policy validation;
- PostgreSQL execution.

These modules define the boundaries that prevent unsafe model output from
becoming database writes.

## Safety evaluations

The SQL safety corpus lives in `test/evaluations/sqlSafetyCorpus.js`. It covers
valid, ambiguous, malformed, injected, and unsafe prompt/SQL pairs. Test names
include the affected layer so failures point directly at the policy boundary.

## PostgreSQL integration tests

The default test command never uses production credentials and does not require a
database. The PostgreSQL integration test is opt-in:

```bash
DATA_WIZARD_TEST_DATABASE_URL=postgres://user:password@localhost/data_wizard_test npm test -- server/database/postgresExecution.integration.test.js
```

Use only a disposable local or CI database. The test creates and drops an
isolated schema whose name starts with `dw_integration_`.
