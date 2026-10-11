import type { ILogger } from "../../ports/ILogger.js";

export class ConsoleLogger implements ILogger {
  info(message: string, meta?: Record<string, unknown>): void {
    console.log(`[info] ${message}`, meta ?? "");
  }

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(`[error] ${message}`, meta ?? "");
  }
}
