import fs from "node:fs";
import path from "node:path";
import { parseForjaConfig, type ForjaConfig } from "../config/schema.js";

/** A failure the user can fix: what went wrong, and the command or edit that fixes it. */
export class ForjaError extends Error {
  constructor(
    message: string,
    readonly fix?: string,
  ) {
    super(message);
  }
}

/** A project forja generated: its root (where forja.config.json lives) and its config. */
export interface Project {
  root: string;
  config: ForjaConfig;
  /** Specgate is adopted: spec.md and the traceability matrix are there. */
  specgate: boolean;
}

/** Walks up from `from` to the first directory holding a forja.config.json. */
export function findProject(from = process.cwd()): Project {
  let dir = path.resolve(from);
  for (;;) {
    const file = path.join(dir, "forja.config.json");
    if (fs.existsSync(file)) {
      const config = parseForjaConfig(JSON.parse(fs.readFileSync(file, "utf-8")));
      return { root: dir, config, specgate: hasSpecgate(dir) };
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new ForjaError(
        "No forja.config.json here or in any parent directory.",
        "Run this inside a project created with `forja init`.",
      );
    }
    dir = parent;
  }
}

export function hasSpecgate(root: string): boolean {
  return (
    fs.existsSync(path.join(root, "spec.md")) &&
    fs.existsSync(path.join(root, "docs", "specs", "traceability.md"))
  );
}
