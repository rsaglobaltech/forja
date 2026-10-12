import type { IClock } from "../../ports/IClock.js";

/** For deterministic tests: a fixed date that can be advanced by hand. */
export class FixedClock implements IClock {
  constructor(private current: Date = new Date("2025-01-01T00:00:00.000Z")) {}

  now(): Date {
    return this.current;
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}
