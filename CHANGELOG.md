# Changelog

## [Unreleased]

- **Package renamed** `@rsaglobaltech/forja` (the name `forja` on npm is taken), under the **MIT licence**,
  with `prepublishOnly` (build, typecheck, test).
- `forja --version`.
- `--config` combines with the name argument and the flags: the name and any flag given override the file.
- The wizard, the flags and the configuration schema offer only what a recipe implements; anything else
  (e.g. `--tests e2e-web`) is rejected with a readable error instead of being silently ignored.
- `forja add` and `forja doctor` stubs removed until they are implemented.
- **Specgate** pinned to `^0.19.1`; the generated `docs/specgate.md` rewritten for the `specgate draft` flow,
  and the closing steps point to `specgate draft` when a brief is present.
- **Everything in English**: CLI prompts and messages, README, CHANGELOG, `docs/`, template comments and the
  text of the generated apps. The original design document moved to `docs/design/specification.md`.
- The development Keycloak realm's second demo user is now `other` (was `otra`).
- `npm run lint` works for forja itself.

## 0.2.0 — 2026-10-11

- **Java backends**: `--backend spring` (Spring Boot 4.1) and `--backend quarkus` (Quarkus 3.40), Java 21,
  in `apps/api`, always hexagonal, with a sample module (`tasks`) whose domain and application layers are
  plain Java and shared between both.
- Optional **ArchUnit** with the hexagonal rules.
- **OAuth2/OIDC**: the API as a *resource server* + a development Keycloak realm + sign-in on the web app
  with Auth.js (the token stays on the server; federated sign-out).
- **Next.js 16 web app** for Java backends.
- **PostgreSQL**: JDBC + Flyway; tests against a real PostgreSQL (Testcontainers / Dev Services).
  Configurable port (`DB_PORT`).
- **Extras**: `ci` (GitHub Actions), `docker` (production Dockerfiles), `specgate` (brief, guide, automatic
  adoption).
- RFC 9457 errors, OpenAPI, health and a real-boot test in every Java project.
- forja: its own tests (vitest), `--skip-install`, `--skip-git`, `copyDir` with path mapping, executable
  files.

## 0.1.0

- Web (Next.js) + mobile (Expo) monorepo with a hexagonal `packages/core` in TypeScript, built-in sessions,
  Drizzle + PostgreSQL, Tailwind/NativeWind.
