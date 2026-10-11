# Changelog

## 0.2.0 — 2026-10-11

- **Backends Java**: `--backend spring` (Spring Boot 4.1) y `--backend quarkus` (Quarkus 3.40), Java 21,
  en `apps/api`, siempre hexagonales, con un módulo de ejemplo (`tasks`) cuyo dominio y aplicación son
  Java puro y compartidos entre ambos.
- **ArchUnit** opcional con las reglas de la hexagonal.
- **OAuth2/OIDC**: API *resource server* + realm de Keycloak de desarrollo + login en la web con Auth.js
  (token solo en el servidor, cierre de sesión federado).
- **Web Next.js 16** para backends Java.
- **PostgreSQL**: JDBC + Flyway; tests con PostgreSQL real (Testcontainers / Dev Services). Puerto
  configurable (`DB_PORT`).
- **Extras**: `ci` (GitHub Actions), `docker` (Dockerfiles de producción), `specgate` (ficha, guía,
  adopción automática).
- Errores RFC 9457, OpenAPI, health, test de arranque real en todos los proyectos Java.
- forja: tests propios (vitest), `--skip-install`, `--skip-git`, `copyDir` con traducción de rutas,
  ficheros ejecutables.

## 0.1.0

- Monorepo web (Next.js) + móvil (Expo) con `packages/core` hexagonal en TypeScript, sesiones propias,
  Drizzle + PostgreSQL, Tailwind/NativeWind.
