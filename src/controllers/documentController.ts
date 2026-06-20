import { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { inMemoryQueue } from "../services/queueService.js";

export async function uploadDocuments(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[];
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: "Usuário não autenticado." });
      return;
    }

    if (!files || files.length === 0) {
      res.status(400).json({
        error: "Nenhum arquivo enviado. Envie pelo menos um documento.",
      });
      return;
    }

    const createdDocuments = await prisma.$transaction(async (tx) => {
      const documentsCreatedList = [];

      for (const file of files) {
        const doc = await tx.document.create({
          data: {
            name: file.originalname,
            filePath: file.path,
            status: "PENDING",
            userId: user.id,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "DOCUMENT_UPLOAD",
            details: `Arquivo "${file.originalname}" enviado pelo usuário. ID de controle: ${doc.id}`,
            documentId: doc.id,
            userId: user.id,
          },
        });

        documentsCreatedList.push({
          id: doc.id,
          name: doc.name,
          status: doc.status,
          createdAt: doc.createdAt,
        });
      }

      return documentsCreatedList;
    });

    for (const doc of createdDocuments) {
      inMemoryQueue.add(doc.id);
    }

    res.status(202).json({
      message: `${createdDocuments.length} documento(s) recebido(s) com sucesso para processamento.`,
      documents: createdDocuments,
    });
  } catch (error: any) {
    console.error("[Upload Controller Error]", error);
    res.status(500).json({
      error: error.message || "Erro ao processar upload de documentos.",
    });
  }
}

export async function listDocuments(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: "Usuário não autenticado." });
      return;
    }

    const documents = await prisma.document.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        extractedData: true,
        errorMessage: true,
        createdAt: true,
      },
    });

    res.json(documents);
  } catch (error) {
    console.error("[List Documents Error]", error);
    res.status(500).json({ error: "Erro ao buscar documentos." });
  }
}
