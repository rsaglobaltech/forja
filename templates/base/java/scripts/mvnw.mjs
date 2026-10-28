// Runs apps/api's Maven wrapper with the arguments given, on every platform.
// npm runs package scripts with cmd.exe on Windows, which cannot run `./mvnw`:
// `npm test`, `npm run arch` and Specgate's gate failed there with
// "'.' is not recognized as an internal or external command". The wrapper is
// called by its full path: with NoDefaultCurrentDirectoryInExePath set,
// cmd.exe does not look in the current folder either.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const api = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "apps", "api");
const args = process.argv.slice(2);
const quote = (a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
const run =
  process.platform === "win32"
    ? spawnSync(`"${path.join(api, "mvnw.cmd")}"`, args.map(quote), {
        cwd: api,
        stdio: "inherit",
        shell: true,
      })
    : spawnSync(path.join(api, "mvnw"), args, { cwd: api, stdio: "inherit" });
process.exit(run.status ?? 1);
