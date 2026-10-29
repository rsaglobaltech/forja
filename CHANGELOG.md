# Changelog

## [Unreleased]

## [1.0.7] — 2026-10-29

### Fixed

- Generated projects depend on Specgate 0.27.9 when forja runs on its own.

## [1.0.6] — 2026-10-28

### Fixed

- **`forja init <name>` inside the project's own repository generates there.** In a folder named like
  the project that holds `.git` or the client's `brief.md` — the cloned repository, where a project
  naturally starts — it created `<name>/<name>`. It now writes into the folder and says so; a folder
  of that name already inside keeps the old behaviour.
- **Without a terminal, `forja init` says what it needs.** Run with its output captured and neither
  `--yes` nor `--config`, the wizard died in @clack with `ERR_TTY_INIT_FAILED` and a stack trace; it
  now names `--yes` and `--config` and exits 1.
- **A new Java project starts with no known vulnerability.** Spring Boot 4.1.2, whose Tomcat 11.0.27
  and Jackson 2.21.7 / 3.1.7 OSV lists clean; 4.1.1 gave 18. CI now scans the generated projects'
  dependencies with osv-scanner, so a stale pin fails there and not in the user's first baseline.
- **A failed install fails `forja init`.** The project was written and the next steps said to run the
  install, but the command exited 0, so a script or CI carried on to tests with no dependencies; it now
  exits 1.
- Generated projects depend on Specgate 0.27.8 when forja runs on its own.

## [1.0.5] — 2026-10-28

### Fixed

- **A build leaves the tree clean.** The generated `.gitignore` lists `next-env.d.ts` and
  `*.tsbuildinfo`, which Next.js and TypeScript write on every `npm test`: left untracked, they made
  Specgate's harness refuse to start on a dirty tree.
- Generated projects depend on Specgate 0.27.6 when forja runs on its own.

## [1.0.4] — 2026-10-28

### Fixed

- **The generated project's npm scripts run on Windows.** `test:api`, `arch` and `dev:api` called
  `./mvnw`, which cmd.exe — what npm runs scripts with on Windows — cannot run: `npm test`, `npm run
  arch` and Specgate's gate failed with "'.' is not recognized as an internal or external command".
  They now go through `scripts/mvnw.mjs`, which calls the wrapper by its full path on every platform.

### Added

- **CI on Linux, Windows and macOS**, plus the generated project's architecture check and web build
  on Windows, and **CD**: a `vX.Y.Z` tag tests, packs and publishes the GitHub release with the
  tarball and the changelog entry.

## [1.0.3] — 2026-10-28

### Fixed

- Generated projects depend on Specgate 0.27.3 when forja runs on its own.

- `forja init` generates into a folder that already holds a repository and a client's brief, the
  way a project starts: what the folder holds is kept, and only a file forja would overwrite stops
  it, named. It refused any folder with a file in it ("already exists and is not empty"), so a brief
  pushed first had to be merged back with `--allow-unrelated-histories`.

## [1.0.2] — 2026-10-28

### Fixed

Found building truck-flote, a Spring Boot and Next.js project, with Specgate 0.27.1:

- Generated projects depended on Specgate `^0.20.0`, which for a 0.x version means `<0.21.0`:
  `npx specgate` ran 0.20.0, seven minors behind. They now get 0.27.1, or the Specgate that
  called forja (`specgate init --forja` passes `SPECGATE_VERSION`).
- ESLint linted Maven's `target/` and Gradle's `build/`: once JaCoCo wrote its HTML report, `lint`
  failed with 929 errors in it. Both are ignored.
- `--dry-run` into a folder that holds files printed the tree; the real run then refused. The dry
  run now refuses the same way.
- Without a terminal (a pipe, a log), the spinner wrote hundreds of frames; it now prints the start
  and the end once each.
- `forja doctor` on Windows missed infrastructure imports in the domain: it compared the path with
  `/src/domain/` and Windows writes backslashes.

## [1.0.1] — 2026-10-25

### Fixed

- `--pm pnpm` now writes `pnpm-workspace.yaml` (with `linkWorkspacePackages: true`). pnpm ignores
  package.json `workspaces`, so it installed only the root: `npm test` failed with "vitest" not
  found and the Specgate harness, which installs with the lockfile's manager, failed every attempt.

## [1.0.0] — 2026-10-12

The first stable release: phases 1–6 of [`ROADMAP.md`](ROADMAP.md). Generated projects pin
Specgate 0.20.

- forja's documentation moved to Specgate's site (ADR-0033 in Specgate): this site keeps the landing
  page, and every former documentation URL redirects to its page there. `specgate init --forja` and
  `specgate add` run forja for you.

### The architecture in Specgate's gate (ADR-0033, phase A)

- `npm run arch` in every generated project that has rules to check: on Node a dependency-free
  `scripts/check-architecture.mjs` with the core's import rules; on Java the ArchUnit test alone.
- With Specgate, the install sets `arch_cmd` to it, so `specgate check`, `done` and the harness gate
  run the architecture before the tests (Specgate 0.20+; an older one ignores it).

### Phase 5 — the website

- Published at https://rsaglobaltech.github.io/forja/ by GitHub Pages from `docs/` on `main`
  (`npm run site:publish`); the design notes moved from `docs/` to `design/`.

- `site/`: a landing page and ten documentation pages (start, reference, background) on Specgate's
  design system, with search and both themes. `npm run site` builds it into `_site/`, a static folder
  for any host.
- `forja init` ends in the same frame as `add` and `doctor`: the next steps in a box.
- Fixed: `--backend` with `--config` was ignored; an unknown `--backend` silently became Node; a Java
  backend accepted `--pm pnpm|bun` although its scripts call npm.
- Fixed in the generated project: README links and the `forja add port` example, the core import
  rule's wording (checked by `forja doctor`), the Keycloak realm file name, the Quarkus Swagger path,
  `docs/specgate.md`'s module path, and no "PostgreSQL" in the Quarkus next steps (Dev Services
  starts its own). `forja.config.json` no longer points at a schema URL that does not exist.

### Phase 4 — end to end

- `--tests e2e-web`: Playwright 1.63 in `apps/web`, with `npm run test:e2e` at the root. A smoke test
  of the home page, plus the sign-in flow: Node sessions (register, sign out, sign in, a wrong
  password refused, a private page redirected) or, with a Java API, Keycloak sign-in, a task added and
  marked done through the API, and sign-out. Playwright starts the web app, and the API on Java.
- The wizard offers it when there is a web app; the generated CI (the `ci` extra) gets an `e2e` job.
- The docker-compose Keycloak has a healthcheck: `docker compose up --wait` now waits for the realm
  instead of returning while Keycloak is still starting.
- `scripts/verify-generated.sh` runs the end-to-end tests on all three paths.

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
