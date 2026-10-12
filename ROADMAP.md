# forja 1.0 — roadmap

The plan to make forja ready for daily use, agreed on 2026-10-12. Tick a box in
the same pull request that does the work. Everything ships through a pull
request to `develop`, verified locally (Actions are off on private repos), and
`main` only ever receives `develop`. When a phase is done, the repository has
only `main` and `develop`.

Out of 1.0, for 1.x: Supabase and Edge Functions, EAS, shadcn, Maestro, the
design-token codegen and the own UI kit, mobile with a Java backend, OpenAPI →
TypeScript types, Resend/SMTP mailers, rate limiting, `forja upgrade`.

## Phase 1 — Foundation: everything forja offers works, in English

- [x] Package: `@rsaglobaltech/forja` (the name `forja` on npm is taken), MIT
      licence, repository, keywords, `publishConfig`, `prepublishOnly` (build +
      test), `forja --version`
- [x] `npm run lint` works (ESLint and a config for forja itself)
- [x] The wizard, the flags and `--help` offer only what works: no value that
      the planner then rejects; `--tests e2e-web` on Java is rejected, not ignored
- [x] `forja add` and `forja doctor` stubs removed until phase 3 implements them
- [x] `--config` combines with the name argument and the flags
- [x] Specgate: pinned to `^0.19.1` (0.17 writes the old `csda:` format); the
      generated `docs/specgate.md` rewritten for today's flow (`specgate draft`,
      `--agent`, `done`, `check`); the closing steps say `specgate draft` when a
      brief is there
- [x] English everywhere: CLI prompts and messages, README, CHANGELOG from now
      on, `docs/`, template comments, and the text of the generated apps

## Phase 2 — Up to date: what forja generates works today

- [x] Node path on current versions: Next 16, React 19, a current Expo SDK
- [x] ESLint 10 on the Node path, if Expo accepts it
- [x] `scripts/verify-generated.sh node|spring|quarkus` generates, installs and
      proves a project locally (no GitHub Actions: the user's quota is spent)

## Phase 3 — Daily use: after `forja init`

- [x] `forja add usecase <Context>/<Name>` — Node hexagonal and Java; reads
      `forja.config.json`
- [x] `forja add port <Name>` and `forja add entity <Name>`
- [x] With Specgate in the project, `add usecase` offers the requirement
      (`specgate new`) and its test names the `REQ-xxx`
- [x] `forja doctor`: env keys against `.env.example`, Docker, Node version, the
      core's import rule

## Phase 4 — End to end

- [x] `--tests e2e-web`: Playwright smoke and the sign-in flow in the generated
      web app, for Node and Java, wired into the generated CI

## Phase 5 — Web

- [x] Repository made public, after scanning its history for secrets (scan done
      2026-10-12: only test passwords; the author email is in the commits)
- [x] Landing page and documentation in English, on Specgate's design
- [x] A "forja + Specgate" page: generate, write the brief, `specgate draft`,
      build, `done`
- [x] Published without creating or enabling any GitHub Actions workflow (the
      user's rule since 2026-10-12): GitHub Pages from `docs/` on `main`,
      built locally with `npm run site:publish`

## Phase 6 — Release 1.0.0

- [ ] Published to npm: `npm i -g @rsaglobaltech/forja`, `npx @rsaglobaltech/forja init`
- [ ] Release notes; the repository left with `main` and `develop`
