import type { IMailer, MailMessage } from "../../ports/IMailer.js";

/** Keeps sent emails in memory: the tests read the reset link from here. */
export class InMemoryMailer implements IMailer {
  readonly sent: MailMessage[] = [];

  async send(message: MailMessage): Promise<void> {
    this.sent.push(message);
  }

  last(): MailMessage | undefined {
    return this.sent.at(-1);
  }

  reset(): void {
    this.sent.length = 0;
  }
}
