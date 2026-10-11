import { z } from "zod";

export const PlatformSchema = z.enum(["web", "mobile"]);
export const ArchSchema = z.enum(["simple", "clean", "hexagonal"]);
export const DbSchema = z.enum(["postgres-docker", "supabase", "none"]);
export const AuthSchema = z.enum(["sessions", "supabase-auth", "none"]);
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
]);
export const PmSchema = z.enum(["npm", "pnpm", "bun"]);

const baseConfigSchema = z.object({
  name: z
    .string()
    .regex(/^[a-z][a-z0-9-]*$/, "Nombre inválido: usar minúsculas, números y guiones"),
  scope: z.string().regex(/^@[a-z0-9-]+$/, "Scope inválido: debe empezar con @"),
  platforms: z.array(PlatformSchema).min(1, "Elegí al menos una plataforma"),
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

export const defaultConfig = (name: string): ForjaConfig => ({
  name,
  scope: `@${name}`,
  platforms: ["web", "mobile"],
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
