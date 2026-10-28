import fs from "node:fs";
import path from "node:path";

/** Folders a repository or an editor keeps, never forja's to write. */
const KEPT = new Set([".git", ".idea", ".vscode"]);

/** Every file under `dir`, as forward-slash paths relative to it; KEPT folders aside. */
function filesUnder(dir: string, rel = ""): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    if (!rel && KEPT.has(e.name)) continue;
    const child = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...filesUnder(dir, child));
    else out.push(child);
  }
  return out;
}

/**
 * Why `forja init` cannot write into a folder, or null when it can. A folder
 * that already holds a repository and a client's brief is where a project
 * starts (truck-flote, F11): what it holds is kept, unless forja would write
 * the same path. The dry run asks the same question, so it never promises a
 * tree the real run refuses.
 */
export function targetProblem(targetDir: string, planned: readonly string[] = []): string | null {
  if (!fs.existsSync(targetDir)) return null;
  const existing = filesUnder(targetDir);
  if (existing.length === 0) return null;
  const writes = new Set(planned.map((p) => p.replace(/\\/g, "/")));
  const clash = existing.filter((f) => writes.has(f));
  if (clash.length > 0) {
    return `"${targetDir}" already holds files forja would write: ${clash.slice(0, 5).join(", ")}${clash.length > 5 ? ", …" : ""}.`;
  }
  return null;
}

/**
 * Where `forja init <name>` writes. Run inside the project's own repository —
 * a folder named like the project that holds `.git` or the client's
 * `brief.md` — it writes there: creating `<name>/<name>` was what happened
 * when truck-flote's cloned repository was the place to run it (F14). A
 * folder of that name already inside keeps the old meaning.
 */
export function resolveTarget(cwd: string, name: string): { dir: string; here: boolean } {
  const nested = path.join(cwd, name);
  const sameName = path.basename(cwd).toLowerCase() === name.toLowerCase();
  const marked = fs.existsSync(path.join(cwd, ".git")) || fs.existsSync(path.join(cwd, "brief.md"));
  if (sameName && marked && !fs.existsSync(nested)) return { dir: cwd, here: true };
  return { dir: nested, here: false };
}

/**
 * Why `forja init` cannot ask its questions, or null when it can. Without a
 * terminal the wizard died in @clack with ERR_TTY_INIT_FAILED and a stack
 * trace (F15); unattended runs need no terminal.
 */
export function unattendedProblem(
  flags: { yes?: boolean; config?: string },
  tty: { stdin: boolean; stdout: boolean },
): string | null {
  if (flags.yes || flags.config) return null;
  if (tty.stdin && tty.stdout) return null;
  return "forja init asks its questions in a terminal, and this is not one: pass --yes (the defaults plus your flags) or --config <forja.config.json>.";
}

export interface Progress {
  start(message: string): void;
  stop(message: string): void;
}

/**
 * A spinner in a terminal; outside one (a pipe, a log, `specgate init --forja`
 * captured by a tool) the start and the end, once each.
 */
export function progress(
  interactive: boolean,
  write: (line: string) => void,
  spinner?: () => Progress,
): Progress {
  if (interactive && spinner) return spinner();
  return { start: write, stop: write };
}
