"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const contacts = [
    { id: 1, name: "Thomas MICHELIN", email: "thomasmichelin@coda.com", phone: "0769502244" },
    { id: 2, name: "Titouan ElMouafik", email: "titouanElMouafik@coda.com", phone: "0700000000" }
];
http_1.default.createServer((req, res) => {
    const u = req.url || "";
    // Page de présentation
    if (u === "/")
        return res.end("API CONTACT");
    // Page de contact par ID 
    // http://localhost:3000/get/(id)
    if (u.startsWith("/get/")) {
        const id = parseInt(u.split("?")[0].split("/")[2], 10);
        const c = contacts.find(x => x.id === id) || null;
        // ID du contact non trouvé
        if (!c) {
            res.statusCode = 404;
            return res.end("Error 404");
        }
        return res.end(JSON.stringify({ data: c }));
    }
    // Page de tout les contact 
    // http://localhost:3000/get
    if (u.startsWith("/get")) {
        const q = u.split("?")[1] || "";
        const p = new URLSearchParams(q);
        const name = p.get("name") || "";
        const email = p.get("email") || "";
        const data = contacts.filter(c => (!name || c.name.includes(name)) && (!email || c.email.includes(email)));
        return res.end(JSON.stringify({ data }));
    }
    // Ajout d'une personne 
    // http://localhost:3000/add?name=Alice%20Martin&email=alice%40mail.com&phone=0611223344
    if (u.startsWith("/add")) {
        const q = u.split("?")[1] || "";
        const p = new URLSearchParams(q);
        const name = p.get("name") || "";
        const email = p.get("email") || "";
        const phone = p.get("phone") || "";
        const id = contacts.length ? Math.max(...contacts.map(c => c.id)) + 1 : 1;
        const c = { id, name, email, phone };
        contacts.push(c);
        return res.end(JSON.stringify({ data: c }));
    }
    // Supprimer une personne
    // http://localhost:3000/delete/(id)
    if (u.startsWith("/delete/")) {
        const id = parseInt(u.split("?")[0].split("/")[2], 10);
        const i = contacts.findIndex(x => x.id === id);
        // ID du contact non trouvé
        if (i === -1) {
            res.statusCode = 404;
            return res.end("Error 404");
        }
        const removed = contacts.splice(i, 1)[0];
        return res.end("Sucess 200");
    }
    // Modifie un contact
    // http://localhost:3000/put/2?name=Alice%20Martin&email=alice%40mail.com&phone=0611223344
    if (u.startsWith("/put/")) {
        const id = parseInt(u.split("?")[0].split("/")[2], 10);
        const i = contacts.findIndex(x => x.id === id);
        if (i === -1) {
            res.statusCode = 404;
            return res.end("Error 404");
        }
        let b = "";
        req.on("data", c => b += c);
        req.on("end", () => {
            try {
                const j = b ? JSON.parse(b) : {};
                if (j.name !== undefined)
                    contacts[i].name = j.name;
                if (j.email !== undefined)
                    contacts[i].email = j.email;
                if (j.phone !== undefined)
                    contacts[i].phone = j.phone;
                res.end(JSON.stringify({ data: contacts[i] }));
            }
            catch {
                res.statusCode = 400;
                res.end("Error 404");
            }
        });
        return;
    }
    // La page n'existe pas 
    return res.end("Error 404");
}).listen(Number(process.env.PORT) || 3000);
