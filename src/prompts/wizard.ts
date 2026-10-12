import * as p from "@clack/prompts";
import { javaPackageOf, parseForjaConfig, type ForjaConfig } from "../config/schema.js";

function detectPm(): "npm" | "pnpm" | "bun" {
  const ua = process.env.npm_config_user_agent ?? "";
  if (ua.startsWith("pnpm")) return "pnpm";
  if (ua.startsWith("bun")) return "bun";
  return "npm";
}

function cancelAndExit(): never {
  p.cancel("Cancelled.");
  process.exit(1);
}

/**
 * The wizard asks only what a recipe implements: the architecture is always
 * hexagonal and the UI kit is forja's own, so neither is asked. ROADMAP.md
 * says what comes next.
 */
export async function runWizard(nameArg?: string): Promise<ForjaConfig> {
  p.intro("forja · new project");

  const name = nameArg
    ? nameArg
    : ((await p.text({
        message: "Project name",
        placeholder: "acme-app",
        validate(value) {
          if (!/^[a-z][a-z0-9-]*$/.test(value ?? "")) {
            return "Use lowercase letters, digits and hyphens (^[a-z][a-z0-9-]*$)";
          }
        },
      })) as string);
  if (p.isCancel(name)) cancelAndExit();

  const backend = (await p.select({
    message: "Backend",
    options: [
      { value: "node", label: "TypeScript (packages/core, Next.js)" },
      { value: "spring", label: "Java · Spring Boot 4 (apps/api)" },
      { value: "quarkus", label: "Java · Quarkus 3 (apps/api)" },
    ],
    initialValue: "node",
  })) as ForjaConfig["backend"];
  if (p.isCancel(backend)) cancelAndExit();
  if (backend !== "node") return runJavaWizard(name, backend);

  const scope = (await p.text({
    message: "Scope for the internal packages (@acme/*)",
    initialValue: `@${name}`,
  })) as string;
  if (p.isCancel(scope)) cancelAndExit();

  const platforms = (await p.multiselect({
    message: "Which platforms?",
    options: [
      { value: "web", label: "Web (Next.js)" },
      { value: "mobile", label: "Mobile (Expo, runs in Expo Go)" },
    ],
    initialValues: ["web", "mobile"],
    required: true,
  })) as ForjaConfig["platforms"];
  if (p.isCancel(platforms)) cancelAndExit();

  const db = (await p.select({
    message: "Database",
    options: [
      { value: "postgres-docker", label: "PostgreSQL in Docker" },
      { value: "none", label: "None (in memory)" },
    ],
    initialValue: "postgres-docker",
  })) as ForjaConfig["db"];
  if (p.isCancel(db)) cancelAndExit();

  const auth = (await p.select({
    message: "Authentication",
    options: [
      { value: "sessions", label: "Own sessions (token + cookie)" },
      { value: "none", label: "None" },
    ],
    initialValue: "sessions",
  })) as ForjaConfig["auth"];
  if (p.isCancel(auth)) cancelAndExit();

  let mailer: ForjaConfig["mailer"] = "console";
  if (auth !== "none") {
    mailer = (await p.select({
      message: "Email (password reset)",
      options: [{ value: "console", label: "Console (development)" }],
      initialValue: "console",
    })) as ForjaConfig["mailer"];
    if (p.isCancel(mailer)) cancelAndExit();
  }

  const design = (await p.select({
    message: "Design system",
    options: [
      { value: "tailwind", label: "Tailwind" },
      { value: "none", label: "No styles" },
    ],
    initialValue: "tailwind",
  })) as ForjaConfig["design"];
  if (p.isCancel(design)) cancelAndExit();

  const tests = (await p.multiselect({
    message: "Tests",
    options: [
      { value: "unit", label: "Unit (vitest)" },
      { value: "integration", label: "Integration (vitest)" },
      ...(platforms.includes("web")
        ? [{ value: "e2e-web", label: "End to end (Playwright, web)", hint: "sign-in flow in a real browser" }]
        : []),
    ],
    initialValues: ["unit", "integration"],
    required: false,
  })) as ForjaConfig["tests"];
  if (p.isCancel(tests)) cancelAndExit();

  const extras = (await p.multiselect({
    message: "Extras",
    options: [
      { value: "lint", label: "ESLint + Prettier" },
      { value: "ci", label: "CI on GitHub Actions", hint: "a workflow: on a private repository it spends Actions minutes" },
      { value: "specgate", label: "Specgate (spec-driven development)" },
    ],
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
    backend: "node",
    archunit: false,
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

  p.outro("Generating…");
  return config;
}

/** Java backend: always hexagonal; asks for ArchUnit, the web app, the database, auth and extras. */
async function runJavaWizard(name: string, backend: "spring" | "quarkus"): Promise<ForjaConfig> {
  const ask = async <T>(prompt: Promise<T | symbol>): Promise<T> => {
    const value = await prompt;
    if (p.isCancel(value)) cancelAndExit();
    return value as T;
  };

  const javaPackage = await ask(
    p.text({
      message: "Root Java package",
      initialValue: javaPackageOf({ name, javaPackage: undefined }),
      validate(value) {
        if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(value ?? "")) return "e.g. com.acme.shop";
      },
    }),
  );
  const archunit = await ask(
    p.confirm({
      message: "Architecture rules with ArchUnit? (the build fails when the hexagon is broken)",
      initialValue: true,
    }),
  );
  const web = await ask(p.confirm({ message: "A web app (Next.js 16)?", initialValue: true }));
  const db = await ask(
    p.select({
      message: "Database",
      options: [
        { value: "postgres-docker", label: "PostgreSQL in Docker (tests run against a real Postgres)" },
        { value: "none", label: "In memory" },
      ],
      initialValue: "postgres-docker",
    }),
  );
  const auth = await ask(
    p.select({
      message: "Authentication",
      options: [
        { value: "oauth2", label: "OAuth2 / OIDC with Keycloak (the API as resource server, sign-in on the web)" },
        { value: "none", label: "None" },
      ],
      initialValue: "oauth2",
    }),
  );
  const design = web
    ? await ask(
        p.select({
          message: "Design system",
          options: [
            { value: "tailwind", label: "Tailwind" },
            { value: "none", label: "No styles" },
          ],
          initialValue: "tailwind",
        }),
      )
    : "none";
  const e2e = web
    ? await ask(
        p.confirm({
          message: "End-to-end tests of the web app (Playwright)?",
          initialValue: false,
        }),
      )
    : false;
  const extras = await ask(
    p.multiselect({
      message: "Extras",
      options: [
        { value: "ci", label: "CI on GitHub Actions", hint: "a workflow: on a private repository it spends Actions minutes" },
        { value: "docker", label: "Production Dockerfiles" },
        { value: "specgate", label: "Specgate (spec-driven development)" },
        ...(web ? [{ value: "lint", label: "ESLint + Prettier (web)" }] : []),
      ],
      initialValues: ["docker", "specgate", ...(web ? ["lint"] : [])],
      required: false,
    }),
  );

  const config = parseForjaConfig({
    name,
    scope: `@${name}`,
    platforms: web ? ["web"] : [],
    backend,
    javaPackage,
    archunit,
    arch: "hexagonal",
    db,
    auth,
    mailer: "console",
    design,
    ui: "own",
    edgeFunctions: false,
    eas: false,
    tests: e2e ? ["unit", "integration", "e2e-web"] : ["unit", "integration"],
    extras,
    pm: "npm",
  });
  p.outro("Generating…");
  return config;
}

export async function confirmGit(): Promise<boolean> {
  const result = await p.confirm({ message: "Initialise git and make the first commit?", initialValue: true });
  if (p.isCancel(result)) cancelAndExit();
  return result;
}

export async function confirmInstall(): Promise<boolean> {
  const result = await p.confirm({ message: "Install the dependencies now?", initialValue: true });
  if (p.isCancel(result)) cancelAndExit();
  return result;
}
