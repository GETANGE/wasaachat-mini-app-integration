import { logger } from "../config/logger.ts";

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

export async function sendEmail(message: MailMessage): Promise<void> {
  const isProd = process.env.NODE_ENV === "production";

  logger.info("Email dispatched", {
    to: message.to,
    subject: message.subject,
    ...(isProd ? {} : { text: message.text }),
  });
}
