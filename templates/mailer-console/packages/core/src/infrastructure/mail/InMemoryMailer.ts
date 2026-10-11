import type { IMailer, MailMessage } from "../../ports/IMailer.js";

/** Guarda los mails enviados en memoria: los tests leen el link de reset de acá. */
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
