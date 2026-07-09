# DataWizard contributor guidance

## Workflow

- Work from a feature branch; do not develop directly on `dev`.
- Keep changes focused on one GitHub issue and reference it with `Refs #<number>` in commits.
- Run `npm run verify` before opening a pull request.
- Do not add credentials, database URLs, generated bundles, coverage output, or screenshots containing secrets.

## Architecture

Keep the dependency direction documented in [`docs/architecture.md`](docs/architecture.md): shared contracts are provider-neutral, the client talks to the HTTP boundary, and AI/database adapters stay behind server composition and policy layers.

## Security

Treat browser input, model output, SQL, and database errors as untrusted. Review [`docs/security.md`](docs/security.md) before changing request handling or database execution.
