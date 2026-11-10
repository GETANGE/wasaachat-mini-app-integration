import app from "./app.ts";
import { logger } from "./config/logger.ts";

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  logger.info(`API listening on http://localhost:${port}`);
});
