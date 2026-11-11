import nodemailer, { type Transporter } from "nodemailer";
import { logger } from "../config/logger.ts";

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

// SMTP comes from the environment: SMTP_URL (e.g. smtp://user:pass@mail.wasaahost.com:587),
// or SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS. Mail is sent from SMTP_FROM.
// Port 465 uses TLS from the start; other ports (587) upgrade with STARTTLS.
let transporter: Transporter | null | undefined;

function createTransporter(): Transporter | null {
  if (process.env.SMTP_URL) {
    return nodemailer.createTransport(process.env.SMTP_URL);
  }

  if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
    });
  }

  return null;
}

function getTransporter(): Transporter | null {
  if (transporter === undefined) {
    transporter = createTransporter();
    if (!transporter) {
      logger.warn("SMTP is not configured (SMTP_URL or SMTP_HOST); emails will only be logged");
    }
  }
  return transporter;
}

// For tests: forget the cached transport so a changed environment is picked up.
export function resetEmailTransport() {
  transporter = undefined;
}

function sender(): string {
  return process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "hello@wasaahost.com";
}

// Throws when SMTP rejects the message, so the email queue retries the job.
export async function sendEmail(message: MailMessage): Promise<void> {
  const isProd = process.env.NODE_ENV === "production";
  const transport = getTransporter();

  if (!transport) {
    logger.info("Email not sent (no SMTP configured)", {
      to: message.to,
      subject: message.subject,
      ...(isProd ? {} : { text: message.text }),
    });
    return;
  }

  const info = await transport.sendMail({
    from: sender(),
    to: message.to,
    subject: message.subject,
    text: message.text,
  });

  logger.info("Email sent", {
    to: message.to,
    subject: message.subject,
    messageId: info.messageId,
  });
}
