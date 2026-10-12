import { javaPackageOf, type ForjaConfig } from "../config/schema.js";
import { Changes } from "./changes.js";
import { camel, pascal, sentence } from "./names.js";
import type { Requirement } from "./node.js";

/**
 * `forja add` on the Java path (Spring Boot or Quarkus): everything lands in
 * one module of apps/api, the same shape as the generated `tasks` module —
 * domain/, application/ (+ port/), infrastructure/config. The use cases carry
 * no annotations; <Module>Configuration is the only class that knows them and
 * the framework at once, which is what the ArchUnit rules check.
 */
export class JavaModule {
  readonly pkg: string;
  private readonly main: string;
  private readonly test: string;

  constructor(
    private readonly config: ForjaConfig,
    readonly module: string,
  ) {
    const base = javaPackageOf(config);
    this.pkg = `${base}.${module}`;
    const path = this.pkg.replace(/\./g, "/");
    this.main = `apps/api/src/main/java/${path}`;
    this.test = `apps/api/src/test/java/${path}`;
  }

  private get spring(): boolean {
    return this.config.backend === "spring";
  }

  addUseCase(changes: Changes, name: string, req?: Requirement): void {
    const title = req?.title ?? sentence(name);
    changes.create(
      `${this.main}/application/${name}.java`,
      `package ${this.pkg}.application;

/**
 * Use case: ${title}.${req ? ` Specified by ${req.id}.` : ""}
 *
 * No annotations: it is instantiated in infrastructure/config. Ports
 * (application/port) come in through the constructor.
 */
public final class ${name} {
  public void execute() {
    // The rule this use case enforces goes here.
  }
}
`,
    );

    changes.create(
      `${this.test}/application/${name}Test.java`,
      `package ${this.pkg}.application;

import static org.assertj.core.api.Assertions.assertThatCode;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("${req ? `${req.id} ` : ""}${title}")
class ${name}Test {
  @Test
  void runs() {
    assertThatCode(() -> new ${name}().execute()).doesNotThrowAnyException();
  }

  @Test
  @Disabled("${req?.featureFile ? `to write: the scenario in ${req.featureFile}` : "to write: what the use case promises"}")
  void provesTheScenario() {}
}
`,
    );

    this.registerBean(changes, name);
  }

  addEntity(changes: Changes, name: string): void {
    changes.create(
      `${this.main}/domain/${name}.java`,
      `package ${this.pkg}.domain;

import java.time.Instant;
import java.util.UUID;

/** Entity: ${sentence(name).toLowerCase()}. Pure Java: no framework. */
public record ${name}(UUID id, Instant createdAt) {

  public static ${name} create(Instant now) {
    return new ${name}(UUID.randomUUID(), now);
  }
}
`,
    );

    changes.create(
      `${this.test}/domain/${name}Test.java`,
      `package ${this.pkg}.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class ${name}Test {
  @Test
  void isCreatedWithAnId() {
    Instant now = Instant.parse("2026-01-01T10:00:00Z");
    ${name} created = ${name}.create(now);
    assertThat(created.id()).isNotNull();
    assertThat(created.createdAt()).isEqualTo(now);
  }
}
`,
    );
  }

  addPort(changes: Changes, name: string, adapter: boolean): void {
    changes.create(
      `${this.main}/application/port/${name}.java`,
      `package ${this.pkg}.application.port;

/**
 * Outbound port: what the module needs from the outside world, in its own
 * words. Adapters in infrastructure implement it.
 */
public interface ${name} {}
`,
    );
    if (!adapter) return;

    const dir = name.endsWith("Repository") ? "persistence" : "adapters";
    const annotation = this.spring
      ? { import: "org.springframework.stereotype.Component", use: "@Component" }
      : { import: "jakarta.enterprise.context.ApplicationScoped", use: "@ApplicationScoped" };
    changes.create(
      `${this.main}/infrastructure/${dir}/InMemory${name}.java`,
      `package ${this.pkg}.infrastructure.${dir};

import ${this.pkg}.application.port.${name};
import ${annotation.import};

/** In-memory adapter for ${name}: for tests and for running without the real service. */
${annotation.use}
class InMemory${name} implements ${name} {}
`,
    );
  }

  /** Adds a bean for the use case to <Module>Configuration, creating it the first time. */
  private registerBean(changes: Changes, name: string): void {
    const cls = `${pascal(this.module)}Configuration`;
    const file = `${this.main}/infrastructure/config/${cls}.java`;
    const useCaseImport = `import ${this.pkg}.application.${name};`;
    const method = this.spring
      ? `  @Bean\n  ${name} ${camel(name)}() {\n    return new ${name}();\n  }\n`
      : `  @Produces\n  @ApplicationScoped\n  ${name} ${camel(name)}() {\n    return new ${name}();\n  }\n`;

    if (!changes.exists(file)) {
      const imports = this.spring
        ? ["import org.springframework.context.annotation.Bean;", "import org.springframework.context.annotation.Configuration;"]
        : ["import jakarta.enterprise.context.ApplicationScoped;", "import jakarta.enterprise.inject.Produces;"];
      const framework = this.spring ? "Spring" : "CDI";
      changes.create(
        file,
        `package ${this.pkg}.infrastructure.config;

${[useCaseImport, ...imports].sort().join("\n")}

/** The only place that knows both the use cases and ${framework}: they are wired here. */
${this.spring ? "@Configuration(proxyBeanMethods = false)\n" : ""}class ${cls} {
${method}}
`,
      );
      return;
    }

    const lines = changes.read(file).split("\n");
    const importLines = lines.filter((l) => l.startsWith("import "));
    const first = lines.findIndex((l) => l.startsWith("import "));
    const rest = lines.filter((l, i) => i < first || !l.startsWith("import "));
    rest.splice(first, 0, ...[...new Set([...importLines, useCaseImport])].sort());
    const close = rest.map((l) => l.trimEnd()).lastIndexOf("}");
    rest.splice(close, 0, `\n${method}`.replace(/\n$/, ""));
    changes.update(file, rest.join("\n"));
  }
}
