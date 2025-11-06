// tests/server.test.ts
import request from "supertest";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import app from "../src/app"; // <-- adapte le chemin si besoin

const api = request(app);

// ---------- Helpers LOGS ----------
const LOG_PATH = process.env.LOG_FILE || "logs/app.log";
function clearLogs() {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.writeFileSync(LOG_PATH, "");
}
function readLogs(): string {
  try {
    return fs.readFileSync(LOG_PATH, "utf-8");
  } catch {
    return "";
  }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// =====================================================================
// TESTS FONCTIONNELS (API)
// =====================================================================
describe("Contacts API (Express)", () => {
  let createdId = 0;

  it("GET / → 200 (texte)", async () => {
    const res = await api.get("/");
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/API CONTACT/i);
  });

  it("GET /contacts → 200 + array", async () => {
    const res = await api.get("/contacts");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("POST /contacts sans name/email → 400", async () => {
    const res = await api.post("/contacts").send({ name: "" });
    expect(res.status).toBe(400);
  });

  it("POST /contacts → 201 + created", async () => {
    const res = await api.post("/contacts").send({
      name: "Alice Martin",
      email: "alice@mail.com",
      phone: "0611223344",
    });
    expect(res.status).toBe(201);
    createdId = res.body?.data?.id;
    expect(typeof createdId).toBe("number");
  });

  it("POST /contacts (email doublon) → 409", async () => {
    const res = await api.post("/contacts").send({
      name: "Alice 2",
      email: "alice@mail.com", // déjà utilisé par le test précédent
    });
    expect(res.status).toBe(409);
  });

  it("GET /contacts/:id (créé) → 200", async () => {
    const res = await api.get(`/contacts/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body?.data?.id).toBe(createdId);
  });

  it("PUT /contacts/:id (update partiel) → 200", async () => {
    const res = await api.put(`/contacts/${createdId}`).send({ phone: "0700000000" });
    expect(res.status).toBe(200);
    expect(res.body?.data?.phone).toBe("0700000000");
  });

  it("PUT /contacts/:id (JSON invalide) → 400", async () => {
    const res = await api
      .put(`/contacts/${createdId}`)
      .set("Content-Type", "application/json")
      .send("{pas-du-json}");
    expect(res.status).toBe(400);
  });

  it("GET /contacts/99999 → 404", async () => {
    const res = await api.get("/contacts/99999");
    expect(res.status).toBe(404);
  });

  it("POST /contacts/:id → 405 + Allow", async () => {
    const res = await api.post(`/contacts/${createdId}`).send({ foo: "bar" });
    expect(res.status).toBe(405);
    expect(res.header.allow).toBe("GET, PUT, DELETE");
  });

  it("DELETE /contacts → 405 + Allow", async () => {
    const res = await api.delete("/contacts");
    expect(res.status).toBe(405);
    expect(res.header.allow).toBe("GET, POST");
  });

  it("DELETE /contacts/:id (créé) → 200", async () => {
    const res = await api.delete(`/contacts/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body?.data?.id).toBe(createdId);
  });

  it("DELETE /contacts/:id (inexistant) → 404", async () => {
    const res = await api.delete(`/contacts/${createdId}`); // déjà supprimé
    expect(res.status).toBe(404);
  });

  it("GET /unknown → 404", async () => {
    const res = await api.get("/unknown");
    expect(res.status).toBe(404);
  });
});

// =====================================================================
// TESTS DES LOGS (pino + pino-http)
// =====================================================================
describe("Logs Pino", () => {
  beforeAll(() => clearLogs());
  beforeEach(() => clearLogs());

  it("écrit un log de succès pour GET /contacts", async () => {
    const res = await api.get("/contacts");
    expect(res.status).toBe(200);
    await sleep(30); // laisser Pino écrire

    const logs = readLogs();
    // pino-http écrit : "GET /contacts → 200"
    expect(logs).toMatch(/GET\s+\/contacts\s+→\s+200/);
  });

  it("écrit un log d'avertissement pour 404 (route inconnue)", async () => {
    const res = await api.get("/route-inexistante");
    expect(res.status).toBe(404);
    await sleep(30);

    const logs = readLogs();
    expect(logs).toMatch(/404/);
    expect(logs.toLowerCase()).toContain("route not found"); // message du 404 global
  });

  it("écrit un log d'erreur pour JSON invalide (400 sur PUT /contacts/1)", async () => {
    const res = await api
      .put("/contacts/1")
      .set("Content-Type", "application/json")
      .send("{pas-du-json}");
    expect(res.status).toBe(400);
    await sleep(30);

    const logs = readLogs();
    // (1) middleware d'erreurs : "Unhandled error" (niveau error)
    expect(logs).toContain('"msg":"Unhandled error"');
    expect(logs).toMatch(/"level":50/);
    // (2) pino-http trace la requête terminée avec 400
    expect(logs).toMatch(/PUT\s+\/contacts\/1\s+→\s+400/);
  });
});
