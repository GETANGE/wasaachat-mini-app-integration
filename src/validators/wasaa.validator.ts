import { z } from "zod";

// POST /api/wasaa/session — the page's wasaa.launchCode.
export const launchSessionSchema = z.object({
  code: z.string().trim().min(1).max(1024),
});
