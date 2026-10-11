import type { IMailer, MailMessage } from "../../ports/IMailer.js";

/** Para dev: imprime el mail en la consola del servidor en vez de mandarlo de verdad. */
export class ConsoleMailer implements IMailer {
  async send(message: MailMessage): Promise<void> {
    console.log(`\n--- Mail a ${message.to} ---\n${message.subject}\n\n${message.text}\n---\n`);
  }
}
