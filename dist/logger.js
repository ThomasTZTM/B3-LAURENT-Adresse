"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const dest = process.env.LOG_FILE || "logs/app.log";
exports.logger = (0, pino_1.default)({ level: process.env.LOG_LEVEL || "info" }, pino_1.default.transport({
    target: "pino/file",
    options: { destination: dest, mkdir: true }
}));
