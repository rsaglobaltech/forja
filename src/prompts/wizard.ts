import * as p from "@clack/prompts";
import { parseForjaConfig, type ForjaConfig } from "../config/schema.js";

function detectPm(): "npm" | "pnpm" | "bun" {
  const ua = process.env.npm_config_user_agent ?? "";
  if (ua.startsWith("pnpm")) return "pnpm";
  if (ua.startsWith("bun")) return "bun";
  return "npm";
}

function cancelAndExit(): never {
  p.cancel("Cancelado.");
  process.exit(1);
}

/**
 * v0.1 solo implementa un subconjunto de las opciones del spec completo
 * (arch=hexagonal, ui=own quedan fijas todavía). El wizard únicamente
 * pregunta lo que ya tiene recipe real — ver roadmap en el README del CLI
 * para lo que falta.
 */
export async function runWizard(nameArg?: string): Promise<ForjaConfig> {
  p.intro("forja · nuevo proyecto");

  const name = nameArg
    ? nameArg
    : ((await p.text({
        message: "Nombre del proyecto",
        placeholder: "acme-app",
        validate(value) {
          if (!/^[a-z][a-z0-9-]*$/.test(value ?? "")) {
            return "Usá minúsculas, números y guiones (^[a-z][a-z0-9-]*$)";
          }
        },
      })) as string);
  if (p.isCancel(name)) cancelAndExit();

  const scope = (await p.text({
    message: "Scope de paquetes internos (@acme/*)",
    initialValue: `@${name}`,
  })) as string;
  if (p.isCancel(scope)) cancelAndExit();

  const platforms = (await p.multiselect({
    message: "¿Qué plataformas?",
    options: [
      { value: "web", label: "Web (Next.js)" },
      { value: "mobile", label: "Móvil (Expo, Expo Go — sin EAS todavía)" },
    ],
    initialValues: ["web", "mobile"],
    required: true,
  })) as ForjaConfig["platforms"];
  if (p.isCancel(platforms)) cancelAndExit();

  const db = (await p.select({
    message: "Base de datos",
    options: [
      { value: "postgres-docker", label: "PostgreSQL local (Docker)" },
      { value: "none", label: "Ninguna (in-memory)" },
    ],
    initialValue: "postgres-docker",
  })) as ForjaConfig["db"];
  if (p.isCancel(db)) cancelAndExit();

  const auth = (await p.select({
    message: "Autenticación",
    options: [
      { value: "sessions", label: "Sesiones propias (token + cookie)" },
      { value: "none", label: "Ninguna" },
    ],
    initialValue: "sessions",
  })) as ForjaConfig["auth"];
  if (p.isCancel(auth)) cancelAndExit();

  let mailer: ForjaConfig["mailer"] = "console";
  if (auth !== "none") {
    mailer = (await p.select({
      message: "Envío de email (recuperación de contraseña)",
      options: [{ value: "console", label: "Consola (dev)" }],
      initialValue: "console",
    })) as ForjaConfig["mailer"];
    if (p.isCancel(mailer)) cancelAndExit();
  }

  const design = (await p.select({
    message: "Sistema de diseño",
    options: [
      { value: "tailwind", label: "Tailwind" },
      { value: "none", label: "Sin estilos" },
    ],
    initialValue: "tailwind",
  })) as ForjaConfig["design"];
  if (p.isCancel(design)) cancelAndExit();

  const tests = (await p.multiselect({
    message: "Tests",
    options: [
      { value: "unit", label: "Unit (vitest)" },
      { value: "integration", label: "Integration (vitest)" },
    ],
    initialValues: ["unit", "integration"],
    required: false,
  })) as ForjaConfig["tests"];
  if (p.isCancel(tests)) cancelAndExit();

  const extras = (await p.multiselect({
    message: "Extras",
    options: [{ value: "lint", label: "ESLint + Prettier" }],
    initialValues: ["lint"],
    required: false,
  })) as ForjaConfig["extras"];
  if (p.isCancel(extras)) cancelAndExit();

  const pm = (await p.select({
    message: "Package manager",
    options: [
      { value: "npm", label: "npm" },
      { value: "pnpm", label: "pnpm" },
      { value: "bun", label: "bun" },
    ],
    initialValue: detectPm(),
  })) as ForjaConfig["pm"];
  if (p.isCancel(pm)) cancelAndExit();

  const config = parseForjaConfig({
    name,
    scope,
    platforms,
    arch: "hexagonal",
    db,
    auth,
    mailer,
    design,
    ui: "own",
    edgeFunctions: false,
    eas: false,
    tests,
    extras,
    pm,
  });

  p.outro("Listo, generando…");
  return config;
}

export async function confirmGit(): Promise<boolean> {
  const result = await p.confirm({ message: "¿Inicializar git y hacer el primer commit?", initialValue: true });
  if (p.isCancel(result)) cancelAndExit();
  return result;
}

export async function confirmInstall(): Promise<boolean> {
  const result = await p.confirm({ message: "¿Instalar dependencias ahora?", initialValue: true });
  if (p.isCancel(result)) cancelAndExit();
  return result;
}
