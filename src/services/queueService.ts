import { prisma } from "../config/db.js";
import { extractStructuredData } from "./aiService.js";
import { logger } from "../config/logger.js";

class InMemoryQueue {
  private queue: string[] = [];
  private isProcessing = false;

  public add(documentId: string): void {
    this.queue.push(documentId);
    logger.info(
      `[Fila] Documento ${documentId} adicionado à fila em memória. Total na fila: ${this.queue.length}`,
    );

    if (!this.isProcessing) {
      this.processNext();
    }
  }

  private async processNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      logger.info(
        "[Fila] Todos os documentos da fila em memória foram processados.",
      );
      return;
    }

    this.isProcessing = true;
    const documentId = this.queue.shift()!;

    try {
      await this.processDocument(documentId);
    } catch (error: any) {
      logger.error(
        `[Fila] Erro crítico no processamento do documento ${documentId}: ${error.message}`,
      );
    }

    setTimeout(() => this.processNext(), 1000);
  }

  private async processDocument(documentId: string): Promise<void> {
    logger.info(`[Fila] Iniciando leitura do documento: ${documentId}`);

    const doc = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      logger.warn(
        `[Fila] Documento ${documentId} não encontrado no banco de dados.`,
      );
      return;
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "PROCESSING" },
    });

    await prisma.auditLog.create({
      data: {
        action: "PROCESS_START",
        details: `Processamento com IA iniciado via fila em memória para o arquivo "${doc.name}".`,
        documentId,
        userId: doc.userId,
      },
    });

    try {
      const extractedData = await extractStructuredData(doc.filePath);

      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: "COMPLETED",
          extractedData,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "PROCESS_SUCCESS",
          details: `Extração concluída com sucesso para o arquivo "${doc.name}".`,
          documentId,
          userId: doc.userId,
        },
      });

      logger.info(`[Fila] Documento "${doc.name}" processado com sucesso!`);
    } catch (error: any) {
      logger.error(`[Fila] Falha ao processar "${doc.name}": ${error.message}`);

      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: "FAILED",
          errorMessage: error.message || "Erro durante o processamento da IA.",
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "PROCESS_ERROR",
          details: `Falha no processamento: ${error.message}`,
          documentId,
          userId: doc.userId,
        },
      });
    }
  }
}

export const inMemoryQueue = new InMemoryQueue();
