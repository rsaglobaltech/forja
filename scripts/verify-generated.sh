#!/usr/bin/env bash
# Generate a project with the built CLI and prove it works: install, tests,
# typecheck, lint, the web app's production build, and — on the Node path —
# the mobile app bundled for iOS, Android and web plus `expo-doctor`.
#
#   scripts/verify-generated.sh node|spring|quarkus [workdir]
#
# Used by .github/workflows/ci.yml and runnable locally (build forja first:
# `npm run build`). Java backends need a JDK 21 and Docker (Testcontainers).
set -euo pipefail

backend="${1:?usage: verify-generated.sh node|spring|quarkus [workdir]}"
forja="$(cd "$(dirname "$0")/.." && pwd)/dist/cli.js"
work="${2:-$(mktemp -d)}"
name="demo-$backend"

step() { printf '\n▶ %s\n' "$*"; }

cd "$work"
rm -rf "$name"
if [ "$backend" = node ]; then
  step "forja init (Node: web + mobile, PostgreSQL, sessions, lint, CI, Specgate)"
  node "$forja" init "$name" --yes --extras lint,ci,specgate --skip-git
else
  step "forja init ($backend: PostgreSQL, OAuth2, ArchUnit, web, extras)"
  node "$forja" init "$name" --yes --backend "$backend" --java-package com.acme.demo --skip-git
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

step "Specgate: validate --strict"
npx --no-install specgate validate . --strict

printf '\n✔ %s: everything forja generated works\n' "$name"
