import { z } from "zod";

/*
 * Only what forja generates today is accepted here. A value the planner would
 * then reject used to pass this schema, show up in `--help`, and fail half-way
 * through; the spec's other options (Supabase, shadcn, EAS, e2e, …) come back
 * when a recipe implements them.
 */
export const PlatformSchema = z.enum(["web", "mobile"]);
export const BackendSchema = z.enum(["node", "spring", "quarkus"]);
export const ArchSchema = z.enum(["hexagonal"]);
export const DbSchema = z.enum(["postgres-docker", "none"]);
export const AuthSchema = z.enum(["sessions", "oauth2", "none"]);
export const MailerSchema = z.enum(["console"]);
export const DesignSchema = z.enum(["tailwind", "none"]);
export const UiSchema = z.enum(["own"]);
export const TestSchema = z.enum(["unit", "integration"]);
export const ExtraSchema = z.enum(["lint", "ci", "docker", "specgate"]);
export const PmSchema = z.enum(["npm", "pnpm", "bun"]);

const baseConfigSchema = z.object({
  name: z
    .string()
    .regex(/^[a-z][a-z0-9-]*$/, "Invalid name: use lowercase letters, digits and hyphens"),
  scope: z.string().regex(/^@[a-z0-9-]+$/, "Invalid scope: it must start with @"),
  platforms: z.array(PlatformSchema),
  /** Where the logic lives: `node` = packages/core in TypeScript; `spring`/`quarkus` = apps/api in Java. */
  backend: BackendSchema.default("node"),
  /** Root Java package (Java backends only). */
  javaPackage: z
    .string()
    .regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/, "Invalid Java package: e.g. com.acme.shop")
    .optional(),
  /** Architecture rules with ArchUnit (Java backends only). */
  archunit: z.boolean().default(false),
  arch: ArchSchema,
  db: DbSchema,
  auth: AuthSchema,
  mailer: MailerSchema,
  design: DesignSchema,
  ui: UiSchema,
  edgeFunctions: z.literal(false),
  eas: z.literal(false),
  tests: z.array(TestSchema),
  extras: z.array(ExtraSchema),
  pm: PmSchema,
});

/**
 * Rules that span more than one field (§3 of the spec). zod can only say them
 * with `.superRefine`.
 */
export const ForjaConfigSchema = baseConfigSchema.superRefine((cfg, ctx) => {
  const fail = (path: (string | number)[], message: string) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

  const java = cfg.backend === "spring" || cfg.backend === "quarkus";

  if (!java && cfg.platforms.length === 0) {
    fail(["platforms"], "Choose at least one platform");
  }
  if (java) {
    if (cfg.platforms.includes("mobile")) {
      fail(
        ["platforms"],
        "mobile with a Java backend is not supported yet: use --platforms web, or none for an API only",
      );
    }
    if (cfg.auth === "sessions") {
      fail(["auth"], "with a Java backend, auth is oauth2 or none");
    }
  } else {
    if (cfg.archunit) fail(["archunit"], "--archunit needs a Java backend (spring or quarkus)");
    if (cfg.auth === "oauth2") fail(["auth"], "auth oauth2 needs a Java backend (spring or quarkus)");
    if (cfg.javaPackage) fail(["javaPackage"], "--java-package needs a Java backend (spring or quarkus)");
    if (cfg.extras.includes("docker")) {
      fail(
        ["extras"],
        "docker is for Java backends; a Node project gets docker-compose with --db postgres-docker",
      );
    }
  }

  if (cfg.platforms.includes("mobile") && !cfg.platforms.includes("web") && cfg.auth !== "none") {
    fail(
      ["platforms"],
      "mobile needs web too when there is auth: the auth API lives in apps/web (route handlers)",
    );
  }
});

export type ForjaConfig = z.infer<typeof baseConfigSchema>;

export function isJava(config: Pick<ForjaConfig, "backend">): boolean {
  return config.backend === "spring" || config.backend === "quarkus";
}

/** `com.<name without hyphens>` unless another is given. */
export function javaPackageOf(config: Pick<ForjaConfig, "name" | "javaPackage">): string {
  return config.javaPackage ?? `com.${config.name.replace(/[^a-z0-9]/g, "")}`;
}

export const defaultJavaConfig = (name: string, backend: "spring" | "quarkus"): ForjaConfig => ({
  name,
  scope: `@${name}`,
  platforms: ["web"],
  backend,
  javaPackage: undefined,
  archunit: true,
  arch: "hexagonal",
  db: "postgres-docker",
  auth: "oauth2",
  mailer: "console",
  design: "tailwind",
  ui: "own",
  edgeFunctions: false,
  eas: false,
  tests: ["unit", "integration"],
  extras: ["lint", "ci", "docker", "specgate"],
  pm: "npm",
});

export const defaultConfig = (name: string): ForjaConfig => ({
  name,
  scope: `@${name}`,
  platforms: ["web", "mobile"],
  backend: "node",
  javaPackage: undefined,
  archunit: false,
  arch: "hexagonal",
  db: "postgres-docker",
  auth: "sessions",
  mailer: "console",
  design: "tailwind",
  ui: "own",
  edgeFunctions: false,
  eas: false,
  tests: ["unit", "integration"],
  extras: ["lint"],
  pm: "npm",
});

/**
 * A `ZodError` as one line per problem — `platforms: Choose at least one
 * platform` — instead of the JSON zod prints by default.
 */
export function formatConfigError(error: z.ZodError): string {
  return error.issues.map((i) => `  ${i.path.join(".") || "config"}: ${i.message}`).join("\n");
}

export function parseForjaConfig(input: unknown): ForjaConfig {
  return ForjaConfigSchema.parse(input);
}
