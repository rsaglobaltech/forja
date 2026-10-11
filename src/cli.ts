#!/usr/bin/env node
import { Command } from "commander";
import path from "node:path";
import fs from "node:fs";
import * as p from "@clack/prompts";
import { defaultConfig, defaultJavaConfig, parseForjaConfig, type ForjaConfig } from "./config/schema.js";
import { runWizard, confirmGit, confirmInstall } from "./prompts/wizard.js";
import { planRecipes, UnsupportedOptionError } from "./engine/planner.js";
import { renderProject, writeToDisk } from "./engine/renderer.js";
import { vfsTree } from "./engine/vfs.js";
import { runPostinstall, nextSteps, type PostinstallResult } from "./engine/postinstall.js";

const program = new Command();

program.name("forja").description("Scaffolding hexagonal: monorepos web + móvil en TypeScript o API Java (Spring Boot / Quarkus) con web, OAuth2 y Specgate");

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

function applyFlags(base: ForjaConfig, flags: InitFlags): ForjaConfig {
  return parseForjaConfig({
    ...base,
    db: flags.db ?? base.db,
    auth: flags.auth ?? base.auth,
    mailer: flags.mailer ?? base.mailer,
    design: flags.design ?? base.design,
    tests: flags.tests !== undefined ? flags.tests.split(",").map((s) => s.trim()).filter(Boolean) : base.tests,
    extras: flags.extras !== undefined ? flags.extras.split(",").map((s) => s.trim()).filter(Boolean) : base.extras,
    pm: flags.pm ?? base.pm,
    platforms: flags.platforms !== undefined
      ? flags.platforms.split(",").map((s) => s.trim()).filter(Boolean)
      : base.platforms,
    javaPackage: flags.javaPackage ?? base.javaPackage,
    // commander pone archunit = true por defecto al existir --no-archunit: solo cuenta con backend Java.
    archunit: base.backend === "node" ? base.archunit : (flags.archunit ?? base.archunit),
  });
}

program
  .command("init [name]")
  .description("Crea un proyecto nuevo")
  .option("--backend <backend>", "node | spring | quarkus")
  .option("--java-package <pkg>", "paquete raíz Java, p. ej. com.acme.tienda")
  .option("--archunit", "reglas de arquitectura con ArchUnit (backend Java)")
  .option("--no-archunit", "sin ArchUnit")
  .option("--platforms <platforms>", "web,mobile (con Java: web o vacío para solo API)")
  .option("--db <db>", "postgres-docker | none")
  .option("--auth <auth>", "sessions | oauth2 | none")
  .option("--mailer <mailer>", "console")
  .option("--design <design>", "tailwind | none")
  .option("--tests <tests>", "lista separada por comas: unit,integration")
  .option("--extras <extras>", "lista separada por comas: lint, ci, docker, specgate")
  .option("--pm <pm>", "npm | pnpm | bun")
  .option("--yes", "no preguntar, usar defaults + flags")
  .option("--dry-run", "imprimir el árbol sin escribir nada")
  .option("--skip-install", "no instalar dependencias")
  .option("--skip-git", "no inicializar git")
  .option("--config <path>", "leer un forja.config.json existente")
  .action(async (name: string | undefined, flags: InitFlags) => {
    try {
      let config: ForjaConfig;

      if (flags.config) {
        const raw = JSON.parse(fs.readFileSync(path.resolve(flags.config), "utf-8"));
        config = parseForjaConfig(raw);
      } else if (flags.yes) {
        if (!name) {
          console.error('Falta el nombre del proyecto: "forja init <name> --yes"');
          process.exit(1);
        }
        const backend = flags.backend ?? "node";
        const base =
          backend === "spring" || backend === "quarkus" ? defaultJavaConfig(name, backend) : defaultConfig(name);
        config = applyFlags(base, flags);
      } else {
        config = await runWizard(name);
      }

      const recipes = planRecipes(config);
      const rendered = await renderProject(config, recipes);
      const { tree } = rendered;

      if (flags.dryRun) {
        console.log(tree.join("\n"));
        return;
      }

      const targetDir = path.resolve(process.cwd(), config.name);
      if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
        console.error(`"${targetDir}" ya existe y no está vacío.`);
        process.exit(1);
      }

      writeToDisk(rendered, targetDir);

      let installDeps = flags.skipInstall ? false : flags.yes ? true : await confirmInstall();
      const initGit = flags.skipGit ? false : flags.yes ? true : await confirmGit();

      const spinner = p.spinner();
      let result: PostinstallResult | undefined;
      if (initGit || installDeps) {
        spinner.start("Corriendo git init / install…");
        try {
          result = await runPostinstall({ targetDir, config, initGit, installDeps });
          spinner.stop("Listo.");
        } catch (error) {
          spinner.stop("Falló git/install, revisá el error abajo.");
          console.error(error);
          installDeps = false;
        }
      }

      console.log(`\n${config.name} generado en ${targetDir}\n`);
      console.log("Siguientes pasos:\n");
      for (const step of nextSteps(config, installDeps, result)) {
        console.log(`  ${step}`);
      }
    } catch (error) {
      if (error instanceof UnsupportedOptionError) {
        console.error(`\n${error.message}\n`);
        process.exit(1);
      }
      throw error;
    }
  });

program
  .command("doctor")
  .description("Chequea el entorno de un proyecto generado (v0.2)")
  .action(() => {
    console.log("forja doctor todavía no está implementado. Llega en v0.2.");
  });

program
  .command("add")
  .description("Genera casos de uso, puertos, pantallas, etc. (v0.2)")
  .action(() => {
    console.log("forja add todavía no está implementado. Llega en v0.2.");
  });

program.parseAsync(process.argv);
