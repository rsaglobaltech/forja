import fs from "node:fs";
import path from "node:path";
import { ForjaError } from "../project/project.js";

/**
 * The files one `forja add` touches, relative to the project root. Nothing is
 * overwritten: a file that already exists stops the command before anything
 * is written, so a half-applied `add` cannot happen.
 */
export class Changes {
  private readonly pending = new Map<string, { content: string; created: boolean }>();

  constructor(readonly root: string) {}

  exists(rel: string): boolean {
    return this.pending.has(rel) || fs.existsSync(path.join(this.root, rel));
  }

  read(rel: string): string {
    return this.pending.get(rel)?.content ?? fs.readFileSync(path.join(this.root, rel), "utf-8");
  }

  create(rel: string, content: string): void {
    if (this.exists(rel)) {
      throw new ForjaError(`${rel} already exists.`, "Pick another name, or delete the file if it is a leftover.");
    }
    this.pending.set(rel, { content, created: true });
  }

  update(rel: string, content: string): void {
    const created = this.pending.get(rel)?.created ?? false;
    this.pending.set(rel, { content, created });
  }

  get created(): string[] {
    return [...this.pending].filter(([, f]) => f.created).map(([rel]) => rel);
  }

  get updated(): string[] {
    return [...this.pending].filter(([, f]) => !f.created).map(([rel]) => rel);
  }

  /** Writes everything at once, after every check has passed. */
  commit(): void {
    for (const [rel, { content }] of this.pending) {
      const file = path.join(this.root, rel);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content);
    }
  }
}
