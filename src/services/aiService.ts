import OpenAI from "openai";
import fs from "fs";
import path from "path";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL_NAME =
  process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash:free";

if (!OPENROUTER_API_KEY) {
  throw new Error(
    "A variável de ambiente OPENROUTER_API_KEY não foi configurada!",
  );
}

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "DocPipeline",
  },
});

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    default:
      throw new Error(`Extensão de arquivo não suportada: ${ext}`);
  }
}

function cleanJsonString(rawText: string): string {
  let cleaned = rawText.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```json/i, "")
      .replace(/```$/, "")
      .trim();
  }

  return cleaned;
}

export async function extractStructuredData(filePath: string): Promise<any> {
  const mimeType = getMimeType(filePath);
  const base64Data = Buffer.from(fs.readFileSync(filePath)).toString("base64");
  const filename = path.basename(filePath);

  const prompt = `
    Você é um assistente especialista em auditoria e leitura de documentos comerciais.
    Analise com extrema precisão o documento em anexo (imagem ou PDF).
    
    INSTRUÇÃO OBRIGATÓRIA:
    Você deve responder APENAS e estritamente com um objeto JSON válido, sem nenhuma introdução, explicação ou formatação adicional. 
    Se você não conseguir ler o arquivo, responda apenas um JSON contendo {"erro": "Não foi possível ler o arquivo"} e nada mais.
    Não use palavras como "Aqui está o seu JSON" ou "Como você pediu".
  `;

  const messageContent: any[] = [{ type: "text", text: prompt }];

  if (mimeType === "application/pdf") {
    messageContent.push({
      type: "file",
      file: {
        filename,
        file_data: `data:application/pdf;base64,${base64Data}`,
      },
    });
  } else {
    messageContent.push({
      type: "image_url",
      image_url: {
        url: `data:${mimeType};base64,${base64Data}`,
      },
    });
  }

  const jsonSchema = {
    type: "object",
    properties: {
      tipo_documento: {
        type: "string",
        description: "Ex: Fatura, Nota Fiscal, Contrato, Recibo, Laudo",
      },
      emissor: {
        type: "string",
        description: "Nome da empresa que emitiu o documento",
      },
      valor_total: {
        type: "number",
        description: "Valor total do documento. Se não houver, coloque 0.",
      },
      data_emissao: {
        type: "string",
        description: "Data de emissão no formato AAAA-MM-DD",
      },
      informacoes_adicionais: {
        type: "string",
        description: "Resumo com CNPJs ou termos chave.",
      },
    },
    required: ["tipo_documento", "emissor", "valor_total"],
  };

  const response = await openai.chat.completions.create({
    model: MODEL_NAME,
    messages: [
      {
        role: "user",
        content: messageContent,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "document_extraction",
        strict: true,
        schema: jsonSchema as any,
      },
    },
  });

  const responseText = response.choices[0]?.message?.content;

  if (!responseText) {
    throw new Error("O modelo do OpenRouter retornou uma resposta em branco.");
  }

  const sanitizedText = cleanJsonString(responseText);

  try {
    return JSON.parse(sanitizedText);
  } catch (error) {
    console.error("[JSON Parse Failed] Texto bruto recebido:", responseText);
    throw new Error(
      `Falha ao converter o resultado da IA em dados estruturados. Retorno bruto: ${responseText.substring(0, 100)}...`,
    );
  }
}
