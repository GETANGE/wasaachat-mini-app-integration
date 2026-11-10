import { Worker } from "bullmq";
import { logger } from "../config/logger.ts";
import { createRedisConnection } from "../queues/connection.ts";
import type { EmailJobData, EmailJobName } from "../queues/index.ts";
import { sendEmail } from "../services/email.service.ts";

export function startEmailWorker() {
  const worker = new Worker<EmailJobData, void, EmailJobName>(
    "email",
    async (job) => {
      const { to, name, orderId, total, amount } = job.data;

      switch (job.name) {
        case "order-confirmation":
          await sendEmail({
            to,
            subject: `Order #${orderId} confirmed`,
            text: `Hi ${name}, we received order #${orderId} for ${total}.`,
          });
          break;
        case "payment-receipt":
          await sendEmail({
            to,
            subject: `Payment received for order #${orderId}`,
            text: `Hi ${name}, we received ${amount} for order #${orderId}.`,
          });
          break;
      }

      logger.info("Email job processed", {
        jobId: job.id,
        job: job.name,
        to,
      });
    },
    {
      connection: createRedisConnection(),
      concurrency: Number(process.env.EMAIL_WORKER_CONCURRENCY ?? 5),
    },
  );

  worker.on("failed", (job, err) => {
    logger.error("Email job failed", {
      jobId: job?.id,
      job: job?.name,
      error: err.message,
    });
  });

  return worker;
}
