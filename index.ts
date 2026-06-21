import { logger } from "$/utils/logger";
import { app } from "$/server";

app.listen(Bun.env.PORT, (err) => {
  if (err) {
    logger.error("Error starting application", err);
  }

  logger.info(`Ready to accept connections on port ${Bun.env.PORT}`);
});
