import request from "supertest";
import app from "../src/app.js";

describe("GET /health", () => {
  it("deve retornar status 200 e a mensagem de servidor funcionando", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      status: "ok",
      message: "Servidor DocPipeline funcionando!",
    });
  });
});
