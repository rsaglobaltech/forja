# forja

CLI de scaffolding para proyectos con **arquitectura hexagonal**: monorepos web + móvil en TypeScript, o
una **API Java (Spring Boot o Quarkus)** con su frontend web, OAuth2 y todo lo necesario para empezar a
trabajar con tests, CI y especificaciones desde el primer commit.

```bash
npm install && npm run build && npm link     # instala el comando `forja`
forja init                                   # asistente
forja init acme --yes --backend spring       # sin preguntas
```

## Qué genera

| Backend | API | Frontend | Auth | Base de datos |
| --- | --- | --- | --- | --- |
| `node` (v0.1) | `packages/core` en TypeScript | Next.js (+ Expo) | sesiones propias | Drizzle + PostgreSQL |
| `spring` | `apps/api` — Spring Boot 4.1, Java 21 | Next.js 16 | OAuth2/OIDC (Keycloak) | JDBC + Flyway + PostgreSQL |
| `quarkus` | `apps/api` — Quarkus 3.40, Java 21 | Next.js 16 | OAuth2/OIDC (Keycloak) | JDBC + Flyway + PostgreSQL |

Siempre hexagonal. Con Java, además:

- **ArchUnit** (opcional, `--archunit` / `--no-archunit`): el build falla si el dominio usa el framework, si
  la aplicación usa adaptadores o si un módulo se acopla a la infraestructura de otro.
- **OAuth2**: la API es *resource server* (JWT); la web hace *Authorization Code + PKCE* con Auth.js y llama a
  la API desde el servidor con el *access token*, que nunca llega al navegador. Keycloak de desarrollo en
  `docker compose`, con un realm listo (usuarios `demo/demo` y `otra/otra`).
- **Errores RFC 9457** con un `code` estable, **OpenAPI** y **health**.
- **Tests de serie**: dominio, casos de uso con dobles, API de punta a punta (PostgreSQL real con
  Testcontainers o Dev Services) y un test que arranca la aplicación real sin dobles.
- **Extras**: CI de GitHub Actions, Dockerfiles de producción y
  [Specgate](https://www.npmjs.com/package/@rsaglobaltech/specgate) (desarrollo guiado por especificaciones).

Detalle en [`docs/java-backends.md`](docs/java-backends.md). Diseño original del CLI:
[`scaffold-cli.md`](scaffold-cli.md).

## Opciones de `forja init`

| Flag | Valores |
| --- | --- |
| `--backend` | `node` · `spring` · `quarkus` |
| `--java-package` | p. ej. `com.acme.tienda` (por defecto `com.<nombre>`) |
| `--archunit` / `--no-archunit` | reglas de arquitectura (Java) |
| `--platforms` | `web,mobile` (Java: `web` o `""` para solo API) |
| `--db` | `postgres-docker` · `none` |
| `--auth` | `sessions` (node) · `oauth2` (Java) · `none` |
| `--design` | `tailwind` · `none` |
| `--extras` | `lint`, `ci`, `docker` (Java), `specgate` |
| `--yes` | sin preguntas: defaults + flags |
| `--dry-run` | imprime el árbol sin escribir |
| `--skip-install`, `--skip-git` | no instalar / no hacer git init |

## Desarrollo de forja

```bash
npm test            # reglas de configuración, planificación y renderizado de todas las combinaciones Java
npm run typecheck
npm run dev -- init demo --yes --backend quarkus --dry-run
```

Las recetas están en `src/recipes/` y sus plantillas (EJS) en `templates/`. Una receta escribe en un
sistema de ficheros en memoria; nada toca el disco hasta el final.
