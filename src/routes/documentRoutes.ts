import { Router } from "express";
import {
  uploadDocuments,
  listDocuments,
} from "../controllers/documentController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { upload } from "../config/multer.js";

const router = Router();

router.use(authMiddleware);

/**
 * @openapi
 * /documents/upload:
 *   post:
 *     summary: Faz upload de múltiplos documentos em lote para processamento
 *     tags: [Documentos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Lista de arquivos (PDF, PNG, JPG, JPEG) de até 10MB cada.
 *     responses:
 *       202:
 *         description: Arquivos aceitos e adicionados com sucesso na fila do Worker.
 *       401:
 *         description: Não autenticado ou Token ausente/inválido.
 *       400:
 *         description: Nenhum arquivo enviado ou extensão não aceita.
 */
router.post("/upload", upload.array("files", 10), uploadDocuments);

/**
 * @openapi
 * /documents:
 *   get:
 *     summary: Lista todos os documentos enviados pelo usuário autenticado
 *     tags: [Documentos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Retorna uma lista de documentos e seus status de leitura pela IA.
 *       401:
 *         description: Não autenticado.
 */
router.get("/", listDocuments);

export default router;
