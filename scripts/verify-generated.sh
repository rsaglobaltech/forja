#!/usr/bin/env bash
# Generate a project with the built CLI and prove it works: install, tests,
# typecheck, lint, the web app's production build, and — on the Node path —
# the mobile app bundled for iOS, Android and web plus `expo-doctor`, and the
# Playwright end-to-end tests in a real browser.
#
#   scripts/verify-generated.sh node|spring|quarkus [workdir]
#
# Used by .github/workflows/ci.yml and runnable locally (build forja first:
# `npm run build`). Java backends need a JDK 21 and Docker (Testcontainers,
# PostgreSQL and Keycloak); ports 3000, 5432, 8080 and 8180 must be free, so
# run one backend at a time.
set -euo pipefail

backend="${1:?usage: verify-generated.sh node|spring|quarkus [workdir]}"
forja="$(cd "$(dirname "$0")/.." && pwd)/dist/cli.js"
work="${2:-$(mktemp -d)}"
name="demo-$backend"

step() { printf '\n▶ %s\n' "$*"; }

cd "$work"
rm -rf "$name"
if [ "$backend" = node ]; then
  step "forja init (Node: web + mobile, PostgreSQL, sessions, Playwright, lint, CI, Specgate)"
  node "$forja" init "$name" --yes --tests unit,integration,e2e-web --extras lint,ci,specgate --skip-git
else
  step "forja init ($backend: PostgreSQL, OAuth2, ArchUnit, web, Playwright, extras)"
  node "$forja" init "$name" --yes --backend "$backend" --java-package com.acme.demo \
    --tests unit,integration,e2e-web --skip-git
fi
cd "$name"

step "forja add: a use case (with its requirement), an entity, a port"
node "$forja" add usecase orders/PlaceOrder
node "$forja" add entity orders/Order
node "$forja" add port orders/OrderRepository

step "forja doctor";  node "$forja" doctor

step "tests";      npm test
step "typecheck";  npm run typecheck --if-present
step "lint";       npm run lint --if-present

if [ "$backend" = node ]; then
  step "web: production build"
  npm run build --workspace apps/web
  for platform in ios android web; do
    step "mobile: bundle for $platform"
    (cd apps/mobile && npx expo export --platform "$platform" --output-dir "$work/export-$platform")
  done
  step "mobile: expo-doctor"
  (cd apps/mobile && npx expo-doctor)
fi

step "end to end: Playwright"
npx playwright install chromium
if [ "$backend" != node ]; then
  # PostgreSQL and Keycloak for the API and the sign-in; Playwright starts the API and the web app.
  docker compose up -d --wait
  trap 'docker compose down -v >/dev/null 2>&1 || true' EXIT
fi
npm run test:e2e

step "Specgate: validate --strict"
npx --no-install specgate validate . --strict

printf '\n✔ %s: everything forja generated works\n' "$name"
