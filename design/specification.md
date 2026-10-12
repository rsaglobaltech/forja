# `forja` — scaffolding CLI for web + mobile monorepos with DDD / Hexagonal

> **Note:** this is the original design document for forja. It describes the full vision; what 1.0 actually implements is tracked in [`ROADMAP.md`](../../ROADMAP.md).

> Design specification. It comes from distilling what already works in the
> `lingua-ai` repo into a reusable generator: npm workspaces monorepo, Next.js
> in `apps/web`, Expo in `apps/mobile`, a server-only hexagon in
> `packages/core`, an isomorphic HTTP contract in `packages/shared`, sessions
> with a hashed token, tests at three levels.
>
> Working name: **forja** (`npx forja`). Change it as you see fit.

---

## 0. One-screen summary

```
$ npx forja

  ┌  forja · new project
  │
  ◇  Project name
  │  acme-app
  │
  ◇  Which platforms?
  │  ● Web (Next.js)   ● Mobile (Expo)
  │
  ◇  Backend architecture
  │  ○ Simple   ○ Clean   ● Hexagonal (DDD)
  │
  ◇  Database
  │  ● Local PostgreSQL (Docker)   ○ Supabase   ○ None (in-memory)
  │
  ◇  Authentication
  │  ● Own sessions (token + cookie/Bearer)   ○ Supabase Auth   ○ None
  │
  ◇  Email delivery (password recovery)
  │  ● Console (dev)   ○ Resend   ○ SMTP (nodemailer)
  │
  ◇  Design system
  │  ● Tailwind (web) + NativeWind (mobile), shared tokens   ○ No styles
  │
  ◇  UI components
  │  ● Own (generated)   ○ shadcn/ui (web) + React Native Reusables (mobile)
  │
  ◇  Backend on Supabase Edge Functions (Deno)      ← only if DB = Supabase
  │  ○ No, everything in Next   ● Yes, auth + jobs in Edge Functions
  │
  ◇  Mobile builds with EAS (Expo Application Services)
  │  ● Yes: eas.json + dev/preview/production profiles   ○ Expo Go only
  │
  ◇  Tests
  │  ● Unit (vitest)  ● Integration (vitest)  ● Web E2E (Playwright)  ○ Mobile E2E (Maestro)
  │
  ◇  Extras
  │  ● ESLint+Prettier  ● Husky+lint-staged  ● GitHub Actions  ● Docker Compose
  │  ○ i18n  ○ Trigger.dev (jobs)  ○ AI client (OpenAI/Claude)  ○ Storybook
  │
  ◇  Package manager
  │  ● npm   ○ pnpm   ○ bun
  │
  └  Generating acme-app… ✔  (28 s)

  Next steps:
    cd acme-app
    docker compose up -d
    npm run db:push
    npm run dev          # http://localhost:3000/login
    npm run mobile       # Expo
    npm test             # unit + integration
    npm run test:e2e     # Playwright
```

Everything the wizard asks can be passed through flags or through a
`forja.config.json` (`npx forja --config forja.config.json --yes`) for CI and
for regenerating identical projects.

---

## 1. Goals and non-goals

**Goals**

1. A new project starts in < 1 minute with login, registration and password
   recovery **working and tested** end-to-end, not just empty folders.
2. The generated code is what a thoughtful person would write: comments that
   explain the *why*, no empty layers "just in case".
3. Every wizard decision changes real code, not just a `README`.
4. The CLI stays useful after day 1: `forja add <thing>` generates use cases,
   ports, adapters, screens and their tests following the same convention.

**Non-goals**

- It is not a framework. The generated project does not depend on `forja` at
  runtime.
- It does not abstract Next/Expo/Drizzle behind an API of its own. It
  generates idiomatic code for each tool.
- It does not cover a separate backend (NestJS, Fastify) in v1. The API lives
  in Next's route handlers, as in the `lingua-ai` repo. Left as a future
  *recipe*.

---

## 2. The CLI's own stack

| Piece | Choice | Why |
|---|---|---|
| Runtime | Node ≥ 22, TypeScript, ESM | Same runtime as the generated projects. |
| Prompts | `@clack/prompts` | Good-looking, cancellable, groups questions, supports `multiselect`. |
| Args/flags | `commander` | Subcommands (`init`, `add`, `doctor`), `--yes`, `--config`. |
| Templates | `.ejs` files + verbatim copy | Conditional logic where needed (`<% if (auth === "sessions") %>`), plain copy for the rest. Avoid Handlebars: it does not allow JS in the template and ends up in ad-hoc helpers. |
| Process execution | `execa` | `npm install`, `git init`, `docker compose up`. |
| Final formatting | `prettier` (programmatic API) | Templates can come out ugly after conditionals; everything is formatted at the end. |
| Config validation | `zod` | Same schema for the wizard, flags and `forja.config.json`. |
| CLI tests | `vitest` + tree snapshots | Each combination of answers → expected file tree. |

Packaging: `npm publish` as `forja` with `bin`. Used via `npx forja` or
`npm create forja@latest` (create a `create-forja` alias).

---

## 3. Question flow (wizard)

Order and dependencies. Each question is skipped if it already comes from a flag/config.

| # | Question | Type | Default | Depends on |
|---|---|---|---|---|
| 1 | Project name | text, validated `^[a-z][a-z0-9-]*$` | `my-app` | — |
| 2 | Internal package scope (`@acme/*`) | text | `@<name>` | 1 |
| 3 | Platforms | multiselect: `web`, `mobile` | both | — |
| 4 | Architecture | select: `simple`, `clean`, `hexagonal` | `hexagonal` | — |
| 5 | Database | select: `postgres-docker`, `supabase`, `none` | `postgres-docker` | — |
| 6 | Authentication | select: `sessions`, `supabase-auth`, `none` | `sessions` (or `supabase-auth` if DB = supabase) | 5 |
| 7 | Mailer | select: `console`, `resend`, `smtp` | `console` | 6 ≠ none |
| 7b | Design system | select: `tailwind`, `none` | `tailwind` | — |
| 7c | UI components | select: `own`, `shadcn` | `own` | 7b = tailwind |
| 7d | Edge Functions (Deno) | confirm | no | 5 = supabase |
| 7e | EAS (builds/updates) | confirm | yes | 3 ∋ mobile |
| 8 | Tests | multiselect: `unit`, `integration`, `e2e-web`, `e2e-mobile` | unit+integration+e2e-web | 3 |
| 9 | Extras | multiselect | lint, husky, ci, docker | — |
| 10 | Package manager | select: `npm`, `pnpm`, `bun` | detected from `npm_config_user_agent` | — |
| 11 | Initialize git and make a first commit? | confirm | yes | — |
| 12 | Install dependencies now? | confirm | yes | — |

Cross-field rules (validated with zod and shown as a clear error):

- `auth = sessions` requires `db ≠ none` **or** falls back to in-memory
  repositories with a warning ("sessions do not survive a restart").
- `auth = supabase-auth` requires `db = supabase`.
- `e2e-mobile` requires `mobile`.
- `architecture = simple` + `db = none` → minimal project, no `packages/core`.
- `edge-functions` requires `db = supabase` and `auth = supabase-auth`.
- `ui = shadcn` requires `design = tailwind`.
- `eas` requires `mobile`; without EAS neither `eas.json` nor the build workflow is generated.

### 3.1 Equivalent flags

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

`--dry-run` prints the tree it would generate without writing anything.

### 3.2 `forja.config.json`

Written at the root of the generated project. It is the "memory" of the
decisions: `forja add` reads it to know which architecture and which scope to use.

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

## 4. Generated structure

### 4.1 Common base (any combination)

```
acme-app/
├── package.json              # workspaces: apps/*, packages/*; aggregated scripts
├── tsconfig.base.json
├── .env.example              # ONLY the variables that apply to what was chosen
├── .gitignore
├── .editorconfig
├── forja.config.json
├── README.md                 # generated with the project's real steps
├── docs/
│   └── architecture.md       # explains the chosen architecture with examples from the repo itself
├── apps/
│   ├── web/                  # if platforms ∋ web
│   └── mobile/               # if platforms ∋ mobile
└── packages/
    ├── shared/               # always: isomorphic types, HTTP contract, design tokens
    └── core/                 # if arch ≠ simple
```

### 4.2 `packages/core` by architecture

**`hexagonal`** (what the `lingua-ai` repo has, polished):

```
packages/core/src/
├── index.ts                        # public barrel (lingua-ai does NOT have it yet declares it in package.json — a bug to avoid)
├── domain/
│   ├── entities/User.ts
│   ├── value-objects/Email.ts
│   ├── value-objects/Password.ts   # policy: minimum length, etc.
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
│   ├── IClock.ts                    # injectable dates → deterministic tests
│   └── ILogger.ts
└── infrastructure/
    ├── config/{env,container}.ts    # composition root, independent per-env-var switches
    ├── database/
    │   ├── db.ts                    # lazy connection (does not blow up without DATABASE_URL)
    │   ├── schema.ts
    │   └── repositories/{Drizzle,InMemory}{User,Session,PasswordResetToken}Repository.ts
    ├── security/BcryptPasswordHasher.ts
    ├── mail/{ConsoleMailer,ResendMailer,SmtpMailer}.ts
    └── logging/ConsoleLogger.ts
```

**`clean`**: same layers but named `entities/`, `use-cases/`,
`interface-adapters/`, `frameworks/`; ports live next to the use case that
defines them (`use-cases/auth/ports.ts`) instead of in a global folder. A
deliberately small difference: the choice is about the team's vocabulary,
not about topology.

**`simple`**: no `packages/core`. Logic in `apps/web/src/server/auth/*.ts`
(plain functions), Drizzle directly, no ports and no in-memory. For throwaway
MVPs or weekend prototypes.

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
│   │   ├── layout.tsx               # AppShell with the session resolved
│   │   └── dashboard/page.tsx       # authenticated placeholder
│   ├── api/
│   │   ├── _lib/session.ts          # bearer ∨ cookie → userId
│   │   └── auth/{register,login,logout,me,forgot-password,reset-password}/route.ts
│   ├── layout.tsx
│   └── globals.css
├── src/app/actions/auth.actions.ts   # Server Actions: same use cases as the API
├── components/ui/{Button,Input,FormField,Toast}.tsx
├── middleware.ts                     # CORS for /api + redirect to /login if there is no cookie
├── tests/e2e/                        # Playwright
├── next.config.ts                    # turbopack.root = monorepo root; transpilePackages
└── playwright.config.ts
```

### 4.4 `apps/mobile` (Expo Router)

```
apps/mobile/
├── app/
│   ├── _layout.tsx                   # AuthProvider + SessionGate
│   ├── (auth)/{login,register,forgot-password}.tsx
│   └── (app)/index.tsx
├── lib/api.ts                        # client typed against @acme/shared
├── lib/auth.tsx                      # token in SecureStore (localStorage on web, with a warning)
├── components/ui/…
└── .maestro/                         # if e2e-mobile
```

### 4.5 `packages/shared`

```
packages/shared/src/
├── index.ts
├── api/auth.ts       # LoginRequest/Response, RegisterRequest, ForgotPasswordRequest, ResetPasswordRequest, MeResponse, ApiError
├── validation/auth.ts# shared zod schemas: web, mobile and API validate the same way
└── tokens.ts         # shared palette/typography (NativeWind + Tailwind)
```

---

## 5. Generated authentication module

This is the heart of the CLI: every project starts with this complete flow.

### 5.1 Use cases

| Use case | Input | Output | Rules |
|---|---|---|---|
| `RegisterUseCase` | email, password | `{ userId }` | Unique email (error `EmailAlreadyInUse`), password meets the policy, hashed before saving, emits `UserRegistered`. Does **not** log in implicitly: the adapter chains `CreateSession`. |
| `LoginUseCase` | email, password | `{ userId }` | `InvalidCredentials` both when the email does not exist and when the password is wrong (do not reveal which). Never "registers on the fly" — the `lingua-ai` repo does and it is a trap. |
| `CreateSessionUseCase` | userId | `{ token, expiresAt }` | 32-byte random token, SHA-256 is stored, 30-day TTL. |
| `ValidateSessionUseCase` | token | `userId \| null` | Never throws; deletes expired sessions along the way. |
| `RevokeSessionUseCase` | token | void | Idempotent. |
| `RequestPasswordResetUseCase` | email | void | **Always** responds OK even if the email does not exist (anti-enumeration). Generates a random token, stores hash + 1 h expiry + `usedAt`, sends an email with a `/reset-password/<token>` link. Invalidates the user's previous tokens. |
| `ResetPasswordUseCase` | token, newPassword | void | Token exists, is not expired, is not used; updates the hash, marks the token as used, **revokes all of the user's sessions**. |

### 5.2 Ports and adapters

| Port | Real | Test / dev |
|---|---|---|
| `IUserRepository` | `DrizzleUserRepository` | `InMemoryUserRepository` |
| `ISessionRepository` | `DrizzleSessionRepository` | `InMemorySessionRepository` |
| `IPasswordResetTokenRepository` | `DrizzlePasswordResetTokenRepository` | `InMemoryPasswordResetTokenRepository` |
| `IPasswordHasher` | `BcryptPasswordHasher` (cost 12) | `FakePasswordHasher` (`hashed:<plain>`) |
| `IMailer` | `ResendMailer` / `SmtpMailer` | `ConsoleMailer` (prints the link) / `InMemoryMailer` (keeps the emails → the e2e tests read the token from there) |
| `IClock` | `SystemClock` | `FixedClock` |

`container.ts` picks each adapter through **independent switches** that read
env (`hasDatabase()`, `hasMailer()`), never a global `isDemo` flag. Lesson
from the `lingua-ai` repo: coupling switches breaks incremental adoption of
infrastructure.

### 5.3 Drizzle schema

```ts
users                  (id uuid pk, email text unique, password_hash text not null, created_at, updated_at)
sessions               (token_hash text pk, user_id fk cascade, expires_at, created_at)
password_reset_tokens  (token_hash text pk, user_id fk cascade, expires_at, used_at nullable, created_at)
```

With Supabase Auth, `sessions` and `password_reset_tokens` are omitted: the
`users` table becomes `profiles (id uuid pk references auth.users)` and the
session use cases are replaced by a `SupabaseAuthGateway` adapter behind the
`IAuthGateway` port. The screens and tests stay the same.

### 5.4 Transport

- **Web**: Server Actions (`auth.actions.ts`) for the app's own screens +
  `/api/auth/*` route handlers for mobile. Both call the same
  `container.*UseCase`. `session` cookie: `httpOnly`, `secure` in prod,
  `sameSite: "lax"`, `path: "/"`.
- **Mobile**: `Authorization: Bearer <token>`; token in `expo-secure-store`.
- `middleware.ts` only checks whether the cookie **exists** (Edge, no DB
  driver); the real validation happens in `getCurrentUserId()` /
  `resolveUserId()`. The generated comment makes this explicit so nobody
  mistakes it for access control.
- Rate limiting on `login`, `register`, `forgot-password`: an
  `InMemoryRateLimiter` adapter (per IP + email, sliding window) behind
  `IRateLimiter`; optional recipe for Upstash.

### 5.5 Screens

Web (Tailwind v4, own components, no UI library so as not to get locked into
one):

- `/login` — email + password, links to registration and to "forgot my password".
- `/register` — email + password + confirmation; shows the policy.
- `/forgot-password` — email; always shows "if it exists, we have sent you an email".
- `/reset-password/[token]` — new password; invalid token → message + link to request another one.
- `/dashboard` — placeholder with "Hello, {email}" and a "Sign out" button.

Mobile (NativeWind): the same four auth screens + an authenticated `index`.
On mobile, `reset-password` opens through a deep link
(`acme://reset-password/<token>`) configured in `app.json` → `scheme`.

---

## 5b. Design system: Tailwind (web) + NativeWind (mobile)

Goal: **a single tokens file**, two styling engines. Web and mobile render
exactly the same colors/spacing without copying hex values by hand.

### 5b.1 Dependencies installed by the `design-tailwind` recipe

| Workspace | Package | Version | Note |
|---|---|---|---|
| `apps/web` | `tailwindcss` | `^4` | v4 engine, config in CSS (`@theme`). |
| `apps/web` | `@tailwindcss/postcss` | `^4` | The only PostCSS plugin. |
| `apps/web` | `next-themes` | `^0.4` | Light/dark toggle; `@custom-variant dark` on `.dark`. |
| `apps/web` | `clsx`, `tailwind-merge` | latest | Generated `cn()` helper. |
| `apps/mobile` | `nativewind` | `^4.2` | Tailwind on React Native. |
| `apps/mobile` | `tailwindcss` | `^3.4` | **v3 is mandatory**: NativeWind 4 does not support Tailwind v4. It is the only accepted web/mobile mismatch and it is documented. |
| `apps/mobile` | `react-native-reanimated`, `react-native-worklets` | pinned by the Expo SDK | NativeWind uses them for transitions; the worklets plugin goes **last** in `babel.config.js`. |
| `apps/mobile` | `react-native-safe-area-context` | pinned | `SafeAreaProvider` in `_layout.tsx`. |
| `packages/shared` | — | — | `tokens.ts` with no dependencies. |

### 5b.2 Shared tokens and codegen

```
packages/shared/src/design/
├── tokens.ts          # SOURCE OF TRUTH: palette, spacing, radius, fontSizes, fontFamily
└── semantic.ts        # { light: { app, surface, text, … }, dark: { … } } on top of palette
```

A real problem in the `lingua-ai` repo: `globals.css` (web, `@theme` in CSS)
cannot import TypeScript, so the hex values are duplicated by hand. The CLI
solves it with codegen:

```
npm run design:build
  → packages/shared/src/design/tokens.ts
      ├─→ apps/web/app/theme.generated.css       (@theme { --color-brand-500: #4cc13b; … })
      └─→ apps/mobile/tailwind.generated.js      (module.exports = { theme: { extend: { colors: … } } })
```

- Script `packages/shared/scripts/build-tokens.ts` (tsx, ~60 lines).
- Runs on `postinstall` and `predev`; the generated files go in
  `.gitignore` with a `// GENERATED — do not edit` header.
- `globals.css` does `@import "./theme.generated.css";` and the mobile
  `tailwind.config.ts` does `presets: [require("./tailwind.generated.js")]`.
- Generated unit test: `tokens.test.ts` checks minimum WCAG AA contrast
  between `semantic.light.text` and `semantic.light.app` (and dark).

### 5b.3 Configuration generated for mobile

```js
// babel.config.js
presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
plugins: ["react-native-worklets/plugin"],   // last, rewrites Reanimated worklets

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

Fonts: the recipe installs `expo-font` + an `@expo-google-fonts/<x>` package
chosen in `tokens.ts` (`fontFamily.sans`), and on web the same family via
`next/font/google`. The generated mobile `_layout.tsx` waits for `useFonts`
before rendering (avoids FOUT), as in the `lingua-ai` repo.

### 5b.4 Components

`ui = own` (default): the recipe generates `components/ui/` in each app:
`Button`, `Input`, `FormField` (label + error + hint), `Card`, `Toast`,
`Spinner`, `Screen` (mobile: SafeArea + padding). Same names and props on
web and mobile; different implementation. Optional Storybook documents them.

`ui = shadcn`: on web it runs `npx shadcn@latest init` + `add button input
form card toast` with `components.json` pointing at `theme.generated.css`;
on mobile it installs `react-native-reusables` (a port of shadcn on top of
NativeWind). The generated auth screens use these components instead of the
own ones.

`design = none`: no Tailwind and no NativeWind. Screens with minimal
`StyleSheet` / CSS Modules. For those who already have their own system.

---

## 5c. Expo: project configuration and EAS (Expo Application Services)

"Expo cloud" = **EAS**: EAS Build (compiles iOS/Android in the cloud, no
local Xcode), EAS Submit (uploads to the App Store / Play), EAS Update (OTA
JS updates without going through the stores). The `mobile` recipe generates
the basics; `eas = true` adds the cloud part.

### 5c.1 `app.config.ts` (not `app.json`)

`app.config.ts` is generated instead of `app.json` so that it can read env
and vary by profile:

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

Distinct bundle IDs per profile → dev, preview and prod can be installed side
by side on the same phone.

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

Secrets (`EAS_PROJECT_ID`, submit credentials) do **not** go in the repo:
`eas secret:create` or EAS environment variables; `.env.example` lists
`EAS_PROJECT_ID` with a comment.

### 5c.3 Scripts added to `apps/mobile/package.json`

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

### 5c.4 Post-creation steps (the CLI runs them or prints them)

1. `npx expo install --fix` — aligns native versions with the SDK.
2. If `eas = true` and there is a session (`eas whoami`): `eas init` → writes
   `EAS_PROJECT_ID` to `.env.local`. If there is no session, it prints
   `npx eas login && npx eas init` as the next step.
3. `npx expo-doctor` — integrated into `forja doctor`.

### 5c.5 Dev build vs Expo Go

`expo-secure-store`, Reanimated and NativeWind work in Expo Go, but any extra
native module (push notifications, custom camera, Sentry) requires a
**development build** (`build:dev`). The generated README explains when to
move from Expo Go to the dev client, and `forja add recipe <x>` warns if the
recipe adds a native module.

### 5c.6 CI workflow `.github/workflows/mobile.yml`

```
on: push to main (paths: apps/mobile/**, packages/shared/**)
jobs:
  preview:  eas build --profile preview --non-interactive --no-wait
  update:   eas update --channel preview --auto   # OTA if only JS changed
```

Requires an `EXPO_TOKEN` secret in GitHub. Uses `expo/expo-github-action`.
Production is triggered manually (`workflow_dispatch`) so as not to build on
every merge.

### 5c.7 Deep links for password reset

`scheme: "acme"` + `expo-linking`. The recovery email carries **one** link,
`https://acme.app/reset-password/<token>`; the web serves it, and with
`associatedDomains` (iOS) / `intentFilters` (Android) in `app.config.ts` the
OS opens the app if it is installed (Universal / App Links). The
`apple-app-site-association` and `assetlinks.json` files are generated in
`apps/web/public/.well-known/` with placeholders.

---

## 5d. Supabase Edge Functions (optional, only with DB = Supabase)

When the user chooses Supabase, question 7d offers to move part of the
backend to **Edge Functions** (Deno, deployed on Supabase's network). This is
useful if the web app will be hosted as static files or if mobile needs a
backend that does not depend on a Next server.

### 5d.1 What changes

| Aspect | `edgeFunctions = false` (default) | `edgeFunctions = true` |
|---|---|---|
| Auth backend | Next route handlers call Supabase Auth with `@supabase/ssr`. | Supabase Auth directly from the client (`signUp`, `signInWithPassword`, `resetPasswordForEmail`) + Edge Functions for custom logic (webhooks, jobs, `on-user-created`). |
| `packages/core` | Imported from Next (Node). | Imported from Deno **as well**. The hexagon stays isomorphic: no `process.env`, no `node:*`; the container receives the `SupabaseClient` as a parameter. |
| DB ports | Drizzle over `DATABASE_URL`. | `SupabaseUserRepository` etc. over `supabase-js` (Postgres via PostgREST) — Drizzle does not run on Deno edge. |
| Mobile | Calls Next's `/api/*`. | Calls `https://<ref>.supabase.co/functions/v1/*` and Supabase Auth. |

### 5d.2 Generated structure

```
supabase/
├── config.toml
├── migrations/               # generated from drizzle-kit or hand-written SQL
├── seed.sql
└── functions/
    ├── _shared/
    │   ├── container.ts      # Deno composition root: imports @acme/core via import map
    │   ├── cors.ts
    │   └── supabase.ts       # createClient with SERVICE_ROLE (server) / anon + the user's JWT
    ├── on-user-created/      # Database Webhook → creates the profile, sends a welcome email
    │   └── index.ts
    ├── me/index.ts           # authenticated example: validates the JWT, calls GetCurrentUserUseCase
    └── deno.json             # import map: "@acme/core": "../../packages/core/src/index.ts"
```

### 5d.3 Dependencies and scripts

- `supabase` CLI as a devDependency at the root (`supabase start` brings up
  Postgres + Auth + Studio + Functions locally in Docker; it replaces
  `docker-compose.yml`).
- Root scripts: `db:start`, `db:stop`, `db:reset`, `db:migrate`,
  `functions:serve`, `functions:deploy`, `types:gen` (`supabase gen types
  typescript --local > packages/shared/src/supabase.types.ts`).
- Env: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (public, also
  `EXPO_PUBLIC_SUPABASE_*` / `NEXT_PUBLIC_SUPABASE_*`), `SUPABASE_SERVICE_ROLE_KEY`
  (functions/server only).
- Supabase Auth: the CLI sets `site_url` and `additional_redirect_urls` in
  `config.toml` to `acme://reset-password` and
  `http://localhost:3000/reset-password` so that reset emails open correctly
  on both platforms.

### 5d.4 Tests

- Integration: use cases are still tested with in-memory adapters (nothing
  changes — that is the point of the hexagon).
- Edge: `deno test` in `supabase/functions/**/*.test.ts` with the client
  pointing at a local `supabase start`. Separate job in CI (`deno` + `supabase`
  CLI as actions).
- E2E: Playwright as before; `InMemoryMailer` is replaced by **Inbucket**, the
  mail catcher that ships with `supabase start` (`http://localhost:54324`) —
  the test reads the reset link from there through its API.

### 5d.5 Deploy

`.github/workflows/supabase.yml`: on push to `main`, `supabase db push` +
`supabase functions deploy --project-ref $SUPABASE_PROJECT_REF`. Secrets
`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`.

---

## 6. Generated tests

Principle: **each layer is tested with the cheapest double that still proves
something real.** The generated tests are not examples; they are the suite
the project already has passing when the wizard finishes.

### 6.1 Unit — `packages/core/tests/unit/` (vitest)

- `Email.test.ts`, `Password.test.ts` — value objects, edge cases.
- `SessionToken.test.ts` — entropy, deterministic hash, expiry.
- `User.test.ts` — entity invariants.

### 6.2 Integration — `packages/core/tests/integration/` (vitest, in-memory)

One file per use case with in-memory adapters + `FakePasswordHasher`
+ `FixedClock` + `InMemoryMailer`:

- `RegisterUseCase.test.ts` — creates, hashes, rejects duplicates.
- `LoginUseCase.test.ts` — correct, wrong password, nonexistent email → same error.
- `SessionUseCases.test.ts` — create/validate/expire/revoke.
- `PasswordReset.test.ts` — full flow: request → captured email → reset → a used token does not work twice → old sessions revoked.

Optional (`--tests db-integration`): the same tests against a real Postgres
with `testcontainers` (or the `docker compose` already running), each test in
a transaction with rollback. Tagged `RUN_DB_TESTS=1`, separate from the fast suite.

### 6.3 API contract — `apps/web/tests/api/` (vitest + `fetch` against the dev server)

- `auth.api.test.ts` — each route handler returns the shape declared in
  `@acme/shared`; 401 on `/me` without a token; CORS preflight.

### 6.4 Web E2E — `apps/web/tests/e2e/` (Playwright)

- `register.spec.ts` — registration → dashboard.
- `login.spec.ts` — successful login, wrong password, logout.
- `password-reset.spec.ts` — requests a reset → reads the link from
  `InMemoryMailer` via the `/api/_test/mailbox` endpoint (only exists with
  `NODE_ENV=test`) → changes the password → logs in with the new one → the
  old one no longer works.
- `helpers/{registerAs,loginAs}.ts`.

`playwright.config.ts`: `fullyParallel: true` (each test uses a unique email
with `Date.now()`), `desktop-chrome` + `mobile-chrome` projects, `webServer`
starts `npm run dev` with the test `DATABASE_URL`.

### 6.5 Mobile E2E — `apps/mobile/.maestro/` (optional)

Maestro over Detox: declarative YAML, no custom native build, runs on Expo Go
/ a dev build. Flows `login.yaml`, `register.yaml`.

### 6.6 CI (`.github/workflows/ci.yml`)

```
lint → typecheck → unit+integration → build web → e2e web (Postgres as a service container) → [mobile e2e, manual]
```

`node_modules` cached by lockfile; Playwright with `--reporter=github`.

---

## 7. Internal architecture of the CLI

```
forja/
├── src/
│   ├── cli.ts                  # commander: init | add | doctor | upgrade
│   ├── prompts/wizard.ts       # clack; returns a validated ForjaConfig
│   ├── config/schema.ts        # zod ForjaConfig + cross-field rules
│   ├── engine/
│   │   ├── planner.ts          # ForjaConfig → list of Recipes to apply, in order
│   │   ├── renderer.ts         # copy + ejs + prettier; writes to memory (memfs) and to disk at the end
│   │   ├── merge.ts            # declarative merges: package.json (deps/scripts), tsconfig paths, .env.example
│   │   └── postinstall.ts      # git init, install, docker up, db push
│   └── recipes/
│       ├── base/               # monorepo root
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
└── templates/<recipe>/…        # mirror of the output; *.ejs is processed, the rest is copied
```

### 7.1 Recipes

A *recipe* = a templates folder + `recipe.ts`:

```ts
export default defineRecipe({
  id: "auth-sessions",
  requires: ["core-*", "shared"],          // application order
  conflictsWith: ["auth-supabase", "auth-none"],
  apply(ctx) {
    ctx.copy("templates/auth-sessions", { to: "." });
    ctx.mergePackageJson("packages/core", { dependencies: { bcryptjs: "^3" } });
    ctx.addEnv("SESSION_TTL_DAYS", "30", "How long a session lives when untouched.");
    if (ctx.has("web")) ctx.copy("templates/auth-sessions/web", { to: "apps/web" });
    if (ctx.has("mobile")) ctx.copy("templates/auth-sessions/mobile", { to: "apps/mobile" });
  },
});
```

Advantages: each wizard option is an isolated, testable module; adding
"Prisma" or "NestJS" tomorrow is a new recipe, not one more `if` in a giant
template.

### 7.2 Write to memory first

Everything is rendered into `memfs`; it is flushed to disk only if no recipe
failed. A half-generated project is never left behind. `--dry-run` prints the
memfs tree.

### 7.3 Declarative merges

`package.json`, `tsconfig.json` paths, `.env.example`, `.gitignore` and
`README.md` are *contention points* between recipes. They are handled with
structured merges (not with ejs) so that application order does not matter
and no keys end up duplicated. `.env.example` is generated from a list of
`{ key, default, comment }` accumulated by the recipes.

---

## 8. Post-creation commands

This is where the long-term value lies. They all read `forja.config.json`.

### `forja add usecase <Context>/<Name>`

```
forja add usecase billing/CreateInvoice
```

Generates, following the chosen architecture:

- `application/billing/CreateInvoiceUseCase.ts` with constructor injection of ports.
- `tests/integration/CreateInvoiceUseCase.test.ts` with the `describe` set up.
- Registers it in `container.ts` (AST editing with `ts-morph`, not regex).

### `forja add port <Name> --adapters drizzle,in-memory`

Generates the interface + N adapters + the `InMemory` one with a `Map` and
`reset()` for tests.

### `forja add entity <Name>` / `forja add value-object <Name>`

Entity with `create()`/`fromPersistence()` + a unit test; adds a placeholder
table in `schema.ts`.

### `forja add screen <route> --platforms web,mobile`

Next page + Expo screen + skeleton e2e test with the same name.

### `forja add api <route> --method POST`

Route handler + type in `@acme/shared` + contract test.

### `forja add mobile` / `forja add web`

Adds the platform to a project that started with only one. Reuses the same
recipes as `init`.

### `forja add recipe <id>`

Any optional recipe after the fact: `i18n`, `trigger`, `ai`,
`storybook`, `upstash-ratelimit`, `sentry`.

### `forja doctor`

Checks: Node/pm version, Docker running, `DATABASE_URL` reachable,
`.env.local` vs `.env.example` (missing keys), React versions aligned between
web and mobile, `packages/core` free of `next`/`react` imports (the hexagon's
dependency rule — implemented with `dependency-cruiser` and also run in CI).

### `forja upgrade`

Shows the diff between the templates of the installed version and the
current one for files the user has **not touched** (hash stored in
`.forja/manifest.json`) and offers to apply it.

---

## 9. Generated environment variables

Only the ones that apply. Example with `postgres-docker + sessions + console`:

```bash
# --- database (postgres-docker) ---
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/acme_app"

# --- auth (sessions) ---
SESSION_TTL_DAYS=30
# Browser origins allowed to call /api (Expo web). Empty in dev = Expo's ports.
ALLOWED_ORIGINS=

# --- mailer (console) ---
# Nothing: emails are printed to the server console.
APP_URL="http://localhost:3000"   # base for the recovery links

# --- apps/mobile ---
# Empty = inferred from the Metro host (same machine).
EXPO_PUBLIC_API_URL=
```

With `supabase`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
(server-only), `DATABASE_URL` with the pooler on 6543 and a comment about
`prepare: false`. With `resend`: `RESEND_API_KEY`, `MAIL_FROM`.

The generated `env.ts` validates with zod at startup and fails with a clear
message if anything required for the chosen mode is missing.

---

## 10. Fixed security decisions (not asked)

- Passwords with bcrypt cost 12 (`argon2id` as an optional recipe; bcrypt
  stays the default because it needs no native binary and works on any
  host).
- Minimum policy: 8 characters, no low maximum (allow 128), no "uppercase +
  symbol" rules that only lower real entropy. Checked against a list of the
  10k most common passwords (embedded file).
- Session and reset tokens: 32 bytes from `crypto.getRandomValues`, only the
  SHA-256 stored in the database. A reset expires in 1 h, is single-use, and
  using it revokes all sessions.
- Login and forgot-password return the same message/timing for existing and
  nonexistent emails (hash comparison against a dummy hash when the user
  does not exist, so nothing leaks through timing).
- `httpOnly` + `secure` (prod) + `sameSite=lax` cookie. Never the raw userId.
- CORS with no wildcard and no `Allow-Credentials`; cross-origin clients use Bearer.
- Rate limiting on the three sensitive endpoints from day 1 (in-memory).
- `packages/core` cannot import `next`, `react`, `expo` — lint rule + CI.

---

## 11. Lessons from the `lingua-ai` repo that the CLI fixes out of the box

Observed while reviewing `lingua-ai`; these are things a scaffold should
solve so that nobody repeats them.

| Problem in the `lingua-ai` repo | What the CLI does |
|---|---|
| `LoginUseCase` registers on the fly if the email does not exist ("register-or-login") — impossible to tell a typo from a new account, and password reset did not exist. | Separate Register and Login; complete reset. |
| `packages/core/package.json` declares `main: ./src/index.ts` but the file does not exist; consumers import deep paths. | Generates an `index.ts` barrel and an `exports` map. |
| React `19.2.8` on web vs `19.2.3` on mobile; Tailwind v4 on web vs v3 on mobile (NativeWind). | A single React pin at the root via `overrides`; Tailwind v3 on mobile is unavoidable because of NativeWind — documented in `docs/architecture.md`. |
| `allowedDevOrigins: ["192.168.2.169"]` hardcoded in `next.config.ts`. | Reads `DEV_LAN_IP` from env; `forja doctor` suggests the detected value. |
| `playwright.config.ts` with `fullyParallel: false` because the in-memory backend is shared. | Tests isolated by a unique email → parallel. |
| `middleware.ts` only checks that the cookie exists; the comment says so, but it is easy to overlook. | Same design (it is correct for Edge), but the generated `docs/architecture.md` has a section "Where the session is really validated". |
| Stray `logs/` folders at the root, in `apps/web`, in `packages/core`. | A single `logs/` at the root, in `.gitignore`, path from `LOG_DIR`. |
| `README.md` is the one from `create-next-app`. | Generated README with the real commands, the chosen architecture and "the first 5 minutes". |
| `.env.example` mixes in variables for features that may not be present (Trigger, OpenAI). | Only those of the applied recipes; each recipe adds its own. |
| `DEMO_USER_FALLBACK` skips login in dev. | Does not exist. For dev there is `npm run seed`, which creates `dev@local` / `password` and prints it. |
| Palette hex values duplicated by hand between `globals.css` (`@theme`) and `tokens.ts`. | `design:build` codegen from `tokens.ts` → generated CSS and JS. |
| Static `app.json`, no profiles, no `eas.json`, no `updates`/`runtimeVersion`. | Per-profile `app.config.ts` + dev/preview/production `eas.json` + EAS CI. |

---

## 12. Roadmap

**v0.1 — MVP (what is worth building first)**

- `forja init` with wizard + flags + config.
- Recipes: base, shared, core-hexagonal, web, mobile, db-postgres-docker,
  db-none, auth-sessions, mailer-console, design-tailwind (tokens + codegen),
  ui-own, mobile-eas, tests-unit/integration/e2e-web, extras-lint/ci/docker.
- CLI snapshot tests for the 4 main combinations
  (web / mobile / both × hexagonal) and a smoke test that generates, installs
  and runs `npm test` + `npm run test:e2e` in the CLI's own CI.

**v0.2**

- `core-clean`, `core-simple`, `db-supabase`, `auth-supabase`, `mailer-resend`,
  `ui-shadcn`, `supabase-edge-functions`.
- `forja add usecase|port|entity|screen|api`.
- `forja doctor`.

**v0.3**

- `mailer-smtp`, `tests-e2e-mobile` (Maestro), `extras-i18n`, `extras-husky`.
- `forja upgrade` with a hash manifest.
- Third-party recipes: `forja add recipe github:user/forja-recipe-x`.

**Later**

- Separate backend (Fastify/Nest) as an `api` platform.
- `ai` recipe (OpenAI/Claude client + `ILlm` port + mock).
- `trigger` recipe (jobs) and `outbox` (domain events → queue).
- Multi-tenant (organizations + memberships) as a recipe on top of auth.

---

## 13. "Done" criteria for the generated project

A `forja init` with all defaults is considered correct if, without touching a
single file:

1. `npm run typecheck && npm run lint` → green.
2. `npm test` → green (unit + integration).
3. `docker compose up -d && npm run db:push && npm run test:e2e` → green,
   including the complete password recovery flow.
4. `npm run mobile` opens Expo and login against `localhost:3000` works in
   the simulator without configuring the IP by hand.
5. `packages/core` imports nothing from `next`/`react`/`expo` (the
   `dependency-cruiser` rule is green).
6. `npm run design:build` leaves web and mobile with the same tokens; changing
   a hex value in `tokens.ts` shows up in both apps without touching CSS or
   `tailwind.config`.
7. With `eas = true`: `eas build --profile development --platform ios`
   finishes green from a freshly generated repo (only `eas login` is missing).
8. With `edgeFunctions = true`: `supabase start && supabase functions serve` +
   `deno test` green.
