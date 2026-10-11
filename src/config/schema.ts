import { z } from "zod";

export const PlatformSchema = z.enum(["web", "mobile"]);
export const BackendSchema = z.enum(["node", "spring", "quarkus"]);
export const ArchSchema = z.enum(["simple", "clean", "hexagonal"]);
export const DbSchema = z.enum(["postgres-docker", "supabase", "none"]);
export const AuthSchema = z.enum(["sessions", "supabase-auth", "oauth2", "none"]);
export const MailerSchema = z.enum(["console", "resend", "smtp"]);
export const DesignSchema = z.enum(["tailwind", "none"]);
export const UiSchema = z.enum(["own", "shadcn"]);
export const TestSchema = z.enum(["unit", "integration", "e2e-web", "e2e-mobile"]);
export const ExtraSchema = z.enum([
  "lint",
  "husky",
  "ci",
  "docker",
  "i18n",
  "trigger",
  "ai",
  "storybook",
  "specgate",
]);
export const PmSchema = z.enum(["npm", "pnpm", "bun"]);

const baseConfigSchema = z.object({
  name: z
    .string()
    .regex(/^[a-z][a-z0-9-]*$/, "Nombre inválido: usar minúsculas, números y guiones"),
  scope: z.string().regex(/^@[a-z0-9-]+$/, "Scope inválido: debe empezar con @"),
  platforms: z.array(PlatformSchema),
  /** Dónde vive la lógica: `node` = packages/core en TypeScript (v0.1); `spring`/`quarkus` = apps/api en Java. */
  backend: BackendSchema.default("node"),
  /** Paquete raíz de Java (solo con backend Java). */
  javaPackage: z
    .string()
    .regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/, "Paquete Java inválido: p. ej. com.acme.tienda")
    .optional(),
  /** Reglas de arquitectura con ArchUnit (solo con backend Java). */
  archunit: z.boolean().default(false),
  arch: ArchSchema,
  db: DbSchema,
  auth: AuthSchema,
  mailer: MailerSchema,
  design: DesignSchema,
  ui: UiSchema,
  edgeFunctions: z.boolean(),
  eas: z.boolean(),
  tests: z.array(TestSchema),
  extras: z.array(ExtraSchema),
  pm: PmSchema,
});

/**
 * Reglas cruzadas de la sección 3 del spec. Se validan acá porque zod solo
 * puede expresarlas con `.superRefine` (dependen de más de un campo).
 */
export const ForjaConfigSchema = baseConfigSchema.superRefine((cfg, ctx) => {
  const fail = (path: (string | number)[], message: string) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

  const java = cfg.backend === "spring" || cfg.backend === "quarkus";

  if (!java && cfg.platforms.length === 0) {
    fail(["platforms"], "Elegí al menos una plataforma");
  }
  if (java) {
    if (cfg.platforms.includes("mobile")) {
      fail(["platforms"], "mobile con backend Java todavía no está soportado (llega en v0.3)");
    }
    if (cfg.auth !== "oauth2" && cfg.auth !== "none") {
      fail(["auth"], "con backend Java, auth = oauth2 | none");
    }
    if (cfg.db !== "postgres-docker" && cfg.db !== "none") {
      fail(["db"], "con backend Java, db = postgres-docker | none");
    }
    if (cfg.arch !== "hexagonal") {
      fail(["arch"], "el backend Java siempre es hexagonal");
    }
  } else {
    if (cfg.archunit) fail(["archunit"], "archunit requiere backend spring o quarkus");
    if (cfg.auth === "oauth2") fail(["auth"], "auth = oauth2 requiere backend spring o quarkus (v0.2)");
    if (cfg.javaPackage) fail(["javaPackage"], "javaPackage requiere backend spring o quarkus");
  }

  if (cfg.auth === "supabase-auth" && cfg.db !== "supabase") {
    fail(["auth"], "auth = supabase-auth requiere db = supabase");
  }

  if (cfg.tests.includes("e2e-mobile") && !cfg.platforms.includes("mobile")) {
    fail(["tests"], "e2e-mobile requiere la plataforma mobile");
  }

  if (cfg.edgeFunctions && cfg.db !== "supabase") {
    fail(["edgeFunctions"], "edgeFunctions requiere db = supabase");
  }
  if (cfg.edgeFunctions && cfg.auth !== "supabase-auth") {
    fail(["edgeFunctions"], "edgeFunctions requiere auth = supabase-auth");
  }

  if (cfg.ui === "shadcn" && cfg.design !== "tailwind") {
    fail(["ui"], "ui = shadcn requiere design = tailwind");
  }

  if (cfg.eas && !cfg.platforms.includes("mobile")) {
    fail(["eas"], "eas requiere la plataforma mobile");
  }

  if (cfg.platforms.includes("mobile") && !cfg.platforms.includes("web") && cfg.auth !== "none") {
    fail(
      ["platforms"],
      "mobile requiere web también en v0.1: el API de auth vive en apps/web (route handlers), no hay backend separado todavía",
    );
  }

  if (cfg.arch === "simple" && cfg.db === "none") {
    // proyecto mínimo: no es un error, solo implica que no se genera packages/core.
  }
});

export type ForjaConfig = z.infer<typeof baseConfigSchema>;

export function isJava(config: Pick<ForjaConfig, "backend">): boolean {
  return config.backend === "spring" || config.backend === "quarkus";
}

/** `com.<nombre sin guiones>` si no se indica otro. */
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

export function parseForjaConfig(input: unknown): ForjaConfig {
  return ForjaConfigSchema.parse(input);
}
