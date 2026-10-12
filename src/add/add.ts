import { execa } from "execa";
import { isJava } from "../config/schema.js";
import { ForjaError, type Project } from "../project/project.js";
import { Changes } from "./changes.js";
import { JavaModule } from "./java.js";
import { parseTarget, sentence } from "./names.js";
import { addNodeEntity, addNodePort, addNodeUseCase, type Requirement } from "./node.js";

export type AddKind = "usecase" | "entity" | "port";

export interface AddOptions {
  /** usecase: name this existing requirement instead of creating one. */
  req?: string;
  /** usecase: the requirement's title, when Specgate creates it. */
  title?: string;
  /** usecase: false = do not touch the specification. */
  spec?: boolean;
  /** port: false = no in-memory adapter. */
  adapter?: boolean;
  /** Print what would change, write nothing. */
  dryRun?: boolean;
}

export interface AddResult {
  created: string[];
  updated: string[];
  requirement?: Requirement;
  /** Why no requirement was linked, when Specgate is there but it could not be. */
  specNote?: string;
}

/** The two Specgate commands `add usecase` runs in the project; swapped in tests. */
export interface Specgate {
  /** `specgate new`: writes a requirement and returns it. */
  newRequirement(root: string, title: string): Promise<Requirement>;
  /** `specgate matrix`: the traceability matrix, regenerated now that a test names the requirement. */
  matrix(root: string): Promise<void>;
}

const npxSpecgate = (root: string, ...args: string[]) =>
  execa("npx", ["--no-install", "specgate", ...args], { cwd: root, reject: false });

export const specgate: Specgate = {
  async newRequirement(root, title) {
    const { stdout } = await npxSpecgate(root, "new", title, "--json");
    let parsed: {
      requirement?: { id: string; title: string; featureFile?: string } | null;
      status?: { message: string }[];
    };
    try {
      parsed = JSON.parse(stdout);
    } catch {
      throw new ForjaError("Specgate did not answer.", "Install the project's dependencies (npm install) and run again.");
    }
    if (!parsed.requirement) {
      throw new ForjaError(parsed.status?.[0]?.message ?? "Specgate wrote no requirement.");
    }
    const { id, featureFile } = parsed.requirement;
    return { id, title: parsed.requirement.title, featureFile };
  },
  async matrix(root) {
    const { exitCode } = await npxSpecgate(root, "matrix");
    if (exitCode !== 0) throw new ForjaError("`specgate matrix` failed.", "Run `npx specgate check`: it regenerates the matrix.");
  },
};

const REQ_ID = /^REQ-\d+$/;

export async function add(
  project: Project,
  kind: AddKind,
  raw: string,
  options: AddOptions = {},
  sg: Specgate = specgate,
): Promise<AddResult> {
  const java = isJava(project.config);
  const target = parseTarget(raw, kind === "usecase" && !java ? "UseCase" : undefined);
  if ((java || kind === "usecase") && !target.module) {
    const example = kind === "usecase" ? "orders/PlaceOrder" : kind === "entity" ? "orders/Order" : "orders/OrderRepository";
    throw new ForjaError(
      `"${raw}" needs its module: ${java ? "every class lives in one module of apps/api" : "a use case lives in application/<module>/"}.`,
      `forja add ${kind} ${example}`,
    );
  }
  if (options.req !== undefined && !REQ_ID.test(options.req)) {
    throw new ForjaError(`"${options.req}" is not a requirement id.`, "Use the form REQ-007.");
  }

  const build = (requirement?: Requirement) => {
    const changes = new Changes(project.root);
    if (java) {
      const mod = new JavaModule(project.config, target.module!);
      if (kind === "usecase") mod.addUseCase(changes, target.name, requirement);
      if (kind === "entity") mod.addEntity(changes, target.name);
      if (kind === "port") mod.addPort(changes, target.name, options.adapter !== false);
    } else {
      if (kind === "usecase") addNodeUseCase(changes, target.module!, target.name, requirement);
      if (kind === "entity") addNodeEntity(changes, target.name);
      if (kind === "port") addNodePort(changes, target.name, options.adapter !== false);
    }
    return changes;
  };

  // Every check (no file is overwritten, the container can be edited) runs
  // before Specgate writes a requirement: a refused `add` leaves no orphan REQ.
  let changes = build();
  let requirement: Requirement | undefined;
  let specNote: string | undefined;

  if (kind === "usecase" && options.spec !== false) {
    const title = options.title ?? sentence(target.name);
    if (options.req) {
      requirement = { id: options.req, title };
    } else if (project.specgate && !options.dryRun) {
      try {
        requirement = await sg.newRequirement(project.root, title);
      } catch (error) {
        specNote = error instanceof Error ? error.message : String(error);
      }
    }
    if (requirement) changes = build(requirement);
  }

  if (options.dryRun) return { created: changes.created, updated: changes.updated, requirement, specNote };
  changes.commit();
  if (requirement && project.specgate) {
    try {
      await sg.matrix(project.root);
    } catch (error) {
      specNote = error instanceof Error ? error.message : String(error);
    }
  }
  return { created: changes.created, updated: changes.updated, requirement, specNote };
}
