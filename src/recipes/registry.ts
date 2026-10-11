import type { Recipe } from "./types.js";

import base from "./base.js";
import shared from "./shared.js";
import coreHexagonal from "./core-hexagonal.js";
import dbPostgresDocker from "./db-postgres-docker.js";
import dbNone from "./db-none.js";
import authSessions from "./auth-sessions.js";
import authNone from "./auth-none.js";
import mailerConsole from "./mailer-console.js";
import designTailwind from "./design-tailwind.js";
import web from "./web.js";
import mobile from "./mobile.js";
import extrasLint from "./extras-lint.js";
import apiSpring from "./api-spring.js";
import apiQuarkus from "./api-quarkus.js";
import compose from "./compose.js";
import webJava from "./web-java.js";
import keycloak from "./keycloak.js";

export const recipeRegistry: Record<string, Recipe> = {
  base,
  shared,
  "core-hexagonal": coreHexagonal,
  "db-postgres-docker": dbPostgresDocker,
  "db-none": dbNone,
  "auth-sessions": authSessions,
  "auth-none": authNone,
  "mailer-console": mailerConsole,
  "design-tailwind": designTailwind,
  web,
  mobile,
  "extras-lint": extrasLint,
  "api-spring": apiSpring,
  "api-quarkus": apiQuarkus,
  compose,
  keycloak,
  "web-java": webJava,
};
