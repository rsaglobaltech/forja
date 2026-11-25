# Java backends (Spring Boot and Quarkus)

Besides the TypeScript backend (`backend: node`, the v0.1 one), forja
generates a **separate Java API** in `apps/api`, on the same principle:
hexagonal architecture, always.

## Options

| Field | Values | Default with Java |
| --- | --- | --- |
| `backend` | `node` · `spring` · `quarkus` | — |
| `javaPackage` | e.g. `com.acme.shop` | `com.<name>` |
| `archunit` | `true` · `false` | `true` |
| `reactive` | `true` · `false` (Spring only) | `false` |
| `auth` | `oauth2` · `none` | `oauth2` |
| `db` | `postgres-docker` · `none` | `postgres-docker` |
| `platforms` | `web` (optional) | `["web"]` |
| `extras` | `lint`, `ci`, `docker`, `specgate` | `lint`, `docker`, `specgate` (`ci` is opt-in) |

## What it generates

```
apps/api/                     # Spring Boot 4.1 or Quarkus 3.40, Java 21, Maven Wrapper
  src/main/java/<package>/
    shared/                   # domain errors, Problem Details (RFC 9457), current user
    tasks/                    # sample module, hexagonal:
      domain/                 #   Task, TaskTitle — plain Java
      application/            #   use cases and ports (TaskRepository, CurrentUser)
      infrastructure/         #   REST, JDBC/in-memory, configuration
  src/test/java/...           # domain, use cases, API, real boot, ArchUnit
apps/web/                     # Next.js 16 + Auth.js (Keycloak) consuming the API
infra/keycloak/<name>-realm.json     # development realm: web and dev-cli clients, demo/other users
docker-compose.yml            # Postgres + Keycloak
.github/workflows/ci.yml      # with --extras ci: API (Maven) + web (Node)
docs/brief.md + Specgate      # with the `specgate` extra
```

## Decisions

- **Hexagonal, with no framework annotations in the domain or the application
  layer**: use cases are instantiated in `infrastructure/config`. With
  `archunit`, a test enforces it.
- **OAuth2/OIDC with Keycloak**: the API is a *resource server* (it validates
  the JWT and takes the user from `sub`); the web app does *Authorization
  Code + PKCE* with Auth.js and calls the API with the *access token*.
- **Errors as RFC 9457** (`application/problem+json`) with a stable `code`.
- **A test that boots the real application** without doubles (a lesson from
  the Specgate pilots: green tests while the app would not even start).
- **OpenAPI and health** out of the box.

## Reactive Spring (`--reactive`)

Same architecture, another stack: WebFlux on Netty, R2DBC over PostgreSQL, and Reactor in the ports and use
cases, so nothing blocks between the HTTP request and the database.

- **Domain**: unchanged and shared with the servlet stack — pure Java; ArchUnit forbids Reactor there too.
- **Application**: ports return `Mono`/`Flux` (`TaskRepository`, and `CurrentUser.id()` as `Mono<String>`,
  because under WebFlux the user lives in the Reactor context, not in a thread-local). Use cases compose them
  and raise domain errors as error signals. Reactor is the one library allowed in this layer.
- **Infrastructure**: annotated controllers returning `Mono`/`Flux`, `DatabaseClient` (R2DBC), a
  `SecurityWebFilterChain` resource server with an RFC 9457 entry point, and CORS as the first `WebFilter`
  so a browser's preflight is answered before security.
- **Migrations**: Flyway still runs over JDBC at startup (it has no R2DBC driver), through
  `spring-boot-flyway` rather than its starter, which would add a JDBC pool the app never uses. The
  migration file is the same one as the servlet stack.
- **Tests**: `StepVerifier` for the use cases, `WebTestClient` for the API, Testcontainers with both URLs
  (R2DBC and JDBC) pointing at one PostgreSQL.
- **`forja add usecase`** generates `Mono<Void> execute()` and a `StepVerifier` test.

## Tested

Every combination (backend × database × auth × ArchUnit × web) is rendered in forja's tests. On top of that,
six representative combinations are generated and tested for real (Maven, Next.js build, lint, Docker), and
the full combination was tested in a real browser: Keycloak sign-in, creating and completing tasks,
federated sign-out, isolation between users, and a public session with no tokens.

## Requesting a token by hand (development)

```bash
curl -s -d grant_type=password -d client_id=dev-cli -d username=demo -d password=demo \
  http://localhost:8180/realms/<name>/protocol/openid-connect/token | jq -r .access_token
```
