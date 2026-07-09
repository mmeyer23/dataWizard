# Roadmap

DataWizard is intentionally growing in small, reviewable boundaries.

## Delivered

- Preview-first generation and explicit execution confirmation.
- Deterministic dataset validation, PostgreSQL rendering, and fail-closed SQL policy.
- Shared API contracts, browser/server separation, and baseline test coverage.
- Request IDs, redacted operational logs, readiness, rate limiting, and graceful shutdown.
- Reproducible local setup, contributor guidance, and automated CI quality gates.

## Next

1. Add richer client-side schema and SQL diff previews.
2. Introduce a provider interface so compatible model providers can be tested without changing domain logic.
3. Add a deployment example with managed secrets, TLS, and external metrics.
4. Replace the in-memory rate limiter with a shared store for horizontally scaled deployments.
5. Track dependency advisories and bundle budgets as release gates.
