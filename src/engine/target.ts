import fs from "node:fs";

/**
 * Why `forja init` cannot write into a folder, or null when it can. The dry
 * run asks the same question, so it never promises a tree the real run refuses.
 */
export function targetProblem(targetDir: string): string | null {
  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
    return `"${targetDir}" already exists and is not empty.`;
  }
  return null;
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
