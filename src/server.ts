import app from "./app";
import { logger } from "./logger";

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  logger.info({ port: PORT }, "Server started");
  console.log(`Server on http://localhost:${PORT}`);
});
