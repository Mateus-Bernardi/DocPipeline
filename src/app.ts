import express, { Request, Response } from "express";
import "dotenv/config";
import swaggerUi from "swagger-ui-express";

import authRoutes from "./routes/authRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import { swaggerSpec } from "./config/swagger.js";

const app = express();

app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/auth", authRoutes);
app.use("/documents", documentRoutes);

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "Servidor DocPipeline funcionando!" });
});

export default app;
