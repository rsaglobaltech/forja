# `forja` — CLI de scaffolding para monorepos web + móvil con DDD / Hexagonal

> Especificación de diseño. Nace de destilar lo que ya funciona en este repo
> (`lingua-ai`) en un generador reutilizable: monorepo npm workspaces, Next.js
> en `apps/web`, Expo en `apps/mobile`, hexágono server-only en
> `packages/core`, contrato HTTP isomorfo en `packages/shared`, sesiones con
> token hasheado, tests en tres niveles.
>
> Nombre provisional: **forja** (`npx forja`). Cambiar a gusto.

---

## 0. Resumen en una pantalla

```
$ npx forja

  ┌  forja · nuevo proyecto
  │
  ◇  Nombre del proyecto
  │  acme-app
  │
  ◇  ¿Qué plataformas?
  │  ● Web (Next.js)   ● Móvil (Expo)
  │
  ◇  Arquitectura del backend
  │  ○ Simple   ○ Clean   ● Hexagonal (DDD)
  │
  ◇  Base de datos
  │  ● PostgreSQL local (Docker)   ○ Supabase   ○ Ninguna (in-memory)
  │
  ◇  Autenticación
  │  ● Sesiones propias (token + cookie/Bearer)   ○ Supabase Auth   ○ Ninguna
  │
  ◇  Envío de email (recuperación de contraseña)
  │  ● Consola (dev)   ○ Resend   ○ SMTP (nodemailer)
  │
  ◇  Sistema de diseño
  │  ● Tailwind (web) + NativeWind (móvil), tokens compartidos   ○ Sin estilos
  │
  ◇  Componentes UI
  │  ● Propios (generados)   ○ shadcn/ui (web) + React Native Reusables (móvil)
  │
  ◇  Backend en Supabase Edge Functions (Deno)      ← solo si DB = Supabase
  │  ○ No, todo en Next   ● Sí, auth + jobs en Edge Functions
  │
  ◇  Builds móviles con EAS (Expo Application Services)
  │  ● Sí: eas.json + perfiles dev/preview/production   ○ Solo Expo Go
  │
  ◇  Tests
  │  ● Unit (vitest)  ● Integration (vitest)  ● E2E web (Playwright)  ○ E2E móvil (Maestro)
  │
  ◇  Extras
  │  ● ESLint+Prettier  ● Husky+lint-staged  ● GitHub Actions  ● Docker Compose
  │  ○ i18n  ○ Trigger.dev (jobs)  ○ Cliente IA (OpenAI/Claude)  ○ Storybook
  │
  ◇  Package manager
  │  ● npm   ○ pnpm   ○ bun
  │
  └  Generando acme-app… ✔  (28 s)

  Siguientes pasos:
    cd acme-app
    docker compose up -d
    npm run db:push
    npm run dev          # http://localhost:3000/login
    npm run mobile       # Expo
    npm test             # unit + integration
    npm run test:e2e     # Playwright
```

Todo lo que el wizard pregunta se puede pasar por flags o por un
`forja.config.json` (`npx forja --config forja.config.json --yes`) para CI y
para regenerar proyectos idénticos.

---

## 1. Objetivos y no-objetivos

**Objetivos**

1. Un proyecto nuevo arranca en < 1 minuto con login, registro y recuperación
   de contraseña **funcionando y testeados** end-to-end, no solo con carpetas
   vacías.
2. El código generado es el mismo que escribiría una persona con criterio:
   comentarios que explican el *por qué*, sin capas vacías "por si acaso".
3. Cada decisión del wizard cambia código real, no solo un `README`.
4. El CLI sigue siendo útil después del día 1: `forja add <cosa>` genera
   casos de uso, puertos, adaptadores, pantallas y sus tests con la misma
   convención.

**No-objetivos**

- No es un framework. El proyecto generado no depende de `forja` en runtime.
- No abstrae Next/Expo/Drizzle detrás de una API propia. Se genera código
  idiomático de cada herramienta.
- No cubre backend separado (NestJS, Fastify) en la v1. La API vive en los
  route handlers de Next, como en este repo. Queda como *recipe* futura.

---

## 2. Stack del CLI en sí

| Pieza | Elección | Por qué |
|---|---|---|
| Runtime | Node ≥ 22, TypeScript, ESM | Mismo runtime que los proyectos generados. |
| Prompts | `@clack/prompts` | Estético, cancelable, agrupa preguntas, soporta `multiselect`. |
| Args/flags | `commander` | Subcomandos (`init`, `add`, `doctor`), `--yes`, `--config`. |
| Templates | Archivos `.ejs` + copia literal | Lógica condicional donde hace falta (`<% if (auth === "sessions") %>`), copia plana para el resto. Evitar Handlebars: no permite JS en el template y termina en helpers ad-hoc. |
| Ejecución de procesos | `execa` | `npm install`, `git init`, `docker compose up`. |
| Formato final | `prettier` (API programática) | Los templates pueden quedar feos tras condicionales; se formatea todo al final. |
| Validación de config | `zod` | Mismo schema para wizard, flags y `forja.config.json`. |
| Tests del CLI | `vitest` + snapshot de árboles | Cada combinación de respuestas → árbol de archivos esperado. |

Empaquetado: `npm publish` como `forja` con `bin`. Uso vía `npx forja` o
`npm create forja@latest` (crear alias `create-forja`).

---

## 3. Flujo de preguntas (wizard)

Orden y dependencias. Cada pregunta se salta si ya viene por flag/config.

| # | Pregunta | Tipo | Default | Depende de |
|---|---|---|---|---|
| 1 | Nombre del proyecto | text, validado `^[a-z][a-z0-9-]*$` | `mi-app` | — |
| 2 | Scope de paquetes internos (`@acme/*`) | text | `@<nombre>` | 1 |
| 3 | Plataformas | multiselect: `web`, `mobile` | ambas | — |
| 4 | Arquitectura | select: `simple`, `clean`, `hexagonal` | `hexagonal` | — |
| 5 | Base de datos | select: `postgres-docker`, `supabase`, `none` | `postgres-docker` | — |
| 6 | Autenticación | select: `sessions`, `supabase-auth`, `none` | `sessions` (o `supabase-auth` si DB = supabase) | 5 |
| 7 | Mailer | select: `console`, `resend`, `smtp` | `console` | 6 ≠ none |
| 7b | Sistema de diseño | select: `tailwind`, `none` | `tailwind` | — |
| 7c | Componentes UI | select: `own`, `shadcn` | `own` | 7b = tailwind |
| 7d | Edge Functions (Deno) | confirm | no | 5 = supabase |
| 7e | EAS (builds/updates) | confirm | sí | 3 ∋ mobile |
| 8 | Tests | multiselect: `unit`, `integration`, `e2e-web`, `e2e-mobile` | unit+integration+e2e-web | 3 |
| 9 | Extras | multiselect | lint, husky, ci, docker | — |
| 10 | Package manager | select: `npm`, `pnpm`, `bun` | detectado por `npm_config_user_agent` | — |
| 11 | ¿Inicializar git y primer commit? | confirm | sí | — |
| 12 | ¿Instalar dependencias ahora? | confirm | sí | — |

Reglas cruzadas (se validan con zod y se muestran como error claro):

- `auth = sessions` requiere `db ≠ none` **o** cae a repositorios in-memory
  con aviso ("las sesiones no sobreviven al reinicio").
- `auth = supabase-auth` requiere `db = supabase`.
- `e2e-mobile` requiere `mobile`.
- `arquitectura = simple` + `db = none` → proyecto mínimo, sin `packages/core`.
- `edge-functions` requiere `db = supabase` y `auth = supabase-auth`.
- `ui = shadcn` requiere `design = tailwind`.
- `eas` requiere `mobile`; sin EAS no se genera `eas.json` ni el workflow de build.

### 3.1 Flags equivalentes

```
npx forja init acme-app \
  --platforms web,mobile \
  --arch hexagonal \
  --db postgres-docker \
  --auth sessions \
  --mailer console \
  --design tailwind --ui own \
  --eas \
  --tests unit,integration,e2e-web \
  --extras lint,husky,ci,docker \
  --pm npm \
  --yes
```

`--dry-run` imprime el árbol que generaría sin escribir nada.

### 3.2 `forja.config.json`

Se escribe en la raíz del proyecto generado. Es la "memoria" de las
decisiones: `forja add` lo lee para saber qué arquitectura y qué scope usar.

```json
{
  "$schema": "https://forja.dev/schema.json",
  "version": 1,
  "name": "acme-app",
  "scope": "@acme",
  "platforms": ["web", "mobile"],
  "arch": "hexagonal",
  "db": "postgres-docker",
  "auth": "sessions",
  "mailer": "console",
  "design": "tailwind",
  "ui": "own",
  "edgeFunctions": false,
  "eas": true,
  "tests": ["unit", "integration", "e2e-web"],
  "extras": ["lint", "husky", "ci", "docker"],
  "pm": "npm"
}
```

---

## 4. Estructura generada

### 4.1 Base común (cualquier combinación)

```
acme-app/
├── package.json              # workspaces: apps/*, packages/*; scripts agregados
├── tsconfig.base.json
├── .env.example              # SOLO las variables que aplican a lo elegido
├── .gitignore
├── .editorconfig
├── forja.config.json
├── README.md                 # generado con los pasos reales del proyecto
├── docs/
│   └── architecture.md       # explica la arquitectura elegida con ejemplos del propio repo
├── apps/
│   ├── web/                  # si platforms ∋ web
│   └── mobile/               # si platforms ∋ mobile
└── packages/
    ├── shared/               # siempre: tipos isomorfos, contrato HTTP, tokens de diseño
    └── core/                 # si arch ≠ simple
```

### 4.2 `packages/core` según arquitectura

**`hexagonal`** (lo que tiene este repo, pulido):

```
packages/core/src/
├── index.ts                        # barrel público (este repo NO lo tiene y lo declara en package.json — bug a evitar)
├── domain/
│   ├── entities/User.ts
│   ├── value-objects/Email.ts
│   ├── value-objects/Password.ts   # política: longitud mínima, etc.
│   ├── services/SessionToken.ts
│   ├── events/UserRegistered.ts
│   └── shared/{errors,Result,ids}.ts
├── application/
│   └── auth/
│       ├── RegisterUseCase.ts
│       ├── LoginUseCase.ts
│       ├── LogoutUseCase.ts
│       ├── ValidateSessionUseCase.ts
│       ├── RequestPasswordResetUseCase.ts
│       └── ResetPasswordUseCase.ts
├── ports/
│   ├── IUserRepository.ts
│   ├── ISessionRepository.ts
│   ├── IPasswordResetTokenRepository.ts
│   ├── IPasswordHasher.ts
│   ├── IMailer.ts
│   ├── IClock.ts                    # fechas inyectables → tests deterministas
│   └── ILogger.ts
└── infrastructure/
    ├── config/{env,container}.ts    # composition root, switches por env var independientes
    ├── database/
    │   ├── db.ts                    # conexión lazy (no explota sin DATABASE_URL)
    │   ├── schema.ts
    │   └── repositories/{Drizzle,InMemory}{User,Session,PasswordResetToken}Repository.ts
    ├── security/BcryptPasswordHasher.ts
    ├── mail/{ConsoleMailer,ResendMailer,SmtpMailer}.ts
    └── logging/ConsoleLogger.ts
```

**`clean`**: mismas capas pero nombradas `entities/`, `use-cases/`,
`interface-adapters/`, `frameworks/`; los puertos viven junto al caso de
uso que los define (`use-cases/auth/ports.ts`) en vez de en una carpeta
global. Diferencia deliberadamente pequeña: la elección es de vocabulario
del equipo, no de topología.

**`simple`**: sin `packages/core`. Lógica en `apps/web/src/server/auth/*.ts`
(funciones planas), Drizzle directo, sin puertos ni in-memory. Para MVPs
descartables o prototipos de un fin de semana.

### 4.3 `apps/web` (Next.js App Router)

```
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/[token]/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx               # AppShell con sesión resuelta
│   │   └── dashboard/page.tsx       # placeholder autenticado
│   ├── api/
│   │   ├── _lib/session.ts          # bearer ∨ cookie → userId
│   │   └── auth/{register,login,logout,me,forgot-password,reset-password}/route.ts
│   ├── layout.tsx
│   └── globals.css
├── src/app/actions/auth.actions.ts   # Server Actions: mismas use cases que la API
├── components/ui/{Button,Input,FormField,Toast}.tsx
├── middleware.ts                     # CORS para /api + redirect a /login si no hay cookie
├── tests/e2e/                        # Playwright
├── next.config.ts                    # turbopack.root = raíz del monorepo; transpilePackages
└── playwright.config.ts
```

### 4.4 `apps/mobile` (Expo Router)

```
apps/mobile/
├── app/
│   ├── _layout.tsx                   # AuthProvider + SessionGate
│   ├── (auth)/{login,register,forgot-password}.tsx
│   └── (app)/index.tsx
├── lib/api.ts                        # cliente tipado contra @acme/shared
├── lib/auth.tsx                      # token en SecureStore (localStorage en web con aviso)
├── components/ui/…
└── .maestro/                         # si e2e-mobile
```

### 4.5 `packages/shared`

```
packages/shared/src/
├── index.ts
├── api/auth.ts       # LoginRequest/Response, RegisterRequest, ForgotPasswordRequest, ResetPasswordRequest, MeResponse, ApiError
├── validation/auth.ts# schemas zod compartidos: web, móvil y API validan igual
└── tokens.ts         # paleta/tipografía compartidas (NativeWind + Tailwind)
```

---

## 5. Módulo de autenticación generado

Es el corazón del CLI: todo proyecto arranca con este flujo completo.

### 5.1 Casos de uso

| Use case | Entrada | Salida | Reglas |
|---|---|---|---|
| `RegisterUseCase` | email, password | `{ userId }` | Email único (error `EmailAlreadyInUse`), password cumple política, hash antes de guardar, emite `UserRegistered`. **No** hace login implícito: el adaptador encadena `CreateSession`. |
| `LoginUseCase` | email, password | `{ userId }` | `InvalidCredentials` tanto si el email no existe como si la contraseña falla (no revelar cuál). Nunca "registra al pasar" — este repo lo hace y es una trampa. |
| `CreateSessionUseCase` | userId | `{ token, expiresAt }` | Token aleatorio 32 bytes, se guarda SHA-256, TTL 30 días. |
| `ValidateSessionUseCase` | token | `userId \| null` | Nunca lanza; borra sesiones vencidas al pasar. |
| `RevokeSessionUseCase` | token | void | Idempotente. |
| `RequestPasswordResetUseCase` | email | void | **Siempre** responde OK aunque el email no exista (anti-enumeración). Genera token aleatorio, guarda hash + expiración 1 h + `usedAt`, manda mail con link `/reset-password/<token>`. Invalida tokens anteriores del usuario. |
| `ResetPasswordUseCase` | token, newPassword | void | Token existe, no vencido, no usado; actualiza hash, marca token usado, **revoca todas las sesiones** del usuario. |

### 5.2 Puertos y adaptadores

| Puerto | Real | Test / dev |
|---|---|---|
| `IUserRepository` | `DrizzleUserRepository` | `InMemoryUserRepository` |
| `ISessionRepository` | `DrizzleSessionRepository` | `InMemorySessionRepository` |
| `IPasswordResetTokenRepository` | `DrizzlePasswordResetTokenRepository` | `InMemoryPasswordResetTokenRepository` |
| `IPasswordHasher` | `BcryptPasswordHasher` (cost 12) | `FakePasswordHasher` (`hashed:<plain>`) |
| `IMailer` | `ResendMailer` / `SmtpMailer` | `ConsoleMailer` (imprime el link) / `InMemoryMailer` (guarda los mails → los e2e leen el token de ahí) |
| `IClock` | `SystemClock` | `FixedClock` |

El `container.ts` elige adaptador por **switches independientes** leyendo env
(`hasDatabase()`, `hasMailer()`), nunca un flag global `isDemo`. Lección de
este repo: acoplar switches rompe la adopción incremental de infra.

### 5.3 Esquema Drizzle

```ts
users                  (id uuid pk, email text unique, password_hash text not null, created_at, updated_at)
sessions               (token_hash text pk, user_id fk cascade, expires_at, created_at)
password_reset_tokens  (token_hash text pk, user_id fk cascade, expires_at, used_at nullable, created_at)
```

Con Supabase Auth se omiten `sessions` y `password_reset_tokens`: la tabla
`users` se convierte en `profiles (id uuid pk references auth.users)` y los
casos de uso de sesión se reemplazan por un adaptador `SupabaseAuthGateway`
detrás del puerto `IAuthGateway`. Las pantallas y tests son los mismos.

### 5.4 Transporte

- **Web**: Server Actions (`auth.actions.ts`) para las pantallas propias +
  route handlers `/api/auth/*` para el móvil. Ambos llaman al mismo
  `container.*UseCase`. Cookie `session`: `httpOnly`, `secure` en prod,
  `sameSite: "lax"`, `path: "/"`.
- **Móvil**: `Authorization: Bearer <token>`; token en `expo-secure-store`.
- `middleware.ts` solo mira si la cookie **existe** (Edge, sin driver de DB);
  la validación real ocurre en `getCurrentUserId()` / `resolveUserId()`. El
  comentario generado lo deja explícito para que nadie lo confunda con
  control de acceso.
- Rate limiting en `login`, `register`, `forgot-password`: adaptador
  `InMemoryRateLimiter` (por IP + email, ventana deslizante) detrás de
  `IRateLimiter`; recipe opcional para Upstash.

### 5.5 Pantallas

Web (Tailwind v4, componentes propios, sin librería de UI para no casarse
con una):

- `/login` — email + password, link a registro y a "olvidé mi contraseña".
- `/register` — email + password + confirmación; muestra la política.
- `/forgot-password` — email; siempre muestra "si existe, te mandamos un mail".
- `/reset-password/[token]` — nueva contraseña; token inválido → mensaje + link a pedir otro.
- `/dashboard` — placeholder con "Hola, {email}" y botón "Cerrar sesión".

Móvil (NativeWind): las mismas cuatro pantallas de auth + `index` autenticado.
`reset-password` en móvil abre por deep link (`acme://reset-password/<token>`)
configurado en `app.json` → `scheme`.

---

## 5b. Sistema de diseño: Tailwind (web) + NativeWind (móvil)

Objetivo: **un solo archivo de tokens**, dos motores de estilos. Web y
móvil pintan exactamente los mismos colores/espaciados sin copiar hexes a
mano.

### 5b.1 Dependencias que instala la recipe `design-tailwind`

| Workspace | Paquete | Versión | Nota |
|---|---|---|---|
| `apps/web` | `tailwindcss` | `^4` | Motor v4, config en CSS (`@theme`). |
| `apps/web` | `@tailwindcss/postcss` | `^4` | Único plugin de PostCSS. |
| `apps/web` | `next-themes` | `^0.4` | Toggle claro/oscuro; `@custom-variant dark` sobre `.dark`. |
| `apps/web` | `clsx`, `tailwind-merge` | latest | Helper `cn()` generado. |
| `apps/mobile` | `nativewind` | `^4.2` | Tailwind sobre React Native. |
| `apps/mobile` | `tailwindcss` | `^3.4` | **v3 obligatoria**: NativeWind 4 no soporta Tailwind v4. Es la única desalineación web/móvil aceptada y se documenta. |
| `apps/mobile` | `react-native-reanimated`, `react-native-worklets` | pinned por Expo SDK | NativeWind los usa para transiciones; el plugin de worklets va **último** en `babel.config.js`. |
| `apps/mobile` | `react-native-safe-area-context` | pinned | `SafeAreaProvider` en `_layout.tsx`. |
| `packages/shared` | — | — | `tokens.ts` sin dependencias. |

### 5b.2 Tokens compartidos y codegen

```
packages/shared/src/design/
├── tokens.ts          # FUENTE DE VERDAD: palette, spacing, radius, fontSizes, fontFamily
└── semantic.ts        # { light: { app, surface, text, … }, dark: { … } } sobre palette
```

Problema real de este repo: `globals.css` (web, `@theme` en CSS) no puede
importar TypeScript, así que los hexes están duplicados a mano. El CLI lo
resuelve con codegen:

```
npm run design:build
  → packages/shared/src/design/tokens.ts
      ├─→ apps/web/app/theme.generated.css       (@theme { --color-brand-500: #4cc13b; … })
      └─→ apps/mobile/tailwind.generated.js      (module.exports = { theme: { extend: { colors: … } } })
```

- Script `packages/shared/scripts/build-tokens.ts` (tsx, ~60 líneas).
- Se corre en `postinstall` y en `predev`; los archivos generados van en
  `.gitignore` con header `// GENERADO — no editar`.
- `globals.css` hace `@import "./theme.generated.css";` y `tailwind.config.ts`
  del móvil hace `presets: [require("./tailwind.generated.js")]`.
- Test unitario generado: `tokens.test.ts` verifica contraste WCAG AA mínimo
  entre `semantic.light.text` y `semantic.light.app` (y dark).

### 5b.3 Configuración que genera para el móvil

```js
// babel.config.js
presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
plugins: ["react-native-worklets/plugin"],   // último, reescribe worklets de Reanimated

// metro.config.js — monorepo + NativeWind
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [app/node_modules, workspace/node_modules];
config.resolver.disableHierarchicalLookup = true;
module.exports = withNativeWind(config, { input: "./global.css" });

// tailwind.config.ts
content: ["./app/**/*.tsx", "./components/**/*.tsx", "../../packages/shared/src/**/*.tsx"],
presets: [require("nativewind/preset"), require("./tailwind.generated.js")],

// global.css → @tailwind base/components/utilities
// nativewind-env.d.ts → /// <reference types="nativewind/types" />
```

Fuentes: recipe instala `expo-font` + un paquete `@expo-google-fonts/<x>`
elegido en `tokens.ts` (`fontFamily.sans`), y en web la misma familia via
`next/font/google`. El `_layout.tsx` móvil generado espera `useFonts` antes
de renderizar (evita FOUT), como en este repo.

### 5b.4 Componentes

`ui = own` (default): la recipe genera en cada app `components/ui/`:
`Button`, `Input`, `FormField` (label + error + hint), `Card`, `Toast`,
`Spinner`, `Screen` (móvil: SafeArea + padding). Mismos nombres y props en
web y móvil; implementación distinta. Storybook opcional los documenta.

`ui = shadcn`: en web corre `npx shadcn@latest init` + `add button input
form card toast` con el `components.json` apuntando al `theme.generated.css`;
en móvil instala `react-native-reusables` (port de shadcn sobre NativeWind).
Las pantallas de auth generadas usan estos componentes en vez de los propios.

`design = none`: sin Tailwind ni NativeWind. Pantallas con `StyleSheet` /
CSS Modules mínimos. Para quien ya tiene su propio sistema.

---

## 5c. Expo: configuración del proyecto y EAS (Expo Application Services)

"Expo cloud" = **EAS**: EAS Build (compila iOS/Android en la nube, sin Xcode
local), EAS Submit (sube a App Store / Play), EAS Update (OTA de JS sin
pasar por las stores). La recipe `mobile` genera lo básico; `eas = true`
agrega la parte cloud.

### 5c.1 `app.config.ts` (no `app.json`)

Se genera `app.config.ts` en lugar de `app.json` para poder leer env y
variar por perfil:

```ts
import type { ExpoConfig } from "expo/config";

const profile = process.env.APP_ENV ?? "development"; // development | preview | production
const isProd = profile === "production";

export default (): ExpoConfig => ({
  name: isProd ? "Acme" : `Acme (${profile})`,
  slug: "acme-app",
  scheme: "acme",                                 // deep links: acme://reset-password/<token>
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  splash: { image: "./assets/splash.png", backgroundColor: "#ffffff" },
  ios: {
    bundleIdentifier: isProd ? "com.acme.app" : `com.acme.app.${profile}`,
    supportsTablet: false,
  },
  android: {
    package: isProd ? "com.acme.app" : `com.acme.app.${profile}`,
    adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#ffffff" },
  },
  web: { bundler: "metro", output: "single" },
  plugins: ["expo-router", "expo-secure-store", "expo-font"],
  experiments: { typedRoutes: true },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
  updates: { url: `https://u.expo.dev/${process.env.EAS_PROJECT_ID}` },
  runtimeVersion: { policy: "appVersion" },
});
```

Bundle IDs distintos por perfil → se pueden tener dev, preview y prod
instaladas a la vez en el mismo teléfono.

### 5c.2 `eas.json`

```json
{
  "cli": { "version": ">= 12.0.0", "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": { "APP_ENV": "development" },
      "ios": { "simulator": true }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "env": { "APP_ENV": "preview", "EXPO_PUBLIC_API_URL": "https://staging.acme.app" }
    },
    "production": {
      "autoIncrement": true,
      "channel": "production",
      "env": { "APP_ENV": "production", "EXPO_PUBLIC_API_URL": "https://acme.app" }
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "…", "ascAppId": "…", "appleTeamId": "…" },
      "android": { "serviceAccountKeyPath": "./google-play-key.json", "track": "internal" }
    }
  }
}
```

Los secretos (`EAS_PROJECT_ID`, credenciales de submit) **no** van en el repo:
`eas secret:create` o variables de entorno de EAS; `.env.example` lista
`EAS_PROJECT_ID` con comentario.

### 5c.3 Scripts que agrega a `apps/mobile/package.json`

```json
"start": "expo start",
"start:dev-client": "expo start --dev-client",
"ios": "expo run:ios",
"android": "expo run:android",
"web": "expo start --web",
"prebuild": "expo prebuild --clean",
"build:dev": "eas build --profile development --platform all",
"build:preview": "eas build --profile preview --platform all",
"build:prod": "eas build --profile production --platform all",
"submit:prod": "eas submit --profile production --platform all",
"update:preview": "eas update --channel preview --message",
"update:prod": "eas update --channel production --message",
"doctor": "npx expo-doctor"
```

### 5c.4 Pasos post-creación (el CLI los ejecuta o los imprime)

1. `npx expo install --fix` — alinea versiones nativas con el SDK.
2. Si `eas = true` y hay sesión (`eas whoami`): `eas init` → escribe
   `EAS_PROJECT_ID` en `.env.local`. Si no hay sesión, imprime
   `npx eas login && npx eas init` como siguiente paso.
3. `npx expo-doctor` — se integra en `forja doctor`.

### 5c.5 Dev build vs Expo Go

`expo-secure-store`, Reanimated y NativeWind funcionan en Expo Go, pero
cualquier módulo nativo extra (notificaciones push, cámara custom, Sentry)
requiere **development build** (`build:dev`). El README generado explica
cuándo saltar de Expo Go a dev client, y `forja add recipe <x>` avisa si la
recipe agrega un módulo nativo.

### 5c.6 Workflow CI `.github/workflows/mobile.yml`

```
on: push a main (paths: apps/mobile/**, packages/shared/**)
jobs:
  preview:  eas build --profile preview --non-interactive --no-wait
  update:   eas update --channel preview --auto   # OTA si solo cambió JS
```

Requiere secret `EXPO_TOKEN` en GitHub. Usa `expo/expo-github-action`.
Producción se dispara a mano (`workflow_dispatch`) para no compilar en cada
merge.

### 5c.7 Deep links para reset de contraseña

`scheme: "acme"` + `expo-linking`. El mail de recuperación lleva **un** link
`https://acme.app/reset-password/<token>`; la web lo sirve, y con
`associatedDomains` (iOS) / `intentFilters` (Android) en `app.config.ts` el
sistema abre la app si está instalada (Universal / App Links). Los archivos
`apple-app-site-association` y `assetlinks.json` se generan en
`apps/web/public/.well-known/` con placeholders.

---

## 5d. Supabase Edge Functions (opcional, solo con DB = Supabase)

Cuando el usuario elige Supabase, la pregunta 7d ofrece mover parte del
backend a **Edge Functions** (Deno, desplegadas en la red de Supabase). Es
útil si la web se va a hostear estático o si el móvil necesita un backend
sin depender de un server Next.

### 5d.1 Qué cambia

| Aspecto | `edgeFunctions = false` (default) | `edgeFunctions = true` |
|---|---|---|
| Backend de auth | Route handlers de Next llaman a Supabase Auth con `@supabase/ssr`. | Supabase Auth directo desde cliente (`signUp`, `signInWithPassword`, `resetPasswordForEmail`) + Edge Functions para lógica custom (webhooks, jobs, `on-user-created`). |
| `packages/core` | Se importa desde Next (Node). | Se importa **también** desde Deno. El hexágono queda isomorfo: sin `process.env`, sin `node:*`; el container recibe el `SupabaseClient` por parámetro. |
| Puertos DB | Drizzle sobre `DATABASE_URL`. | `SupabaseUserRepository` etc. sobre `supabase-js` (Postgres via PostgREST) — Drizzle no corre en Deno edge. |
| Móvil | Pega a `/api/*` de Next. | Pega a `https://<ref>.supabase.co/functions/v1/*` y a Supabase Auth. |

### 5d.2 Estructura generada

```
supabase/
├── config.toml
├── migrations/               # generadas desde drizzle-kit o SQL a mano
├── seed.sql
└── functions/
    ├── _shared/
    │   ├── container.ts      # composition root Deno: importa @acme/core via import map
    │   ├── cors.ts
    │   └── supabase.ts       # createClient con SERVICE_ROLE (server) / anon + JWT del user
    ├── on-user-created/      # Database Webhook → crea profile, manda mail de bienvenida
    │   └── index.ts
    ├── me/index.ts           # ejemplo autenticado: valida JWT, llama GetCurrentUserUseCase
    └── deno.json             # import map: "@acme/core": "../../packages/core/src/index.ts"
```

### 5d.3 Dependencias y scripts

- `supabase` CLI como devDependency en raíz (`supabase start` levanta Postgres
  + Auth + Studio + Functions local en Docker; reemplaza al `docker-compose.yml`).
- Scripts raíz: `db:start`, `db:stop`, `db:reset`, `db:migrate`,
  `functions:serve`, `functions:deploy`, `types:gen` (`supabase gen types
  typescript --local > packages/shared/src/supabase.types.ts`).
- Env: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (público, también
  `EXPO_PUBLIC_SUPABASE_*` / `NEXT_PUBLIC_SUPABASE_*`), `SUPABASE_SERVICE_ROLE_KEY`
  (solo funciones/server).
- Auth de Supabase: el CLI configura en `config.toml` el `site_url` y
  `additional_redirect_urls` con `acme://reset-password` y
  `http://localhost:3000/reset-password` para que los mails de reset abran
  bien en ambas plataformas.

### 5d.4 Tests

- Integration: los casos de uso siguen testeándose con in-memory (nada
  cambia — es el punto del hexágono).
- Edge: `deno test` en `supabase/functions/**/*.test.ts` con el client
  apuntando a `supabase start` local. Job separado en CI (`deno` + `supabase`
  CLI como acciones).
- E2E: Playwright igual; `InMemoryMailer` se reemplaza por **Inbucket**, el
  mail catcher que trae `supabase start` (`http://localhost:54324`) — el test
  lee el link de reset de ahí vía su API.

### 5d.5 Deploy

`.github/workflows/supabase.yml`: en push a `main`, `supabase db push` +
`supabase functions deploy --project-ref $SUPABASE_PROJECT_REF`. Secrets
`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`.

---

## 6. Tests generados

Principio: **cada capa se testea con el doble más barato que la prueba de
verdad.** Los generados no son ejemplos, son la suite que el proyecto ya
tiene en verde al terminar el wizard.

### 6.1 Unit — `packages/core/tests/unit/` (vitest)

- `Email.test.ts`, `Password.test.ts` — value objects, casos borde.
- `SessionToken.test.ts` — entropía, hash determinista, expiración.
- `User.test.ts` — invariantes de la entidad.

### 6.2 Integration — `packages/core/tests/integration/` (vitest, in-memory)

Un archivo por caso de uso con adaptadores in-memory + `FakePasswordHasher`
+ `FixedClock` + `InMemoryMailer`:

- `RegisterUseCase.test.ts` — crea, hashea, rechaza duplicado.
- `LoginUseCase.test.ts` — correcto, password incorrecta, email inexistente → mismo error.
- `SessionUseCases.test.ts` — crear/validar/expirar/revocar.
- `PasswordReset.test.ts` — flujo completo: request → mail capturado → reset → token usado no sirve dos veces → sesiones viejas revocadas.

Opcional (`--tests db-integration`): los mismos tests contra Postgres real
con `testcontainers` (o el `docker compose` ya levantado), cada test en
transacción con rollback. Tag `RUN_DB_TESTS=1`, separado del suite rápido.

### 6.3 API contract — `apps/web/tests/api/` (vitest + `fetch` contra dev server)

- `auth.api.test.ts` — cada route handler devuelve la forma declarada en
  `@acme/shared`; 401 en `/me` sin token; CORS preflight.

### 6.4 E2E web — `apps/web/tests/e2e/` (Playwright)

- `register.spec.ts` — registro → dashboard.
- `login.spec.ts` — login ok, password mala, logout.
- `password-reset.spec.ts` — pide reset → lee link de `InMemoryMailer` vía
  endpoint `/api/_test/mailbox` (solo existe con `NODE_ENV=test`) → cambia
  password → login con la nueva → la vieja ya no entra.
- `helpers/{registerAs,loginAs}.ts`.

`playwright.config.ts`: `fullyParallel: true` (cada test usa email único con
`Date.now()`), proyecto `desktop-chrome` + `mobile-chrome`, `webServer`
levanta `npm run dev` con `DATABASE_URL` de test.

### 6.5 E2E móvil — `apps/mobile/.maestro/` (opcional)

Maestro sobre Detox: YAML declarativo, sin build nativo custom, corre en
Expo Go / dev build. Flujos `login.yaml`, `register.yaml`.

### 6.6 CI (`.github/workflows/ci.yml`)

```
lint → typecheck → unit+integration → build web → e2e web (Postgres como service container) → [e2e móvil manual]
```

Cache de `node_modules` por lockfile; Playwright con `--reporter=github`.

---

## 7. Arquitectura interna del CLI

```
forja/
├── src/
│   ├── cli.ts                  # commander: init | add | doctor | upgrade
│   ├── prompts/wizard.ts       # clack; devuelve ForjaConfig validado
│   ├── config/schema.ts        # zod ForjaConfig + reglas cruzadas
│   ├── engine/
│   │   ├── planner.ts          # ForjaConfig → lista de Recipes a aplicar, en orden
│   │   ├── renderer.ts         # copia + ejs + prettier; escribe en memoria (memfs) y al final al disco
│   │   ├── merge.ts            # merges declarativos: package.json (deps/scripts), tsconfig paths, .env.example
│   │   └── postinstall.ts      # git init, install, docker up, db push
│   └── recipes/
│       ├── base/               # raíz del monorepo
│       ├── shared/
│       ├── core-hexagonal/ core-clean/ core-simple/
│       ├── web/ mobile/
│       ├── db-postgres-docker/ db-supabase/ db-none/
│       ├── auth-sessions/ auth-supabase/ auth-none/
│       ├── mailer-console/ mailer-resend/ mailer-smtp/
│       ├── design-tailwind/ design-none/ ui-own/ ui-shadcn/
│       ├── mobile-eas/ supabase-edge-functions/
│       ├── tests-unit/ tests-integration/ tests-e2e-web/ tests-e2e-mobile/
│       └── extras-lint/ extras-husky/ extras-ci/ extras-docker/ extras-i18n/ …
└── templates/<recipe>/…        # espejo de la salida; *.ejs se procesa, el resto se copia
```

### 7.1 Recipes

Una *recipe* = carpeta de templates + `recipe.ts`:

```ts
export default defineRecipe({
  id: "auth-sessions",
  requires: ["core-*", "shared"],          // orden de aplicación
  conflictsWith: ["auth-supabase", "auth-none"],
  apply(ctx) {
    ctx.copy("templates/auth-sessions", { to: "." });
    ctx.mergePackageJson("packages/core", { dependencies: { bcryptjs: "^3" } });
    ctx.addEnv("SESSION_TTL_DAYS", "30", "Cuánto vive una sesión sin tocarla.");
    if (ctx.has("web")) ctx.copy("templates/auth-sessions/web", { to: "apps/web" });
    if (ctx.has("mobile")) ctx.copy("templates/auth-sessions/mobile", { to: "apps/mobile" });
  },
});
```

Ventajas: cada opción del wizard es un módulo aislado y testeable; agregar
"Prisma" o "NestJS" mañana es una recipe nueva, no un `if` más en un
template gigante.

### 7.2 Escritura en memoria primero

Todo se renderiza en `memfs`; solo si ninguna recipe falló se vuelca al
disco. Nunca queda un proyecto a medio generar. `--dry-run` imprime el árbol
de memfs.

### 7.3 Merges declarativos

`package.json`, `tsconfig.json` paths, `.env.example`, `.gitignore` y
`README.md` son *puntos de contención* entre recipes. Se manejan con
merges estructurados (no con ejs) para que el orden de aplicación no importe
y no queden claves duplicadas. `.env.example` se genera desde una lista de
`{ key, default, comment }` acumulada por las recipes.

---

## 8. Comandos post-creación

El valor a largo plazo está acá. Todos leen `forja.config.json`.

### `forja add usecase <Contexto>/<Nombre>`

```
forja add usecase billing/CreateInvoice
```

Genera, respetando la arquitectura elegida:

- `application/billing/CreateInvoiceUseCase.ts` con constructor por puertos.
- `tests/integration/CreateInvoiceUseCase.test.ts` con el `describe` armado.
- Lo registra en `container.ts` (edición por AST con `ts-morph`, no regex).

### `forja add port <Nombre> --adapters drizzle,in-memory`

Genera la interfaz + N adaptadores + el `InMemory` con `Map` y `reset()` para
tests.

### `forja add entity <Nombre>` / `forja add value-object <Nombre>`

Entidad con `create()`/`fromPersistence()` + test unitario; agrega tabla
placeholder en `schema.ts`.

### `forja add screen <ruta> --platforms web,mobile`

Página Next + pantalla Expo + test e2e esqueleto con el mismo nombre.

### `forja add api <ruta> --method POST`

Route handler + tipo en `@acme/shared` + test de contrato.

### `forja add mobile` / `forja add web`

Agrega la plataforma a un proyecto que nació con una sola. Reutiliza las
mismas recipes que `init`.

### `forja add recipe <id>`

Cualquier recipe opcional después del hecho: `i18n`, `trigger`, `ai`,
`storybook`, `upstash-ratelimit`, `sentry`.

### `forja doctor`

Chequea: Node/pm versión, Docker corriendo, `DATABASE_URL` alcanzable,
`.env.local` vs `.env.example` (claves faltantes), versiones de React
alineadas entre web y móvil, `packages/core` sin imports de `next`/`react`
(regla de dependencia del hexágono — se implementa con `dependency-cruiser`
y también corre en CI).

### `forja upgrade`

Muestra el diff entre los templates de la versión instalada y la actual para
archivos que el usuario **no tocó** (hash guardado en `.forja/manifest.json`)
y ofrece aplicarlos.

---

## 9. Variables de entorno generadas

Solo las que aplican. Ejemplo con `postgres-docker + sessions + console`:

```bash
# --- base de datos (postgres-docker) ---
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/acme_app"

# --- auth (sessions) ---
SESSION_TTL_DAYS=30
# Orígenes de navegador que pueden pegarle a /api (Expo web). Vacío en dev = puertos de Expo.
ALLOWED_ORIGINS=

# --- mailer (console) ---
# Nada: los mails se imprimen en la consola del servidor.
APP_URL="http://localhost:3000"   # base de los links de recuperación

# --- apps/mobile ---
# Vacío = se deduce del host de Metro (misma máquina).
EXPO_PUBLIC_API_URL=
```

Con `supabase`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
(server-only), `DATABASE_URL` con el pooler en 6543 y comentario sobre
`prepare: false`. Con `resend`: `RESEND_API_KEY`, `MAIL_FROM`.

`env.ts` generado valida con zod al arrancar y falla con mensaje claro si
falta algo obligatorio para el modo elegido.

---

## 10. Decisiones de seguridad fijas (no se preguntan)

- Contraseñas con bcrypt cost 12 (`argon2id` como recipe opcional; bcrypt se
  queda por defecto porque no necesita binario nativo y funciona en cualquier
  host).
- Política mínima: 8 caracteres, sin máximo bajo (permitir 128), sin reglas
  de "mayúscula + símbolo" que solo bajan la entropía real. Se chequea contra
  la lista de las 10k más comunes (archivo embebido).
- Tokens de sesión y de reset: 32 bytes de `crypto.getRandomValues`, solo el
  SHA-256 en base. Reset expira en 1 h, es de un solo uso, y usarlo revoca
  todas las sesiones.
- Login y forgot-password devuelven el mismo mensaje/tiempo para email
  existente e inexistente (comparación de hash contra un hash dummy cuando el
  usuario no existe, para no filtrar por timing).
- Cookie `httpOnly` + `secure` (prod) + `sameSite=lax`. Nunca el userId crudo.
- CORS sin comodín y sin `Allow-Credentials`; clientes cross-origin usan Bearer.
- Rate limit en los tres endpoints sensibles desde el día 1 (in-memory).
- `packages/core` no puede importar `next`, `react`, `expo` — lint rule + CI.

---

## 11. Lecciones de este repo que el CLI corrige de fábrica

Observadas al revisar `lingua-ai`; son cosas que un scaffold debería
resolver para que nadie las repita.

| Problema en este repo | Qué hace el CLI |
|---|---|
| `LoginUseCase` registra al pasar si el email no existe ("register-or-login") — imposible distinguir typo de cuenta nueva, y el reset de password no existía. | Register y Login separados; reset completo. |
| `packages/core/package.json` declara `main: ./src/index.ts` pero el archivo no existe; los consumidores importan rutas profundas. | Genera `index.ts` barrel y `exports` map. |
| React `19.2.8` en web vs `19.2.3` en móvil; Tailwind v4 en web vs v3 en móvil (NativeWind). | Pin único de React en la raíz via `overrides`; Tailwind v3 en móvil es inevitable por NativeWind — se documenta en `docs/architecture.md`. |
| `allowedDevOrigins: ["192.168.2.169"]` hardcodeado en `next.config.ts`. | Lee `DEV_LAN_IP` de env; `forja doctor` sugiere el valor detectado. |
| `playwright.config.ts` con `fullyParallel: false` porque el backend in-memory se comparte. | Tests aislados por email único → paralelo. |
| `middleware.ts` solo chequea existencia de cookie; el comentario lo aclara pero es fácil pasarlo por alto. | Mismo diseño (es correcto para Edge), pero el `docs/architecture.md` generado tiene sección "Dónde se valida la sesión de verdad". |
| Carpetas `logs/` sueltas en raíz, `apps/web`, `packages/core`. | Un solo `logs/` en raíz, en `.gitignore`, ruta desde `LOG_DIR`. |
| `README.md` es el de `create-next-app`. | README generado con los comandos reales, la arquitectura elegida y "primeros 5 minutos". |
| `.env.example` mezcla variables de features que pueden no estar (Trigger, OpenAI). | Solo las de las recipes aplicadas; cada recipe agrega las suyas. |
| `DEMO_USER_FALLBACK` salta el login en dev. | No existe. Para dev hay `npm run seed` que crea `dev@local` / `password` y lo imprime. |
| Hexes de la paleta duplicados a mano entre `globals.css` (`@theme`) y `tokens.ts`. | Codegen `design:build` desde `tokens.ts` → CSS y JS generados. |
| `app.json` estático, sin perfiles, sin `eas.json`, sin `updates`/`runtimeVersion`. | `app.config.ts` por perfil + `eas.json` dev/preview/production + CI de EAS. |

---

## 12. Roadmap

**v0.1 — MVP (lo que vale la pena construir primero)**

- `forja init` con wizard + flags + config.
- Recipes: base, shared, core-hexagonal, web, mobile, db-postgres-docker,
  db-none, auth-sessions, mailer-console, design-tailwind (tokens + codegen),
  ui-own, mobile-eas, tests-unit/integration/e2e-web, extras-lint/ci/docker.
- Snapshot tests del CLI para las 4 combinaciones principales
  (web / mobile / ambas × hexagonal) y un smoke test que genera, instala y
  corre `npm test` + `npm run test:e2e` en CI del propio CLI.

**v0.2**

- `core-clean`, `core-simple`, `db-supabase`, `auth-supabase`, `mailer-resend`,
  `ui-shadcn`, `supabase-edge-functions`.
- `forja add usecase|port|entity|screen|api`.
- `forja doctor`.

**v0.3**

- `mailer-smtp`, `tests-e2e-mobile` (Maestro), `extras-i18n`, `extras-husky`.
- `forja upgrade` con manifest de hashes.
- Recipes de terceros: `forja add recipe github:usuario/forja-recipe-x`.

**Después**

- Backend separado (Fastify/Nest) como plataforma `api`.
- Recipe `ai` (OpenAI/Claude client + puerto `ILlm` + mock).
- Recipe `trigger` (jobs) y `outbox` (eventos de dominio → cola).
- Multi-tenant (organizaciones + membresías) como recipe sobre auth.

---

## 13. Criterio de "terminado" para el proyecto generado

Un `forja init` con todo por defecto se considera correcto si, sin tocar un
archivo:

1. `npm run typecheck && npm run lint` → verde.
2. `npm test` → verde (unit + integration).
3. `docker compose up -d && npm run db:push && npm run test:e2e` → verde,
   incluyendo el flujo completo de recuperación de contraseña.
4. `npm run mobile` abre Expo y el login contra `localhost:3000` funciona en
   el simulador sin configurar la IP a mano.
5. `packages/core` no importa nada de `next`/`react`/`expo` (regla de
   `dependency-cruiser` en verde).
6. `npm run design:build` deja web y móvil con los mismos tokens; cambiar un
   hex en `tokens.ts` se ve en las dos apps sin tocar CSS ni `tailwind.config`.
7. Con `eas = true`: `eas build --profile development --platform ios` termina
   en verde desde un repo recién generado (solo falta `eas login`).
8. Con `edgeFunctions = true`: `supabase start && supabase functions serve` +
   `deno test` en verde.
