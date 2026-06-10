import "dotenv/config";

import fastifyStatic from "@fastify/static";
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildApp } from "./app.ts";
import { createTaskInterpreter } from "./interpreter.ts";
import { createRelayProcessor } from "./relay.ts";

const apiKey = process.env.N1N_API_KEY;
if (!apiKey) {
  throw new Error("缺少环境变量 N1N_API_KEY");
}

const app = buildApp({
  interpretTasks: createTaskInterpreter({
    apiKey,
    baseUrl: process.env.N1N_BASE_URL ?? "https://llm-api.net",
    model: process.env.TEXT_MODEL ?? "gpt-5.4-nano",
  }),
  processImage: createRelayProcessor({
    apiKey,
    baseUrl: process.env.N1N_BASE_URL ?? "https://llm-api.net",
    model: process.env.IMAGE_MODEL ?? "gpt-image-2",
  }),
  appPassword: process.env.APP_PASSWORD,
});

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.resolve(currentDirectory, "../dist");

try {
  await access(publicDirectory);
  await app.register(fastifyStatic, {
    root: publicDirectory,
    wildcard: false,
  });
  app.setNotFoundHandler((_request, reply) => {
    reply.sendFile("index.html");
  });
} catch {
  app.log.warn("Frontend build not found; API-only mode enabled");
}

const port = Number(process.env.PORT ?? 3000);
await app.listen({ host: "0.0.0.0", port });
