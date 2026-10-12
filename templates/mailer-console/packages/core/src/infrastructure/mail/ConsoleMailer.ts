import type { IMailer, MailMessage } from "../../ports/IMailer.js";

/** For development: prints the email to the server console instead of actually sending it. */
export class ConsoleMailer implements IMailer {
  async send(message: MailMessage): Promise<void> {
    console.log(`\n--- Email to ${message.to} ---\n${message.subject}\n\n${message.text}\n---\n`);
  }
}
