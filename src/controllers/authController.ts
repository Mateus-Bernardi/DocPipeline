import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../config/db.js";

const authSchema = z.object({
  email: z.string().email({ message: "E-mail inválido" }),
  password: z
    .string()
    .min(6, { message: "A senha deve ter no mínimo 6 caracteres" }),
});

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const parsedData = authSchema.parse(req.body);

    const userExists = await prisma.user.findUnique({
      where: { email: parsedData.email },
    });

    if (userExists) {
      res.status(400).json({ error: "E-mail já cadastrado no sistema." });
      return;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(parsedData.password, saltRounds);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: parsedData.email,
          password: passwordHash,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "USER_REGISTER",
          details: `Usuário ${user.email} se cadastrou no sistema com sucesso.`,
          userId: user.id,
        },
      });

      return user;
    });

    res.status(201).json({
      message: "Usuário cadastrado com sucesso!",
      user: {
        id: newUser.id,
        email: newUser.email,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.flatten().fieldErrors });
      return;
    }

    console.error("[Register Error]", error);
    res
      .status(500)
      .json({ error: "Ocorreu um erro interno ao cadastrar o usuário." });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const parsedData = authSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: parsedData.email },
    });

    if (!user) {
      res.status(401).json({ error: "E-mail ou senha inválidos." });
      return;
    }

    const isPasswordValid = await bcrypt.compare(
      parsedData.password,
      user.password,
    );

    if (!isPasswordValid) {
      res.status(401).json({ error: "E-mail ou senha inválidos." });
      return;
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "1d",
    });

    await prisma.auditLog.create({
      data: {
        action: "USER_LOGIN",
        details: `Usuário ${user.email} fez login com sucesso.`,
        userId: user.id,
      },
    });

    res.json({
      message: "Login realizado com sucesso!",
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.flatten().fieldErrors });
      return;
    }

    console.error("[Login Error]", error);
    res.status(500).json({ error: "Ocorreu um erro interno ao fazer login." });
  }
}
