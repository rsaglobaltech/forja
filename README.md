# forja

A scaffolding CLI for projects built on **hexagonal architecture**: web + mobile monorepos in TypeScript, or
a **Java API (Spring Boot or Quarkus)** with its web front end, OAuth2 and everything you need to work with
tests, CI and specifications from the first commit.

## Install

Once published:

```bash
npm install -g @rsaglobaltech/forja    # or, without installing: npx @rsaglobaltech/forja init
```

Until then, from source:

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

Details in [`docs/java-backends.md`](docs/java-backends.md).

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
| `--tests` | `unit,integration` |
| `--extras` | `lint`, `ci` (writes a GitHub Actions workflow — not on by default), `docker` (Java), `specgate` |
| `--pm` | `npm` · `pnpm` · `bun` |
| `--yes` | ask nothing: defaults plus flags |
| `--config <path>` | start from a `forja.config.json`; the name and flags override it |
| `--dry-run` | print the file tree, write nothing |
| `--skip-install`, `--skip-git` | do not install dependencies / do not run `git init` |

A value that no recipe implements is rejected with a readable error rather than ignored.

## Further reading

- [`ROADMAP.md`](ROADMAP.md) — the plan to 1.0 and its progress.
- [`docs/`](docs/) — the Java backends and the original design document
  ([`docs/design/specification.md`](docs/design/specification.md)).
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
