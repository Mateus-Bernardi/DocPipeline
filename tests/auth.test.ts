import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";

describe("Fluxo de Autenticação e Segurança", () => {
  const testUser = {
    email: "test-user@docpipeline.com",
    password: "password_teste_123",
  };

  afterAll(async () => {
    const user = await prisma.user.findUnique({
      where: { email: testUser.email },
    });

    if (user) {
      await prisma.auditLog.deleteMany({ where: { userId: user.id } });
      await prisma.document.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  it("deve cadastrar um novo usuário com sucesso", async () => {
    const response = await request(app).post("/auth/register").send(testUser);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty(
      "message",
      "Usuário cadastrado com sucesso!",
    );
    expect(response.body.user).toHaveProperty("email", testUser.email);
    expect(response.body.user).toHaveProperty("id");
  });

  it("não deve permitir cadastrar um usuário com e-mail já existente", async () => {
    const response = await request(app).post("/auth/register").send(testUser);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty(
      "error",
      "E-mail já cadastrado no sistema.",
    );
  });

  it("deve fazer login com sucesso e retornar um token JWT", async () => {
    const response = await request(app).post("/auth/login").send(testUser);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
    expect(typeof response.body.token).toBe("string");
  });

  it("deve negar acesso à listagem de documentos se o token JWT não for fornecido", async () => {
    const response = await request(app).get("/documents");

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty(
      "error",
      "Acesso negado. Token não fornecido.",
    );
  });

  it("deve negar acesso à listagem de documentos se o token JWT for inválido", async () => {
    const response = await request(app)
      .get("/documents")
      .set("Authorization", "Bearer token_invalido_qualquer");

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty(
      "error",
      "Token inválido ou expirado.",
    );
  });

  it("deve permitir acesso à listagem de documentos se um token válido for fornecido", async () => {
    const loginResponse = await request(app).post("/auth/login").send(testUser);

    const token = loginResponse.body.token;

    const response = await request(app)
      .get("/documents")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
