import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";

// Capture what nodemailer is asked to do instead of opening SMTP connections.
const created: unknown[] = [];
const sent: Record<string, unknown>[] = [];
let failNext = false;
mock.module("nodemailer", () => {
  const createTransport = (config: unknown) => {
    created.push(config);
    return {
      sendMail: async (mail: Record<string, unknown>) => {
        if (failNext) {
          failNext = false;
          throw new Error("550 mailbox unavailable");
        }
        sent.push(mail);
        return { messageId: "<test@wasaahost.com>" };
      },
    };
  };
  return { default: { createTransport }, createTransport };
});

const { sendEmail, resetEmailTransport } = await import("../../src/services/email.service.ts");

const SMTP_KEYS = ["SMTP_URL", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];
const saved = Object.fromEntries(SMTP_KEYS.map((k) => [k, process.env[k]]));

beforeEach(() => {
  created.length = 0;
  sent.length = 0;
  for (const k of SMTP_KEYS) delete process.env[k];
  resetEmailTransport();
});

afterAll(() => {
  for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
});

const message = { to: "amina@example.com", subject: "Order #1001 confirmed", text: "Thanks!" };

describe("sendEmail", () => {
  test("sends through SMTP_URL when set", async () => {
    process.env.SMTP_URL = "smtp://hello%40wasaahost.com:pw@mail.wasaahost.com:587";
    process.env.SMTP_FROM = "hello@wasaahost.com";
    await sendEmail(message);
    expect(created).toEqual(["smtp://hello%40wasaahost.com:pw@mail.wasaahost.com:587"]);
    expect(sent).toEqual([{ from: "hello@wasaahost.com", ...message }]);
  });

  test("uses SMTP_HOST/PORT/USER/PASS otherwise, STARTTLS on 587", async () => {
    Object.assign(process.env, { SMTP_HOST: "mail.wasaahost.com", SMTP_PORT: "587", SMTP_USER: "hello@wasaahost.com", SMTP_PASS: "pw", SMTP_FROM: "hello@wasaahost.com" });
    await sendEmail(message);
    expect(created[0]).toEqual({ host: "mail.wasaahost.com", port: 587, secure: false, auth: { user: "hello@wasaahost.com", pass: "pw" } });
    expect(sent).toHaveLength(1);
  });

  test("port 465 uses TLS from the start", async () => {
    Object.assign(process.env, { SMTP_HOST: "mail.wasaahost.com", SMTP_PORT: "465" });
    await sendEmail(message);
    expect((created[0] as { secure: boolean }).secure).toBe(true);
  });

  test("throws when SMTP rejects, so the queue retries", async () => {
    process.env.SMTP_URL = "smtp://mail.wasaahost.com:587";
    failNext = true;
    await expect(sendEmail(message)).rejects.toThrow("550");
  });

  test("only logs when no SMTP is configured", async () => {
    await sendEmail(message);
    expect(created).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });
});
