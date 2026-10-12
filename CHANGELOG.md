# Changelog

## [Unreleased]

### Phase 3 — daily use after `forja init`

- `forja add usecase <module>/<Name>`, `forja add entity` and `forja add port` on both paths. Node:
  the use case is exported from the core's `index.ts` and registered in `container.ts` through its AST.
  Java: the bean joins `<Module>Configuration` (Spring `@Bean` or CDI `@Produces`), which is created for
  a new module; ArchUnit's rules hold. Every file comes with a passing test; nothing is overwritten.
- With Specgate adopted, `add usecase` creates the requirement with `specgate new` and names its
  `REQ-xxx` in the test; `--req` names an existing one, `--no-spec` skips it.
- `forja doctor`: Node, the package manager, the JDK, Docker, `.env` against `.env.example`, one React,
  the core's import rule, Specgate adopted.
- Fixed: the install adopted Specgate with `specgate init`, which scaffolds a new project in a
  subdirectory; it now runs `specgate adopt --no-capabilities`.

### Phase 2 — the Node path, up to date

- Next 16.4, React 19.2.3 (one copy for the root, web and mobile — the version
  Expo pins), Expo SDK 57 with React Native 0.86, Reanimated 4, NativeWind 4.2,
  Tailwind 4.3 on the web, zod 4, vitest 5, drizzle 0.45, TypeScript 6,
  ESLint 10 on both paths.
- The web app builds with `--webpack` (Turbopack does not map the core's `.js`
  imports to `.ts`), and Next 16's `proxy.ts` replaces `middleware.ts`.
- The mobile app: Expo's own monorepo support replaces the hand-written Metro
  paths, `NODE_PATH` and the `link-expo` symlink; the Android package id is
  valid when the scope has hyphens; `newArchEnabled` is gone (always on).
- Fixed: a project with `--auth none` failed `tsc` (bcryptjs missing), and one
  with `--db none` failed lint (an unused import).
- `ci` is no longer a default extra: it writes a GitHub Actions workflow, which
  spends paid minutes on a private repository.
- `scripts/verify-generated.sh node|spring|quarkus` generates a project and
  proves it works: install, tests, typecheck, lint, the web app's production
  build and, on Node, the mobile app bundled for iOS, Android and web plus
  `expo-doctor`.

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
