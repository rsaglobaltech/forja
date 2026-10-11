import type { IClock } from "../../ports/IClock.js";

export class SystemClock implements IClock {
  now(): Date {
    return new Date();
  }
}
