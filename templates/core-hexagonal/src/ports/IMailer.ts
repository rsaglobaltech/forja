export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface IMailer {
  send(message: MailMessage): Promise<void>;
}
