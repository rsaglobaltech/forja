import type { RecipeContext } from "../engine/context.js";
import { embeddingsOf, javaPackageOf, type ForjaConfig } from "../config/schema.js";

/** Pinned versions of what the Java recipes generate (reviewed 2026-10-11; Spring AI and its stores 2026-11-25). */
export const versions = {
  springBoot: "4.1.3",
  /** Spring AI 2.0.x is built on Boot 4.1; 2.1 needs Boot 4.2. */
  springAi: "2.0.3",
  springdoc: "3.1.1",
  quarkus: "3.40.1",
  archunit: "1.5.1",
  assertj: "3.27.6",
  specgate: "0.27.9",
  keycloak: "26.8",
  postgres: "17-alpine",
  pgvector: "0.8.7-pg17",
  qdrant: "v1.20.2",
  redis: "8.8.4",
  elasticsearch: "9.4.9",
  ollama: "0.40.18",
} as const;

/** What the Spring AI templates need, resolved once. */
export interface AiData {
  chat: Exclude<ForjaConfig["ai"], "none">;
  store: ForjaConfig["vectorStore"];
  /** Only with a vector store. */
  embeddings?: "openai" | "ollama" | "google-genai";
  /**
   * Fixed so nothing calls the model at startup: Spring AI otherwise embeds a test string to learn the
   * size when it creates the index. Gemini is asked for 768 (it defaults to 3072, over pgvector's HNSW limit).
   */
  dimensions?: number;
  /** The provider's starter artifacts (chat, and embeddings when they come from another provider). */
  starters: string[];
  /** Containers the stack needs in tests and in docker compose. */
  ollama: boolean;
}

const dimensionsOf = { openai: 1536, ollama: 768, "google-genai": 768 } as const;

export function aiData(config: ForjaConfig): AiData | undefined {
  if (config.ai === "none") return undefined;
  const embeddings = config.vectorStore === "none" ? undefined : embeddingsOf(config);
  const starterOf = (provider: string, kind: "chat" | "embedding") =>
    provider === "google-genai"
      ? kind === "chat" ? "spring-ai-starter-model-google-genai" : "spring-ai-starter-model-google-genai-embedding"
      : `spring-ai-starter-model-${provider}`;
  const starters = [starterOf(config.ai, "chat")];
  if (embeddings) {
    const starter = starterOf(embeddings, "embedding");
    if (!starters.includes(starter)) starters.push(starter);
  }
  return {
    chat: config.ai,
    store: config.vectorStore,
    embeddings,
    dimensions: embeddings ? dimensionsOf[embeddings] : undefined,
    starters,
    ollama: config.ai === "ollama" || embeddings === "ollama",
  };
}

/** docker compose for the development services: PostgreSQL, Keycloak, a vector store, Ollama. */
export function needsCompose(config: ForjaConfig): boolean {
  const ai = config.backend === "spring" ? aiData(config) : undefined;
  return (
    config.db === "postgres-docker" ||
    config.auth === "oauth2" ||
    (ai !== undefined && (ai.ollama || (ai.store !== "none" && ai.store !== "pgvector")))
  );
}

export interface JavaData extends Record<string, unknown> {
  pkg: string;
  pkgPath: string;
  dbName: string;
  versions: typeof versions;
  ai?: AiData;
  /** The tests start containers (Testcontainers): PostgreSQL, or a vector store of its own. */
  containers: boolean;
}

export function javaData(ctx: RecipeContext): JavaData {
  const pkg = javaPackageOf(ctx.config);
  const ai = ctx.config.backend === "spring" ? aiData(ctx.config) : undefined;
  const containers =
    ctx.config.db === "postgres-docker" || (ai !== undefined && ai.store !== "none" && ai.store !== "pgvector");
  return { pkg, pkgPath: pkg.replace(/\./g, "/"), dbName: ctx.config.name.replace(/-/g, "_"), versions, ai, containers };
}

/** Copies a Java template directory, turning `__pkg__` into the package path. */
export function copyJava(ctx: RecipeContext, src: string, dest: string, data: JavaData): void {
  ctx.copyDir(src, dest, data, (rel) => rel.replace("__pkg__", data.pkgPath));
}

export function copyMavenWrapper(ctx: RecipeContext, dest: string): void {
  ctx.copyFile("java-wrapper/mvnw", `${dest}/mvnw`);
  ctx.copyFile("java-wrapper/mvnw.cmd", `${dest}/mvnw.cmd`);
  ctx.copyFile("java-wrapper/.mvn/wrapper/maven-wrapper.properties", `${dest}/.mvn/wrapper/maven-wrapper.properties`);
  ctx.markExecutable(`${dest}/mvnw`);
}
