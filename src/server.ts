import app from "./app.js"; // Importamos o app desacoplado
import { logger } from "./config/logger.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`[Servidor] DocPipeline ativo na porta http://localhost:${PORT}`);
  logger.info(
    `[Swagger] Documentação interativa em http://localhost:${PORT}/api-docs`,
  );
});
