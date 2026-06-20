import { Router } from "express";
import { register, login } from "../controllers/authController.js";

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Cadastra uma nova empresa no sistema
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: empresa@exemplo.com
 *               password:
 *                 type: string
 *                 minimum: 6
 *                 example: senha_ultra_segura
 *     responses:
 *       201:
 *         description: Empresa cadastrada com sucesso.
 *       400:
 *         description: Erro de validação ou e-mail já cadastrado.
 */
router.post("/register", register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Autentica uma empresa e retorna um Token JWT
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: empresa@exemplo.com
 *               password:
 *                 type: string
 *                 example: senha_ultra_segura
 *     responses:
 *       200:
 *         description: Login bem-sucedido. Retorna o token de acesso.
 *       401:
 *         description: Credenciais inválidas.
 */
router.post("/login", login);

export default router;
