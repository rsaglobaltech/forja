#!/usr/bin/env node
import { Command } from "commander";
import path from "node:path";
import fs from "node:fs";
import * as p from "@clack/prompts";
import { ZodError } from "zod";
import {
  BackendSchema,
  defaultConfig,
  defaultJavaConfig,
  formatConfigError,
  parseForjaConfig,
  type ForjaConfig,
} from "./config/schema.js";
import { runWizard, confirmGit, confirmInstall } from "./prompts/wizard.js";
import { planRecipes } from "./engine/planner.js";
import { renderProject, writeToDisk } from "./engine/renderer.js";
import { progress, targetProblem } from "./engine/target.js";
import {
  alignComments,
  runPostinstall,
  nextSteps,
  type PostinstallResult,
} from "./engine/postinstall.js";
import { add, type AddKind, type AddResult } from "./add/add.js";
import { doctor } from "./doctor/doctor.js";
import { ForjaError, findProject } from "./project/project.js";

const pkg = JSON.parse(
  fs.readFileSync(new URL("../package.json", import.meta.url), "utf-8"),
) as {
  version: string;
};

const program = new Command();

program
  .name("forja")
  .description(
    "Scaffold hexagonal projects: web + mobile monorepos in TypeScript, or a Java API (Spring Boot / Quarkus) with a web app, OAuth2 and Specgate",
  )
  .version(pkg.version, "-v, --version", "print the version");

interface InitFlags {
  backend?: string;
  javaPackage?: string;
  archunit?: boolean;
  platforms?: string;
  skipInstall?: boolean;
  skipGit?: boolean;
  db?: string;
  auth?: string;
  mailer?: string;
  design?: string;
  tests?: string;
  extras?: string;
  pm?: string;
  yes?: boolean;
  dryRun?: boolean;
  config?: string;
}

const list = (value: string) =>
  value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** The flags on top of a base config: a flag given always wins. */
function applyFlags(
  base: ForjaConfig,
  flags: InitFlags,
  name?: string,
): ForjaConfig {
  return parseForjaConfig({
    ...base,
    name: name ?? base.name,
    backend: flags.backend ?? base.backend,
    scope: name && base.scope === `@${base.name}` ? `@${name}` : base.scope,
    db: flags.db ?? base.db,
    auth: flags.auth ?? base.auth,
    mailer: flags.mailer ?? base.mailer,
    design: flags.design ?? base.design,
    tests: flags.tests !== undefined ? list(flags.tests) : base.tests,
    extras: flags.extras !== undefined ? list(flags.extras) : base.extras,
    pm: flags.pm ?? base.pm,
    platforms:
      flags.platforms !== undefined ? list(flags.platforms) : base.platforms,
    javaPackage: flags.javaPackage ?? base.javaPackage,
    // commander sets archunit = true by default because --no-archunit exists:
    // it only counts with a Java backend.
    archunit:
      base.backend === "node"
        ? base.archunit
        : (flags.archunit ?? base.archunit),
  });
}

program
  .command("init [name]")
  .description("Create a new project")
  .option("--backend <backend>", "node | spring | quarkus")
  .option("--java-package <pkg>", "root Java package, e.g. com.acme.shop")
  .option("--archunit", "architecture rules with ArchUnit (Java backend)")
  .option("--no-archunit", "no ArchUnit")
  .option(
    "--platforms <platforms>",
    "web,mobile (Java: web, or empty for an API only)",
  )
  .option("--db <db>", "postgres-docker | none")
  .option("--auth <auth>", "sessions (Node) | oauth2 (Java) | none")
  .option("--mailer <mailer>", "console")
  .option("--design <design>", "tailwind | none")
  .option("--tests <tests>", "comma-separated: unit, integration, e2e-web (Playwright)")
  .option(
    "--extras <extras>",
    "comma-separated: lint, ci (a GitHub Actions workflow), docker (Java), specgate",
  )
  .option("--pm <pm>", "npm | pnpm | bun")
  .option("--yes", "ask nothing: defaults plus flags")
  .option("--dry-run", "print the file tree, write nothing")
  .option("--skip-install", "do not install dependencies")
  .option("--skip-git", "do not initialise git")
  .option(
    "--config <path>",
    "start from a forja.config.json; the name and flags override it",
  )
  .action(async (name: string | undefined, flags: InitFlags) => {
    try {
      let config: ForjaConfig;

      if (flags.config) {
        const raw = JSON.parse(
          fs.readFileSync(path.resolve(flags.config), "utf-8"),
        );
        config = applyFlags(parseForjaConfig(raw), flags, name);
      } else if (flags.yes) {
        if (!name) {
          console.error('The project needs a name: "forja init <name> --yes"');
          process.exit(1);
        }
        const backend = flags.backend ?? "node";
        if (!BackendSchema.options.includes(backend as never)) {
          console.error(`Unknown backend "${backend}": use node, spring or quarkus.`);
          process.exit(1);
        }
        const base =
          backend === "spring" || backend === "quarkus"
            ? defaultJavaConfig(name, backend)
            : defaultConfig(name);
        config = applyFlags(base, flags);
      } else {
        config = await runWizard(name);
      }

      const recipes = planRecipes(config);
      const rendered = await renderProject(config, recipes);
      // The wizard opened its own frame; unattended runs open one here.
      if ((flags.yes || flags.config) && !flags.dryRun) p.intro(`forja init · ${config.name}`);

      const targetDir = path.resolve(process.cwd(), config.name);
      const problem = targetProblem(targetDir);
      if (problem) {
        console.error(problem);
        process.exit(1);
      }

      if (flags.dryRun) {
        console.log(rendered.tree.join("\n"));
        return;
      }

      writeToDisk(rendered, targetDir);

      // --config and --yes both mean "ask nothing".
      const unattended = Boolean(flags.yes || flags.config);
      let installDeps = flags.skipInstall
        ? false
        : unattended
          ? true
          : await confirmInstall();
      const initGit = flags.skipGit
        ? false
        : unattended
          ? true
          : await confirmGit();

      const spinner = progress(Boolean(process.stdout.isTTY), (l) => console.log(l), () => p.spinner());
      let result: PostinstallResult | undefined;
      if (initGit || installDeps) {
        spinner.start("Running git init and the install…");
        try {
          result = await runPostinstall({
            targetDir,
            config,
            initGit,
            installDeps,
          });
          spinner.stop("Done.");
        } catch (error) {
          spinner.stop("git or the install failed — the error is below.");
          console.error(error);
          installDeps = false;
        }
      }

      p.note(alignComments(nextSteps(config, installDeps, result)).join("\n"), "Next steps");
      p.outro(`${config.name} created in ${targetDir}`);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error(
          `\nThat configuration is not valid:\n${formatConfigError(error)}\n`,
        );
        process.exit(1);
      }
      throw error;
    }
  });

/** Prints a ForjaError (or a bad forja.config.json) readably and exits 1. */
function fail(error: unknown): never {
  if (error instanceof ForjaError) {
    p.log.error(error.message + (error.fix ? `\n${error.fix}` : ""));
  } else if (error instanceof ZodError) {
    p.log.error(`forja.config.json is not valid:\n${formatConfigError(error)}`);
  } else {
    throw error;
  }
  process.exit(1);
}

interface AddFlags {
  req?: string;
  title?: string;
  spec?: boolean;
  adapter?: boolean;
  dryRun?: boolean;
}

const addCommand = program
  .command("add")
  .description("Add a use case, an entity or a port to the project you are in");

const ADD_KINDS: { kind: AddKind; arg: string; what: string }[] = [
  { kind: "usecase", arg: "<module/Name>", what: "a use case, its test, and its wiring" },
  { kind: "entity", arg: "<[module/]Name>", what: "a domain entity and its test (Java: module required)" },
  { kind: "port", arg: "<[module/]Name>", what: "an outbound port and an in-memory adapter (Java: module required)" },
];

for (const { kind, arg, what } of ADD_KINDS) {
  const command = addCommand
    .command(`${kind} ${arg}`)
    .description(`Add ${what}`)
    .option("--dry-run", "print what would change, write nothing");
  if (kind === "usecase") {
    command
      .option("--req <id>", "name this existing requirement (REQ-007) in the test")
      .option("--title <title>", "the requirement's title, when Specgate creates it")
      .option("--no-spec", "do not create a requirement in Specgate");
  }
  if (kind === "port") command.option("--no-adapter", "the port only, no in-memory adapter");

  command.action(async (raw: string, flags: AddFlags) => {
    try {
      const project = findProject();
      const result = await add(project, kind, raw, flags);
      p.intro(`forja add ${kind}${flags.dryRun ? " (dry run)" : ""}`);
      for (const f of result.created) p.log.success(`created  ${f}`);
      for (const f of result.updated) p.log.info(`updated  ${f}`);
      if (result.requirement) {
        p.log.step(
          `${result.requirement.id} · ${result.requirement.title}` +
            (result.requirement.featureFile ? `\nscenario to write: ${result.requirement.featureFile}` : ""),
        );
      } else if (result.specNote) {
        p.log.warn(`No requirement linked: ${result.specNote}`);
      }
      p.outro(addNextStep(kind, project.config.backend, result));
    } catch (error) {
      fail(error);
    }
  });
}

function addNextStep(kind: AddKind, backend: string, result: AddResult): string {
  const test = backend === "node" ? "npm test" : "npm run test:api";
  if (kind === "usecase" && result.requirement) {
    return `Next: write the scenario, make the test prove it (${test}), then npx specgate done ${result.requirement.id}`;
  }
  if (kind === "port") return "Next: give the port its first method, then pass it to the use case that needs it";
  return `Next: ${test}`;
}

program
  .command("doctor")
  .description("Check the tools, the .env files and the architecture rules of the project you are in")
  .action(async () => {
    try {
      const project = findProject();
      p.intro(`forja doctor · ${project.config.name}`);
      const checks = await doctor(project);
      for (const c of checks) {
        const line = `${c.name.padEnd(14)} ${c.detail}` + (c.fix && c.state !== "ok" ? `\n${c.fix}` : "");
        if (c.state === "ok") p.log.success(line);
        else if (c.state === "warn") p.log.warn(line);
        else p.log.error(line);
      }
      const failed = checks.filter((c) => c.state === "fail").length;
      const warned = checks.filter((c) => c.state === "warn").length;
      p.outro(
        failed > 0
          ? `${failed} to fix${warned ? `, ${warned} to look at` : ""}`
          : warned > 0
            ? `Ready, with ${warned} to look at`
            : "Ready",
      );
      if (failed > 0) process.exitCode = 1;
    } catch (error) {
      fail(error);
    }
  });

program.parseAsync(process.argv);
