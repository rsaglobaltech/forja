# forja

A scaffolding CLI for projects built on **hexagonal architecture**: web + mobile monorepos in TypeScript, or
a **Java API (Spring Boot or Quarkus)** with its web front end, OAuth2 and everything you need to work with
tests, CI and specifications from the first commit.

**Website: https://rsaglobaltech.github.io/forja/ · Documentation: https://rsaglobaltech.github.io/specgate/forja/getting-started.html** (forja's docs live on Specgate's site; `specgate init --forja` runs forja for you)

## Install

You need **Node.js 22 or later**. Install it globally from npm:

```bash
npm install -g @rsaglobaltech/forja
forja --version    # 1.0.7
```

Or from the tarball attached to its GitHub release:

```bash
npm install -g https://github.com/rsaglobaltech/forja/releases/download/v1.0.7/rsaglobaltech-forja-1.0.7.tgz
```

That puts the `forja` command on your PATH, on macOS, Linux and Windows; `specgate init --forja`
uses it. To update, run the same command again ([all releases](https://github.com/rsaglobaltech/forja/releases)).
To remove it: `npm uninstall -g @rsaglobaltech/forja`.

Projects that use Specgate (the `specgate` extra) get Specgate 0.20 from npm, as usual. For
`specgate init --forja` to find this forja, point it at the installed command:

```bash
export SPECGATE_FORJA_CMD=forja    # macOS / Linux; on Windows: setx SPECGATE_FORJA_CMD forja
```

From source:

```bash
npm install && npm run build && npm link     # installs the `forja` command
```

## Usage

```bash
forja init                                              # interactive wizard
forja init acme --yes                                   # Node: Next.js + Expo monorepo, defaults
forja init acme --yes --platforms web --db none         # Node, web only, in-memory repositories
forja init shop --yes --backend spring                  # Java: Spring Boot API + Next.js web app
forja init shop --yes --backend quarkus --platforms ""  # Java: Quarkus API only
forja init shop --config forja.config.json              # from a saved config; the name and flags override it
forja --version
```

## What it generates

| Backend | API | Front end | Auth | Database |
| --- | --- | --- | --- | --- |
| `node` | `packages/core` in TypeScript | Next.js (+ Expo) | built-in sessions | Drizzle + PostgreSQL |
| `spring` | `apps/api` — Spring Boot 4.1, Java 21 | Next.js 16 | OAuth2/OIDC (Keycloak) | JDBC + Flyway + PostgreSQL |
| `quarkus` | `apps/api` — Quarkus 3.40, Java 21 | Next.js 16 | OAuth2/OIDC (Keycloak) | JDBC + Flyway + PostgreSQL |

Always hexagonal. With Java you also get:

- **ArchUnit** (optional, `--archunit` / `--no-archunit`): the build fails if the domain uses the framework, if
  the application layer uses adapters, or if one module couples to another's infrastructure.
- **OAuth2**: the API is a *resource server* (JWT); the web app does *Authorization Code + PKCE* with Auth.js
  and calls the API from the server with the *access token*, which never reaches the browser. A development
  Keycloak runs in `docker compose` with a ready-made realm (users `demo/demo` and `other/other`).
- **RFC 9457 errors** with a stable `code`, **OpenAPI** and **health**.
- **Tests out of the box**: domain, use cases with test doubles, the API end to end (real PostgreSQL through
  Testcontainers or Dev Services) and a test that boots the real application without doubles.
- **Extras**: GitHub Actions CI, production Dockerfiles and
  [Specgate](https://www.npmjs.com/package/@rsaglobaltech/specgate) (specification-driven development).

Details in [`design/java-backends.md`](design/java-backends.md).

## `forja init` options

| Flag | Values |
| --- | --- |
| `--backend` | `node` · `spring` · `quarkus` |
| `--java-package` | e.g. `com.acme.shop` (default `com.<name>`) |
| `--archunit` / `--no-archunit` | architecture rules (Java) |
| `--platforms` | `web,mobile` (Java: `web`, or `""` for an API only) |
| `--db` | `postgres-docker` · `none` |
| `--auth` | `sessions` (Node) · `oauth2` (Java) · `none` |
| `--mailer` | `console` |
| `--design` | `tailwind` · `none` |
| `--tests` | `unit,integration`, plus `e2e-web`: Playwright in `apps/web` (needs web) |
| `--extras` | `lint`, `ci` (writes a GitHub Actions workflow — not on by default), `docker` (Java), `specgate` |
| `--pm` | `npm` · `pnpm` · `bun` |
| `--yes` | ask nothing: defaults plus flags |
| `--config <path>` | start from a `forja.config.json`; the name and flags override it |
| `--dry-run` | print the file tree, write nothing |
| `--skip-install`, `--skip-git` | do not install dependencies / do not run `git init` |

A value that no recipe implements is rejected with a readable error rather than ignored.

## End-to-end tests

`--tests e2e-web` adds Playwright to `apps/web`: a smoke test of the home page and the sign-in flow in
a real browser. On Node, it registers, signs out and signs in again. With a Java API, it signs in
through Keycloak (`demo` / `demo`), adds a task, marks it done and signs out, through the real API.

```bash
npx playwright install chromium   # once
docker compose up -d --wait       # Java: PostgreSQL and Keycloak
npm run test:e2e                  # Playwright starts the web app (and the API) itself
```

## After `forja init`: `forja add` and `forja doctor`

Run these anywhere inside the project; they read its `forja.config.json`.

```bash
forja add usecase orders/PlaceOrder      # the use case, its test, and its wiring
forja add entity orders/Order            # a domain entity and its test
forja add port orders/OrderRepository    # an outbound port and an in-memory adapter
forja doctor                             # tools, .env files and the architecture rules
```

| | Node (`packages/core`) | Java (`apps/api`, one module per package) |
| --- | --- | --- |
| `usecase` | `application/<module>/<Name>UseCase.ts`, exported from `index.ts`, registered in `container.ts` | `<module>/application/<Name>.java`, a bean in `<Module>Configuration` (created the first time) |
| `entity` | `domain/entities/<Name>.ts` | `<module>/domain/<Name>.java` (a record) |
| `port` | `ports/I<Name>.ts` + `InMemory<Name>` in `infrastructure/` | `<module>/application/port/<Name>.java` + `InMemory<Name>` in `infrastructure/` |

Each comes with a passing test. Nothing is overwritten: if a file exists, the command stops before
writing anything. `--dry-run` prints what would change.

**With Specgate in the project**, `add usecase` also creates the requirement (`specgate new`) and names
it in the test — `describe("REQ-003 Place order")` in TypeScript, `@DisplayName` in Java — so
`specgate check` sees the link. `--req REQ-007` names an existing requirement instead; `--no-spec`
leaves the specification alone.

`forja doctor` checks Node, the package manager, the JDK (Java), Docker (when the database, Keycloak
or Testcontainers need it), every `.env` against its `.env.example`, one React across web and mobile,
that `packages/core` imports no UI framework and its domain no infrastructure, and that Specgate is
adopted. It exits 1 when something must be fixed.

## Further reading

- [`ROADMAP.md`](ROADMAP.md) — the plan to 1.0 and its progress.
- [`docs/`](docs/) — the Java backends and the original design document
  ([`design/specification.md`](design/specification.md)).
- [`CHANGELOG.md`](CHANGELOG.md)

## Developing forja

```bash
npm test            # configuration rules, planning, and rendering of every Java combination
npm run typecheck
npm run lint
npm run dev -- init demo --yes --backend quarkus --dry-run
```

Recipes live in `src/recipes/` and their EJS templates in `templates/`. A recipe writes to an in-memory file
system; nothing touches the disk until the end.

## Licence

MIT — see [`LICENSE`](LICENSE).
