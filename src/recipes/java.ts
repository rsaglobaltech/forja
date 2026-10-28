import type { RecipeContext } from "../engine/context.js";
import { javaPackageOf } from "../config/schema.js";

/** Pinned versions of what the Java recipes generate (reviewed 2026-10-11). */
export const versions = {
  springBoot: "4.1.2",
  springdoc: "3.1.1",
  quarkus: "3.40.1",
  archunit: "1.5.1",
  assertj: "3.27.6",
  specgate: "0.27.8",
  keycloak: "26.8",
  postgres: "17-alpine",
} as const;

export interface JavaData extends Record<string, unknown> {
  pkg: string;
  pkgPath: string;
  dbName: string;
  versions: typeof versions;
}

export function javaData(ctx: RecipeContext): JavaData {
  const pkg = javaPackageOf(ctx.config);
  return { pkg, pkgPath: pkg.replace(/\./g, "/"), dbName: ctx.config.name.replace(/-/g, "_"), versions };
}

/** Copies a Java template directory, turning `__pkg__` into the package path. */
export function copyJava(ctx: RecipeContext, src: string, dest: string, data: JavaData): void {
  ctx.copyDir(src, dest, data, (rel) => rel.replace("__pkg__", data.pkgPath));
}

export function copyMavenWrapper(ctx: RecipeContext, dest: string): void {
  ctx.copyFile("java-wrapper/mvnw", `${dest}/mvnw`);
  ctx.copyFile("java-wrapper/mvnw.cmd", `${dest}/mvnw.cmd`);
  ctx.copyFile("java-wrapper/.mvn/wrapper/maven-wrapper.properties", `${dest}/.mvn/wrapper/maven-wrapper.properties`);
  ctx.markExecutable(`${dest}/mvnw`);
}
