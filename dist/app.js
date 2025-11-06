"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pino_http_1 = __importDefault(require("pino-http"));
const logger_1 = require("./logger");
const contacts = [
    { id: 1, name: "Thomas MICHELIN", email: "thomasmichelin@coda.com", phone: "0769502244" },
    { id: 2, name: "Titouan ElMouafik", email: "titouanElMouafik@coda.com", phone: "0700000000" }
];
const app = (0, express_1.default)();
/**
 * IMPORTANT : pino-http AVANT express.json()
 * -> permet de logger aussi les erreurs de parsing JSON (400)
 */
app.use((0, pino_http_1.default)({
    logger: logger_1.logger,
    genReqId: () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    serializers: {
        req(req) {
            return { id: req.id, method: req.method, url: req.url };
        },
        res(res) {
            return { statusCode: res.statusCode };
        },
    },
    customLogLevel: (_req, res, err) => {
        if (err)
            return "error";
        if (res.statusCode >= 500)
            return "error";
        if (res.statusCode >= 400)
            return "warn";
        return "info";
    },
    customSuccessMessage: (req, res) => `${req.method} ${req.url} → ${res.statusCode}`,
    customErrorMessage: (req, res, err) => `ERROR ${req.method} ${req.url} → ${res.statusCode}: ${err?.message || ""}`,
}));
// Body JSON (après pino-http)
app.use(express_1.default.json());
// Accueil
app.get("/", (_req, res) => res.type("text").send("API CONTACT"));
// Liste des contacts (?name=&email= optionnels)
app.get("/contacts", (req, res) => {
    const name = req.query.name || "";
    const email = req.query.email || "";
    const data = contacts.filter((c) => (!name || c.name.includes(name)) && (!email || c.email.includes(email)));
    req.log?.info({ name, email, count: data.length }, "GET /contacts");
    res.json({ data });
});
// Création (201) + 400 champs requis + 409 email déjà pris
app.post("/contacts", (req, res) => {
    const { name, email, phone = "" } = req.body ?? {};
    if (!name || !email) {
        req.log?.warn({ body: req.body }, "400 create - missing fields");
        return res.status(400).json({ error: "name and email are required" });
    }
    if (contacts.some((c) => c.email.toLowerCase() === String(email).toLowerCase())) {
        req.log?.warn({ email }, "409 create - email exists");
        return res.status(409).json({ error: "email already exists" });
    }
    const id = contacts.length ? Math.max(...contacts.map((c) => c.id)) + 1 : 1;
    const c = { id, name, email, phone };
    contacts.push(c);
    req.log?.info({ id }, "201 create");
    res.status(201).json({ data: c });
});
// 405 autres méthodes sur /contacts
app.all("/contacts", (req, res) => {
    req.log?.warn("405 /contacts");
    res.set("Allow", "GET, POST");
    res.status(405).json({ error: "method not allowed" });
});
// Détail
app.get("/contacts/:id", (req, res) => {
    const id = Number(req.params.id);
    const c = contacts.find((x) => x.id === id);
    if (!c) {
        req.log?.warn({ id }, "404 get item");
        return res.status(404).json({ error: "not found" });
    }
    res.json({ data: c });
});
// Mise à jour (200) + 404 si introuvable + 409 si email en doublon
app.put("/contacts/:id", (req, res) => {
    const id = Number(req.params.id);
    const i = contacts.findIndex((x) => x.id === id);
    if (i === -1) {
        req.log?.warn({ id }, "404 update");
        return res.status(404).json({ error: "not found" });
    }
    const { name, email, phone } = req.body ?? {};
    if (email !== undefined) {
        if (contacts.some((c) => c.email.toLowerCase() === String(email).toLowerCase() && c.id !== id)) {
            req.log?.warn({ id, email }, "409 update - email exists");
            return res.status(409).json({ error: "email already exists" });
        }
        contacts[i].email = email;
    }
    if (name !== undefined)
        contacts[i].name = name;
    if (phone !== undefined)
        contacts[i].phone = phone;
    req.log?.info({ id }, "200 update");
    res.json({ data: contacts[i] });
});
// Suppression (200) + 404 si introuvable
app.delete("/contacts/:id", (req, res) => {
    const id = Number(req.params.id);
    const i = contacts.findIndex((x) => x.id === id);
    if (i === -1) {
        req.log?.warn({ id }, "404 delete");
        return res.status(404).json({ error: "not found" });
    }
    const removed = contacts.splice(i, 1)[0];
    req.log?.info({ id }, "200 delete");
    res.json({ data: removed });
});
// 405 autres méthodes sur /contacts/:id
app.all("/contacts/:id", (req, res) => {
    req.log?.warn("405 /contacts/:id");
    res.set("Allow", "GET, PUT, DELETE");
    res.status(405).json({ error: "method not allowed" });
});
// 404 global
app.use((req, res) => {
    req.log?.warn("404 route not found");
    res.status(404).json({ error: "not found" });
});
// Middleware d’erreurs (JSON invalide → 400 ; sinon 500)
app.use((err, req, res, _next) => {
    req.log?.error({ err }, "Unhandled error");
    if (err instanceof SyntaxError)
        return res.status(400).json({ error: "bad json" });
    return res.status(500).json({ error: "server error" });
});
exports.default = app;
