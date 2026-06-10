import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { z } from "zod";

import { parseInstruction } from "../shared/instructions.ts";
import type { TaskInterpreter } from "./interpreter.ts";

const taskSchema = z.object({
  imageNumber: z.number().int().min(1).max(10),
  instruction: z.string().trim().min(1),
});

type ProcessImageInput = {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  instruction: string;
};

type ProcessImage = (
  input: ProcessImageInput,
) => Promise<{ url?: string; base64?: string }>;

export function buildApp(dependencies: {
  processImage: ProcessImage;
  interpretTasks?: TaskInterpreter;
  appPassword?: string;
}) {
  const app = Fastify({ logger: false });

  if (dependencies.appPassword) {
    app.addHook("onRequest", async (request, reply) => {
      if (request.url === "/api/health") {
        return;
      }
      const expected = `Basic ${Buffer.from(
        `studio:${dependencies.appPassword}`,
      ).toString("base64")}`;
      if (request.headers.authorization !== expected) {
        return reply
          .header("www-authenticate", 'Basic realm="Image Task Studio"')
          .status(401)
          .send({ message: "需要私人访问密码" });
      }
    });
  }

  app.register(multipart, {
    limits: {
      files: 11,
      fileSize: 20 * 1024 * 1024,
      fields: 4,
    },
  });

  app.setErrorHandler((error, _request, reply) => {
    const statusCode = error.statusCode && error.statusCode < 500 ? error.statusCode : 400;
    reply.status(statusCode).send({ message: error.message });
  });

  app.get("/api/health", async () => ({ ok: true }));

  app.post("/api/parse", async (request) => {
    const input = z
      .object({
        instruction: z.string().trim().min(1),
        imageCount: z.number().int().min(1).max(10),
      })
      .parse(request.body);

    const tasks = dependencies.interpretTasks
      ? await dependencies.interpretTasks(input)
      : parseInstruction(input.instruction, input.imageCount);

    return { tasks };
  });

  app.post("/api/process", async (request, reply) => {
    const images: Array<{
      buffer: Buffer;
      filename: string;
      mimeType: string;
    }> = [];
    let tasksValue = "";

    for await (const part of request.parts()) {
      if (part.type === "file") {
        images.push({
          buffer: await part.toBuffer(),
          filename: part.filename,
          mimeType: part.mimetype,
        });
      } else if (part.fieldname === "tasks") {
        tasksValue = String(part.value);
      }
    }

    if (images.length > 10) {
      return reply.status(400).send({ message: "最多上传 10 张图片" });
    }
    if (images.length === 0) {
      return reply.status(400).send({ message: "请至少上传 1 张图片" });
    }

    const tasks = z.array(taskSchema).min(1).parse(JSON.parse(tasksValue));
    for (const task of tasks) {
      if (task.imageNumber > images.length) {
        return reply.status(400).send({
          message: `任务引用了不存在的图片 ${task.imageNumber}`,
        });
      }
    }

    const results = await Promise.all(
      tasks.map(async (task) => {
        const image = images[task.imageNumber - 1];
        const result = await dependencies.processImage({
          ...image,
          instruction: task.instruction,
        });
        return { imageNumber: task.imageNumber, ...result };
      }),
    );

    return { results };
  });

  return app;
}

export type { ProcessImage, ProcessImageInput };
