import {
  IndentationText,
  Node,
  Project as TsProject,
  QuoteKind,
  SyntaxKind,
} from "ts-morph";
import { Changes } from "./changes.js";
import { camel, sentence } from "./names.js";
import { ForjaError } from "../project/project.js";

/**
 * `forja add` on the Node path: everything lands in packages/core, the
 * hexagon. Use cases in application/<module>/, entities in domain/entities/,
 * ports in ports/ with their adapters in infrastructure/.
 */
const CORE = "packages/core";
const SRC = `${CORE}/src`;
const CONTAINER = `${SRC}/infrastructure/config/container.ts`;
const INDEX = `${SRC}/index.ts`;

export interface Requirement {
  id: string;
  title: string;
  featureFile?: string;
}

export function addNodeUseCase(changes: Changes, module: string, name: string, req?: Requirement): void {
  const cls = `${name}UseCase`;
  const file = `${SRC}/application/${module}/${cls}.ts`;
  const title = req?.title ?? sentence(name);

  changes.create(
    file,
    `import { ok, type Result } from "../../domain/shared/Result.js";

/**
 * Use case: ${title}.${req ? ` Specified by ${req.id}.` : ""}
 *
 * What it needs from the outside world (repositories, a clock, a mailer)
 * comes in through the constructor as ports; infrastructure/config/container.ts
 * passes the adapters. Expected failures are returned with \`err()\`, not thrown.
 */
export class ${cls} {
  async execute(): Promise<Result<void, never>> {
    // The rule this use case enforces goes here.
    return ok(undefined);
  }
}
`,
  );

  changes.create(
    `${CORE}/tests/unit/${module}/${cls}.test.ts`,
    `import { describe, expect, it } from "vitest";
import { ${cls} } from "../../../src/application/${module}/${cls}.js";

describe("${req ? `${req.id} ` : ""}${title}", () => {
  it("runs", async () => {
    const result = await new ${cls}().execute();
    expect(result.ok).toBe(true);
  });

  it.todo("${req?.featureFile ? `proves the scenario in ${req.featureFile}` : "proves what the use case promises"}");
});
`,
  );

  exportFromIndex(changes, `./application/${module}/${cls}.js`);
  registerInContainer(changes, cls, `../../application/${module}/${cls}.js`, camel(cls));
}

export function addNodeEntity(changes: Changes, name: string): void {
  changes.create(
    `${SRC}/domain/entities/${name}.ts`,
    `import { newId } from "../shared/ids.js";

export interface ${name}Props {
  id: string;
  createdAt: Date;
}

/** Entity: ${sentence(name).toLowerCase()}. Pure TypeScript: no framework, no database. */
export class ${name} {
  private constructor(private readonly props: ${name}Props) {}

  static create(): ${name} {
    return new ${name}({ id: newId(), createdAt: new Date() });
  }

  static fromPersistence(props: ${name}Props): ${name} {
    return new ${name}(props);
  }

  get id(): string {
    return this.props.id;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  toPersistence(): ${name}Props {
    return { ...this.props };
  }
}
`,
  );

  changes.create(
    `${CORE}/tests/unit/${name}.test.ts`,
    `import { describe, expect, it } from "vitest";
import { ${name} } from "../../src/domain/entities/${name}.js";

describe("${name}", () => {
  it("is created with an id", () => {
    expect(${name}.create().id).toBeTruthy();
  });

  it("survives a round trip through persistence", () => {
    const original = ${name}.create();
    const restored = ${name}.fromPersistence(original.toPersistence());
    expect(restored.id).toBe(original.id);
  });
});
`,
  );

  exportFromIndex(changes, `./domain/entities/${name}.js`);
}

export function addNodePort(changes: Changes, name: string, adapter: boolean): void {
  const port = `I${name}`;
  changes.create(
    `${SRC}/ports/${port}.ts`,
    `/**
 * Outbound port: what the core needs from the outside world, in the core's
 * own words. Adapters in infrastructure/ implement it; use cases receive it
 * through their constructor.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- remove with the first method
export interface ${port} {
  // e.g. findById(id: string): Promise<Thing | null>;
}
`,
  );
  exportFromIndex(changes, `./ports/${port}.js`);

  if (!adapter) return;
  const dir = name.endsWith("Repository") ? "database/repositories" : "adapters";
  changes.create(
    `${SRC}/infrastructure/${dir}/InMemory${name}.ts`,
    `import type { ${port} } from "${dir.includes("/") ? "../../.." : "../.."}/ports/${port}.js";

/** In-memory adapter for ${port}: for tests and for running without the real service. */
export class InMemory${name} implements ${port} {}
`,
  );
}

/** Adds `export * from "<specifier>"` next to its siblings in the core's barrel. */
function exportFromIndex(changes: Changes, specifier: string): void {
  if (!changes.exists(INDEX)) return;
  const line = `export * from "${specifier}";`;
  const lines = changes.read(INDEX).split("\n");
  if (lines.includes(line)) return;
  const group = specifier.split("/")[1]; // application | domain | ports
  let at = -1;
  lines.forEach((l, i) => {
    if (l.startsWith(`export * from "./${group}/`)) at = i;
  });
  if (at === -1) at = lines.findIndex((l) => l.startsWith("export {")) - 1;
  if (at < -1) at = lines.length - 1;
  lines.splice(at + 1, 0, line);
  changes.update(INDEX, lines.join("\n"));
}

/**
 * Adds `<property>: new <Class>()` to the object `buildContainer()` returns,
 * and its import. Through the AST, so the container's own layout (the
 * `if (hasDatabase())` branches, the comments) is left as it was.
 */
export function registerInContainer(changes: Changes, cls: string, specifier: string, property: string): void {
  if (!changes.exists(CONTAINER)) return;
  const project = new TsProject({
    useInMemoryFileSystem: true,
    manipulationSettings: { indentationText: IndentationText.TwoSpaces, quoteKind: QuoteKind.Double },
  });
  const source = project.createSourceFile("container.ts", changes.read(CONTAINER));
  const build = source.getFunction("buildContainer");
  const returned = build
    ?.getBody()
    ?.asKind(SyntaxKind.Block)
    ?.getStatements()
    .filter(Node.isReturnStatement)
    .at(-1)
    ?.getExpression();
  if (!returned || !Node.isObjectLiteralExpression(returned)) {
    throw new ForjaError(
      `${CONTAINER} has no \`buildContainer()\` returning an object.`,
      `Register it by hand: ${property}: new ${cls}()`,
    );
  }
  if (returned.getProperty(property)) return;
  const added = returned.addPropertyAssignment({ name: property, initializer: `new ${cls}()` });
  // The container is written with trailing commas (prettier's default); ts-morph adds none.
  if (returned.getText().includes("\n")) source.insertText(added.getEnd(), ",");
  source.addImportDeclaration({ namedImports: [cls], moduleSpecifier: specifier });
  changes.update(CONTAINER, source.getFullText());
}
