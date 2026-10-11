# Backends Java (Spring Boot y Quarkus)

forja genera, además del backend en TypeScript (`backend: node`, el de v0.1),
una **API Java separada** en `apps/api`, con el mismo principio: arquitectura
hexagonal siempre.

## Opciones

| Campo | Valores | Por defecto con Java |
| --- | --- | --- |
| `backend` | `node` · `spring` · `quarkus` | — |
| `javaPackage` | p. ej. `com.acme.tienda` | `com.<nombre>` |
| `archunit` | `true` · `false` | `true` |
| `auth` | `oauth2` · `none` | `oauth2` |
| `db` | `postgres-docker` · `none` | `postgres-docker` |
| `platforms` | `web` (opcional) | `["web"]` |
| `extras` | `lint`, `ci`, `docker`, `specgate` | todos |

## Qué se genera

```
apps/api/                     # Spring Boot 4.1 o Quarkus 3.40, Java 21, Maven Wrapper
  src/main/java/<paquete>/
    shared/                   # errores de dominio, Problem Details (RFC 9457), usuario actual
    tasks/                    # módulo de ejemplo, hexagonal:
      domain/                 #   Task, TaskTitle — Java puro
      application/            #   casos de uso y puertos (TaskRepository, CurrentUser)
      infrastructure/         #   REST, JDBC/memoria, configuración
  src/test/java/...           # dominio, casos de uso, API, arranque real, ArchUnit
apps/web/                     # Next.js 16 + Auth.js (Keycloak) que consume la API
infra/keycloak/<nombre>-realm.json   # realm de desarrollo: clientes web y dev-cli, usuarios demo/otra
docker-compose.yml            # Postgres + Keycloak
.github/workflows/ci.yml      # API (Maven) + web (Node)
docs/brief.md + Specgate      # con el extra `specgate`
```

## Decisiones

- **Hexagonal sin anotaciones de framework en el dominio ni en la aplicación**:
  los casos de uso se instancian en `infrastructure/config`. Con `archunit`,
  un test lo hace cumplir.
- **OAuth2/OIDC con Keycloak**: la API es *resource server* (valida el JWT y
  toma el usuario del `sub`); la web hace *Authorization Code + PKCE* con
  Auth.js y llama a la API con el *access token*.
- **Errores en RFC 9457** (`application/problem+json`) con un `code` estable.
- **Un test que arranca la aplicación real** sin dobles (lección de los
  pilotos de Specgate: tests verdes con la app sin arrancar).
- **OpenAPI y health** de serie.

## Probado

Cada combinación (backend × base de datos × auth × ArchUnit × web) se renderiza en los tests de forja.
Además se generan y se prueban de verdad (Maven, Next.js build, lint, Docker) seis combinaciones
representativas, y la combinación completa se probó en un navegador real: login en Keycloak, crear y
completar tareas, cierre de sesión federado, aislamiento entre usuarios y sesión pública sin tokens.

## Pedir un token a mano (desarrollo)

```bash
curl -s -d grant_type=password -d client_id=dev-cli -d username=demo -d password=demo \
  http://localhost:8180/realms/<nombre>/protocol/openid-connect/token | jq -r .access_token
```
