import { describe, expect, it } from "vitest";
import { defaultJavaConfig, parseForjaConfig, type ForjaConfig } from "../src/config/schema.js";
import { planRecipes } from "../src/engine/planner.js";
import { renderProject } from "../src/engine/renderer.js";

async function render(over: Partial<ForjaConfig>, backend: "spring" | "quarkus" = "spring") {
  const config = parseForjaConfig({ ...defaultJavaConfig("acme-app", backend), javaPackage: "com.acme.app", ...over });
  const { vol, tree, executables } = await renderProject(config, planRecipes(config));
  const files = vol.toJSON() as Record<string, string>;
  const read = (p: string) => files[`/${p}`];
  return { tree, read, files, executables };
}

const combos: [string, "spring" | "quarkus", Partial<ForjaConfig>][] = [];
for (const backend of ["spring", "quarkus"] as const) {
  for (const db of ["postgres-docker", "none"] as const) {
    for (const auth of ["oauth2", "none"] as const) {
      for (const archunit of [true, false]) {
        for (const platforms of [["web"], []] as ForjaConfig["platforms"][]) {
          combos.push([`${backend} ${db} ${auth} archunit=${archunit} web=${platforms.length > 0}`, backend,
            { db, auth, archunit, platforms }]);
          if (backend === "spring") {
            combos.push([`spring reactive ${db} ${auth} archunit=${archunit} web=${platforms.length > 0}`, backend,
              { db, auth, archunit, platforms, reactive: true }]);
          }
        }
      }
    }
  }
}

describe("Java rendering", () => {
  it.each(combos)("%s: no template leftovers and the package in place", async (_, backend, over) => {
    const { tree, files, executables } = await render(over, backend);
    for (const [path, content] of Object.entries(files)) {
      expect(path, path).not.toContain("__pkg__");
      if (content === null) continue;
      expect(content, path).not.toMatch(/<%[=_-]?|%>/);
    }
    expect(tree).toContain("apps/api/src/main/java/com/acme/app/tasks/domain/Task.java");
    expect(tree).toContain("apps/api/src/test/java/com/acme/app/StartupTest.java");
    expect(executables).toContain("apps/api/mvnw");
    expect(tree.includes("apps/api/src/test/java/com/acme/app/ArchitectureTest.java")).toBe(over.archunit);
    expect(tree.includes("apps/web/package.json")).toBe((over.platforms ?? []).length > 0);
    expect(tree.includes("infra/keycloak/acme-app-realm.json")).toBe(over.auth === "oauth2");
  });

  it("domain and application import nothing from the framework", async () => {
    for (const backend of ["spring", "quarkus"] as const) {
      const { files } = await render({}, backend);
      for (const [path, content] of Object.entries(files)) {
        if (!/\/(domain|application)\/.*\.java$/.test(path) || path.includes("/test/")) continue;
        expect(content, path).not.toMatch(/import (org\.springframework|io\.quarkus|jakarta)\./);
      }
    }
  });

  it("Spring pom: dependencies follow the options", async () => {
    const full = (await render({})).read("apps/api/pom.xml");
    expect(full).toContain("spring-boot-starter-security-oauth2-resource-server");
    expect(full).toContain("testcontainers-postgresql");
    expect(full).toContain("archunit-junit5");
    const min = (await render({ db: "none", auth: "none", archunit: false, platforms: [] })).read("apps/api/pom.xml");
    expect(min).not.toMatch(/oauth2|testcontainers|archunit|flyway/);
  });

  it("Spring reactive: WebFlux + R2DBC, no servlet or JDBC repository anywhere", async () => {
    const { read, tree, files } = await render({ reactive: true });
    const pom = read("apps/api/pom.xml");
    expect(pom).toContain("spring-boot-starter-webflux");
    expect(pom).toContain("springdoc-openapi-starter-webflux-ui");
    expect(pom).toContain("r2dbc-postgresql");
    expect(pom).toContain("spring-boot-starter-webflux-test");
    // Flyway without its starter: the starter brings a JDBC pool the app would never use.
    expect(pom).not.toMatch(/webmvc|spring-boot-starter-jdbc|spring-boot-starter-flyway/);
    const api = "apps/api/src/main/java/com/acme/app";
    expect(tree).toContain(`${api}/tasks/infrastructure/persistence/R2dbcTaskRepository.java`);
    expect(tree).not.toContain(`${api}/tasks/infrastructure/persistence/JdbcTaskRepository.java`);
    expect(tree).toContain("apps/api/src/main/resources/db/migration/V1__tasks.sql");
    expect(read(`${api}/tasks/application/port/TaskRepository.java`)).toContain("Flux<Task> findByOwner(String owner);");
    expect(read(`${api}/shared/application/CurrentUser.java`)).toContain("Mono<String> id();");
    expect(read(`${api}/tasks/infrastructure/web/TaskController.java`)).toContain("Flux<TaskResponse> mine()");
    expect(read(`${api}/shared/infrastructure/security/SecurityConfiguration.java`)).toContain("SecurityWebFilterChain");
    expect(read("apps/api/src/main/resources/application.yml")).toMatch(/r2dbc:[\s\S]*flyway:/);
    expect(read("apps/api/src/test/java/com/acme/app/ArchitectureTest.java")).toContain('"io.swagger..", "reactor.."');
    for (const [path, content] of Object.entries(files)) {
      if (!path.endsWith(".java")) continue;
      expect(content, path).not.toMatch(/import (jakarta\.servlet|org\.springframework\.web\.servlet|org\.springframework\.jdbc)\./);
      // Nothing in production code blocks a thread.
      if (path.includes("/src/main/")) expect(content, path).not.toContain(".block()");
    }
  });

  it("Spring servlet stays as it was: no Reactor, no WebFlux", async () => {
    const { read, files } = await render({});
    expect(read("apps/api/pom.xml")).not.toMatch(/webflux|r2dbc/);
    expect(read("apps/api/src/test/java/com/acme/app/ArchitectureTest.java")).not.toContain("reactor..");
    for (const [path, content] of Object.entries(files)) {
      if (path.endsWith(".java")) expect(content, path).not.toContain("reactor.core");
    }
  });

  describe("Spring AI", () => {
    const api = "apps/api/src/main/java/com/acme/app/assistant";

    it("chat only: the assistant module without notes, the provider's starter and its key", async () => {
      const { read, tree } = await render({ ai: "anthropic", db: "none" });
      const pom = read("apps/api/pom.xml");
      expect(pom).toContain("<artifactId>spring-ai-bom</artifactId>");
      expect(pom).toContain("spring-ai-starter-model-anthropic");
      expect(pom).not.toContain("vector-store");
      expect(read(`${api}/application/AskAssistant.java`)).toContain("public AskAssistant(LanguageModel model)");
      expect(tree).not.toContain(`${api}/application/AddNote.java`);
      const yml = read("apps/api/src/main/resources/application.yml");
      expect(yml).toContain("chat: anthropic");
      expect(yml).toContain("api-key: ${ANTHROPIC_API_KEY:}");
      expect(yml).toContain("import: optional:file:.env[.properties]");
      expect(read("apps/api/.env.example")).toContain("ANTHROPIC_API_KEY=");
      // No vector store, no containers: the tests run without Docker.
      expect(tree.some((p) => p.endsWith("TestcontainersConfiguration.java"))).toBe(false);
    });

    it("domain and application know nothing of Spring AI", async () => {
      for (const reactive of [false, true]) {
        const { files } = await render({ reactive, ai: "openai", vectorStore: "pgvector" });
        for (const [path, content] of Object.entries(files)) {
          if (!/\/assistant\/(domain|application)\/.*\.java$/.test(path) || path.includes("/test/")) continue;
          expect(content, path).not.toMatch(/import (org\.springframework|jakarta)\./);
        }
      }
    });

    it("pgvector: the same PostgreSQL with the extension, a Flyway migration sized to the embeddings", async () => {
      const { read } = await render({ ai: "google-genai", vectorStore: "pgvector" });
      const migration = read("apps/api/src/main/resources/db/migration/V2__assistant_notes.sql");
      expect(migration).toContain("CREATE EXTENSION IF NOT EXISTS vector;");
      expect(migration).toContain("VECTOR(768)");
      expect(read("docker-compose.yml")).toContain("image: pgvector/pgvector:");
      const yml = read("apps/api/src/main/resources/application.yml");
      expect(yml).toContain("initialize-schema: false");
      expect(yml).toContain("embedding.text: google-genai");
      expect(yml).toContain("embedding-dimensions: 768");
    });

    it("reactive pgvector gets its own JDBC pool; servlet uses Boot's", async () => {
      const rx = await render({ reactive: true, ai: "openai", vectorStore: "pgvector" });
      expect(rx.tree).toContain(`${api}/infrastructure/ai/VectorsDataSourceConfiguration.java`);
      expect(rx.read("apps/api/src/main/resources/application.yml")).toContain("jdbc-url: ${DB_URL:");
      expect(rx.read(`${api}/infrastructure/ai/VectorStoreKnowledgeBase.java`)).toContain("Schedulers.boundedElastic()");
      expect(rx.read(`${api}/infrastructure/web/AssistantController.java`)).toContain('"/answers/stream"');
      const mvc = await render({ ai: "openai", vectorStore: "pgvector" });
      expect(mvc.tree).not.toContain(`${api}/infrastructure/ai/VectorsDataSourceConfiguration.java`);
    });

    it("anthropic with a vector store brings the embeddings provider's starter too", async () => {
      const { read } = await render({ ai: "anthropic", vectorStore: "qdrant", embeddings: "ollama", db: "none" });
      const pom = read("apps/api/pom.xml");
      expect(pom).toContain("spring-ai-starter-model-anthropic");
      expect(pom).toContain("spring-ai-starter-model-ollama");
      expect(pom).toContain("testcontainers-qdrant");
      const compose = read("docker-compose.yml");
      expect(compose).toContain("image: qdrant/qdrant:");
      expect(compose).toContain("image: ollama/ollama:");
      expect(compose).toMatch(/volumes:\n {2}qdrant-data:\n {2}ollama-data:/);
    });

    it("each store: its starter, its container in the tests and in compose", async () => {
      const cases = [
        ["redis", "spring-ai-starter-vector-store-redis", "image: redis:", "GenericContainer"],
        ["elasticsearch", "spring-boot-starter-elasticsearch", "elasticsearch/elasticsearch:", "ElasticsearchContainer"],
        ["qdrant", "spring-ai-starter-vector-store-qdrant", "image: qdrant/qdrant:", "QdrantContainer"],
      ] as const;
      for (const [store, starter, image, container] of cases) {
        const { read } = await render({ ai: "openai", vectorStore: store, db: "none" });
        expect(read("apps/api/pom.xml"), store).toContain(starter);
        expect(read("docker-compose.yml"), store).toContain(image);
        expect(read("apps/api/src/test/java/com/acme/app/TestcontainersConfiguration.java"), store).toContain(container);
      }
    });

    it("min-similarity is a cosine everywhere: Redis gets it on its own scale; Elasticsearch refreshes on add", async () => {
      const kb = `${api}/infrastructure/ai/VectorStoreKnowledgeBase.java`;
      for (const reactive of [false, true]) {
        const redis = await render({ reactive, ai: "openai", vectorStore: "redis", db: "none" });
        expect(redis.read(kb)).toContain("this.minSimilarity = (1 + minSimilarity) / 2;");
        const es = await render({ reactive, ai: "openai", vectorStore: "elasticsearch", db: "none" });
        expect(es.read(kb)).toContain("indices().refresh(");
        expect(es.read(kb)).toContain("this.minSimilarity = minSimilarity;");
      }
    });
  });

  it("Quarkus pom: dependencies follow the options", async () => {
    const full = (await render({}, "quarkus")).read("apps/api/pom.xml");
    expect(full).toContain("<packaging>quarkus</packaging>");
    expect(full).toMatch(/quarkus-oidc[\s\S]*quarkus-flyway|quarkus-flyway[\s\S]*quarkus-oidc/);
    expect(full).toContain("quarkus-test-security");
    const min = (await render({ db: "none", auth: "none", archunit: false }, "quarkus")).read("apps/api/pom.xml");
    expect(min).not.toMatch(/oidc|flyway|archunit/);
  });

  it("the Keycloak realm is valid JSON and the web client points at the web app", async () => {
    const realm = JSON.parse((await render({})).read("infra/keycloak/acme-app-realm.json"));
    expect(realm.realm).toBe("acme-app");
    const web = realm.clients.find((c: { clientId: string }) => c.clientId === "web");
    expect(web.redirectUris).toContain("http://localhost:3000/*");
  });

  it("the OAuth2 web app uses Auth.js and never puts the access token in the session", async () => {
    const { read } = await render({});
    expect(read("apps/web/package.json")).toContain("next-auth");
    const auth = read("apps/web/auth.ts");
    expect(auth).toMatch(/session\(\{ session, token \}\)/);
    expect(auth.split("session({ session, token })")[1].split("authorized")[0]).not.toContain("accessToken");
    expect(read("apps/web/.env.local")).toMatch(/AUTH_SECRET=.{40,}/);
    expect(read("apps/web/.env.example")).toMatch(/AUTH_SECRET=\n/);
  });

  it("Specgate: brief, guide, scripts and CI job", async () => {
    const { read } = await render({ extras: ["lint", "ci", "docker", "specgate"] });
    expect(read("docs/brief.md")).toContain("surfaces: [api, web]");
    expect(JSON.parse(read("package.json")).devDependencies["@rsaglobaltech/specgate"]).toMatch(/^\^0\./);
    expect(read(".github/workflows/ci.yml")).toContain("specgate");
  });

  it("forja.config.json reflects the configuration", async () => {
    const cfg = JSON.parse((await render({}, "quarkus")).read("forja.config.json"));
    expect(cfg).toMatchObject({ backend: "quarkus", javaPackage: "com.acme.app", archunit: true, auth: "oauth2" });
  });
});
