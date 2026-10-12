import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { defaultConfig, defaultJavaConfig, parseForjaConfig, type ForjaConfig } from "../src/config/schema.js";
import { planRecipes } from "../src/engine/planner.js";
import { renderProject, writeToDisk } from "../src/engine/renderer.js";
import { add, type Specgate } from "../src/add/add.js";
import { parseTarget } from "../src/add/names.js";
import { ForjaError, findProject } from "../src/project/project.js";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

async function generate(config: ForjaConfig, specgate = false) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "forja-add-"));
  dirs.push(root);
  writeToDisk(await renderProject(config, planRecipes(config)), root);
  if (specgate) {
    fs.writeFileSync(path.join(root, "spec.md"), "# spec\n");
    fs.mkdirSync(path.join(root, "docs/specs"), { recursive: true });
    fs.writeFileSync(path.join(root, "docs/specs/traceability.md"), "|\n");
  }
  const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf-8");
  return { project: findProject(path.join(root, "packages")), root, read };
}

const node = () => parseForjaConfig(defaultConfig("acme"));
const neverAsked: Specgate = {
  newRequirement: async () => {
    throw new Error("specgate new should not run");
  },
  matrix: async () => {
    throw new Error("specgate matrix should not run");
  },
};

/** A Specgate that answers, and remembers what it was asked. */
function fakeSpecgate(fail = false) {
  const calls: string[] = [];
  const sg: Specgate = {
    async newRequirement(_root, title) {
      calls.push(`new ${title}`);
      if (fail) throw new Error("Specgate did not answer.");
      return { id: "REQ-004", title, featureFile: "features/place-an-order.feature" };
    },
    async matrix() {
      calls.push("matrix");
    },
  };
  return { sg, calls };
}

describe("names", () => {
  it("module/Name in any casing, without the suffix the generator adds", () => {
    expect(parseTarget("Orders/place-order")).toEqual({ module: "orders", name: "PlaceOrder" });
    expect(parseTarget("orders/PlaceOrderUseCase", "UseCase")).toEqual({ module: "orders", name: "PlaceOrder" });
    expect(parseTarget("Order")).toEqual({ module: undefined, name: "Order" });
    expect(() => parseTarget("a/b/c")).toThrow(ForjaError);
    expect(() => parseTarget("orders/9lives")).toThrow(ForjaError);
  });
});

describe("forja add — node", () => {
  it("a use case: the class, its test, the barrel and the container", async () => {
    const { project, read } = await generate(node());
    const result = await add(project, "usecase", "orders/PlaceOrder", {}, neverAsked);

    expect(result.created).toEqual([
      "packages/core/src/application/orders/PlaceOrderUseCase.ts",
      "packages/core/tests/unit/orders/PlaceOrderUseCase.test.ts",
    ]);
    expect(read("packages/core/src/index.ts")).toContain(
      'export * from "./application/orders/PlaceOrderUseCase.js";',
    );
    const container = read("packages/core/src/infrastructure/config/container.ts");
    expect(container).toContain(
      'import { PlaceOrderUseCase } from "../../application/orders/PlaceOrderUseCase.js";',
    );
    expect(container).toMatch(/placeOrderUseCase: new PlaceOrderUseCase\(\),\n {2}\};/);
  });

  it("works on the container of a project without auth", async () => {
    const { project, read } = await generate(parseForjaConfig({ ...defaultConfig("acme"), auth: "none" }));
    await add(project, "usecase", "billing/IssueInvoice", {}, neverAsked);
    expect(read("packages/core/src/infrastructure/config/container.ts")).toContain(
      "issueInvoiceUseCase: new IssueInvoiceUseCase(),",
    );
  });

  it("with Specgate adopted, the test is named after the requirement it creates", async () => {
    const { project, read } = await generate(node(), true);
    const { sg, calls } = fakeSpecgate();
    const result = await add(project, "usecase", "orders/PlaceOrder", { title: "Place an order" }, sg);
    // The matrix is regenerated after the test is written: it now names the requirement.
    expect(calls).toEqual(["new Place an order", "matrix"]);
    expect(result.requirement?.id).toBe("REQ-004");
    const test = read("packages/core/tests/unit/orders/PlaceOrderUseCase.test.ts");
    expect(test).toContain('describe("REQ-004 Place an order"');
    expect(test).toContain("features/place-an-order.feature");
  });

  it("--req names an existing requirement; --no-spec leaves Specgate alone", async () => {
    const { project, read } = await generate(node(), true);
    const { sg, calls } = fakeSpecgate();
    await add(project, "usecase", "orders/PlaceOrder", { req: "REQ-002" }, sg);
    expect(calls).toEqual(["matrix"]);
    expect(read("packages/core/tests/unit/orders/PlaceOrderUseCase.test.ts")).toContain('describe("REQ-002 Place order"');
    const r = await add(project, "usecase", "orders/CancelOrder", { spec: false }, neverAsked);
    expect(r.requirement).toBeUndefined();
    await expect(add(project, "usecase", "orders/X", { req: "7" }, neverAsked)).rejects.toThrow(/requirement id/);
  });

  it("a Specgate failure does not stop the use case", async () => {
    const { project } = await generate(node(), true);
    const { sg, calls } = fakeSpecgate(true);
    const result = await add(project, "usecase", "orders/PlaceOrder", {}, sg);
    expect(calls).toEqual(["new Place order"]);
    expect(result.created).toHaveLength(2);
    expect(result.specNote).toBe("Specgate did not answer.");
  });

  it("refuses to overwrite, before anything is written or asked of Specgate", async () => {
    const { project, read } = await generate(node(), true);
    await add(project, "usecase", "orders/PlaceOrder", { spec: false }, neverAsked);
    const index = read("packages/core/src/index.ts");
    await expect(add(project, "usecase", "orders/PlaceOrder", {}, neverAsked)).rejects.toThrow(/already exists/);
    expect(read("packages/core/src/index.ts")).toBe(index);
  });

  it("an entity and a port with its adapter", async () => {
    const { project, read } = await generate(node());
    await add(project, "entity", "Order", {}, neverAsked);
    const port = await add(project, "port", "OrderRepository", {}, neverAsked);
    expect(port.created).toEqual([
      "packages/core/src/ports/IOrderRepository.ts",
      "packages/core/src/infrastructure/database/repositories/InMemoryOrderRepository.ts",
    ]);
    expect(read("packages/core/src/infrastructure/database/repositories/InMemoryOrderRepository.ts")).toContain(
      'from "../../../ports/IOrderRepository.js"',
    );
    const gateway = await add(project, "port", "PaymentGateway", { adapter: false }, neverAsked);
    expect(gateway.created).toEqual(["packages/core/src/ports/IPaymentGateway.ts"]);
    const index = read("packages/core/src/index.ts");
    expect(index).toContain('export * from "./domain/entities/Order.js";');
    expect(index).toContain('export * from "./ports/IOrderRepository.js";');
  });

  it("a use case needs its module", async () => {
    const { project } = await generate(node());
    await expect(add(project, "usecase", "PlaceOrder", {}, neverAsked)).rejects.toThrow(/needs its module/);
  });

  it("--dry-run writes nothing", async () => {
    const { project, root } = await generate(node());
    const result = await add(project, "entity", "Order", { dryRun: true }, neverAsked);
    expect(result.created).toContain("packages/core/src/domain/entities/Order.ts");
    expect(fs.existsSync(path.join(root, "packages/core/src/domain/entities/Order.ts"))).toBe(false);
  });
});

describe("forja add — java", () => {
  for (const backend of ["spring", "quarkus"] as const) {
    it(`${backend}: a use case in an existing module joins its Configuration`, async () => {
      const { project, read } = await generate(parseForjaConfig(defaultJavaConfig("shop", backend)));
      await add(project, "usecase", "tasks/ArchiveTask", { req: "REQ-009" }, neverAsked);
      const base = "apps/api/src/main/java/com/shop/tasks";
      expect(read(`${base}/application/ArchiveTask.java`)).toContain("public final class ArchiveTask");
      const config = read(`${base}/infrastructure/config/TasksConfiguration.java`);
      expect(config).toContain("import com.shop.tasks.application.ArchiveTask;");
      expect(config).toMatch(/ArchiveTask archiveTask\(\) \{\n {4}return new ArchiveTask\(\);\n {2}\}\n\}/);
      expect(config).toContain(backend === "spring" ? "@Bean\n  ArchiveTask" : "@ApplicationScoped\n  ArchiveTask");
      // The imports stay one sorted block.
      const imports = config.split("\n").filter((l) => l.startsWith("import "));
      expect(imports).toEqual([...imports].sort());
      expect(read("apps/api/src/test/java/com/shop/tasks/application/ArchiveTaskTest.java")).toContain(
        '@DisplayName("REQ-009 Archive task")',
      );
    });

    it(`${backend}: a new module gets its own Configuration, entity and port`, async () => {
      const { project, read } = await generate(parseForjaConfig(defaultJavaConfig("shop", backend)));
      await add(project, "usecase", "orders/PlaceOrder", { spec: false }, neverAsked);
      await add(project, "entity", "orders/Order", {}, neverAsked);
      const port = await add(project, "port", "orders/OrderRepository", {}, neverAsked);
      const base = "apps/api/src/main/java/com/shop/orders";
      expect(read(`${base}/infrastructure/config/OrdersConfiguration.java`)).toContain("class OrdersConfiguration");
      expect(read(`${base}/domain/Order.java`)).toContain("public record Order(UUID id, Instant createdAt)");
      expect(port.created).toContain(`${base}/infrastructure/persistence/InMemoryOrderRepository.java`);
      expect(read(`${base}/infrastructure/persistence/InMemoryOrderRepository.java`)).toContain(
        backend === "spring" ? "@Component" : "@ApplicationScoped",
      );
    });
  }

  it("every Java class needs its module", async () => {
    const { project } = await generate(parseForjaConfig(defaultJavaConfig("shop", "spring")));
    await expect(add(project, "entity", "Order", {}, neverAsked)).rejects.toThrow(/needs its module/);
  });
});

describe("findProject", () => {
  it("says where to run it when there is no forja.config.json", () => {
    expect(() => findProject(os.tmpdir())).toThrow(
      expect.objectContaining({ fix: expect.stringMatching(/forja init/) }),
    );
  });
});
