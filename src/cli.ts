#!/usr/bin/env node
import { Command } from "commander";
import path from "node:path";
import fs from "node:fs";
import * as p from "@clack/prompts";
import { ZodError } from "zod";
import {
  defaultConfig,
  defaultJavaConfig,
  formatConfigError,
  parseForjaConfig,
  type ForjaConfig,
} from "./config/schema.js";
import { runWizard, confirmGit, confirmInstall } from "./prompts/wizard.js";
import { planRecipes } from "./engine/planner.js";
import { renderProject, writeToDisk } from "./engine/renderer.js";
import {
  alignComments,
  runPostinstall,
  nextSteps,
  type PostinstallResult,
} from "./engine/postinstall.js";

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
  .option("--tests <tests>", "comma-separated: unit,integration")
  .option(
    "--extras <extras>",
    "comma-separated: lint, ci, docker (Java), specgate",
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

      if (flags.dryRun) {
        console.log(rendered.tree.join("\n"));
        return;
      }

      const targetDir = path.resolve(process.cwd(), config.name);
      if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
        console.error(`"${targetDir}" already exists and is not empty.`);
        process.exit(1);
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

      const spinner = p.spinner();
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

      console.log(`\n${config.name} created in ${targetDir}\n`);
      console.log("Next steps:\n");
      for (const step of alignComments(
        nextSteps(config, installDeps, result),
      )) {
        console.log(`  ${step}`);
      }
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

program.parseAsync(process.argv);
