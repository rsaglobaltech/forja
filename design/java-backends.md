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
| `ai` | `none` · `anthropic` · `openai` · `ollama` · `google-genai` (Spring only) | `none` |
| `vectorStore` | `none` · `pgvector` · `qdrant` · `redis` · `elasticsearch` (needs `ai`) | `none` |
| `embeddings` | `openai` · `ollama` · `google-genai` (with a vector store) | the `ai` provider |
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

## Spring AI (`--ai`, `--vector-store`)

Spring AI 2.0.3 on Spring Boot 4.1.3, servlet or reactive. It adds an `assistant` module with the same
hexagon as `tasks`:

- **Domain**: `Question`, `Answer` and, with a vector store, `Note` and `Passage`. Pure Java.
- **Application**: ports `LanguageModel` and `KnowledgeBase`; use cases `AskAssistant` and `AddNote`. The
  retrieval is in the use case, not hidden in an advisor: when nothing in the user's notes is close enough
  (`app.assistant.min-similarity`), the model is not asked — no cost and nothing made up. Reactive: `Reply`
  carries the sources and a `Flux` of tokens.
- **Infrastructure**: `ChatClient` (streamed in reactive), the vector store with every note tagged with its
  owner and every search filtered by it (one user's notes never reach another's answers). Reactive runs the
  blocking `VectorStore` on `boundedElastic`. REST: `POST /api/assistant/notes`, `POST /api/assistant/answers`
  (JSON) and, in reactive, `POST /api/assistant/answers/stream` (Server-Sent Events).

Decisions worth knowing:

- **No call to the provider at startup.** Spring AI learns the embedding size by embedding a test string
  when it creates the index (OpenAI and Ollama do not declare it). The size is fixed in
  `app.ai.embedding-dimensions` instead (OpenAI `text-embedding-3-small` 1536, Ollama `nomic-embed-text` 768,
  Gemini asked for 768 rather than its 3072, over pgvector's HNSW limit).
- **One provider per kind** (`spring.ai.model.chat`, `.embedding`, `.embedding.text`): with Anthropic plus
  another provider's embeddings, both starters are present and each would otherwise register a model.
- **pgvector**: same PostgreSQL (`pgvector/pgvector` image), the table created by Flyway
  (`V2__assistant_notes.sql`, sized to the embeddings). Reactive gets a small JDBC pool of its own, since Boot
  creates no `DataSource` next to R2DBC.
- **Redis** needs Jedis (`spring.data.redis.client-type: jedis`) and its metadata declared: `owner` (a tag,
  to filter on) and `title` (otherwise it is not returned).
- **`app.assistant.min-similarity` is a cosine similarity** for every store. pgvector, Qdrant and
  Elasticsearch compare against the cosine; Spring AI's Redis store against `(1 + cosine) / 2`, so its
  adapter converts — without it, 0.4 on Redis lets almost anything through and the model is always asked.
- **Elasticsearch** makes a write searchable on its next refresh (~1 s): the adapter refreshes the index
  after adding a note, so it is usable at once.
- **Keys** live in `apps/api/.env` (git-ignored, read through `spring.config.import`); Ollama needs none and
  pulls its models into the compose service on first start.
- **Tests make no network call and spend nothing**: use cases with doubles; the API tests use deterministic
  fake models (`FakeAiConfiguration`) against the real vector store in Testcontainers; `StartupTest` builds the
  real provider and store beans with placeholder keys (`src/test/resources/config/application.properties`).

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
