import { z } from "zod";

import type { ImageTask } from "../shared/types.ts";

type InterpretInput = {
  instruction: string;
  imageCount: number;
};

type TaskInterpreter = (input: InterpretInput) => Promise<ImageTask[]>;

type InterpreterOptions = {
  apiKey: string;
  baseUrl: string;
  model: string;
  fetchImpl?: typeof fetch;
};

const responseSchema = z.object({
  tasks: z
    .array(
      z.object({
        imageNumber: z.number().int().min(1),
        instruction: z.string().trim().min(1),
      }),
    )
    .min(1),
});

function parseModelJson(content: string) {
  const withoutFence = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(withoutFence);
}

export function createTaskInterpreter(
  options: InterpreterOptions,
): TaskInterpreter {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl.replace(/\/+$/, "");

  return async ({ instruction, imageCount }) => {
    const response = await fetchImpl(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: options.model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "你是批量图片编辑任务分配器。",
              "理解用户的自然语言，包括“图1”“图片一”“1号图”“前3张”“后两张”“其余图片”“全部”等口语。",
              "把要求展开为每张图片一条任务。",
              "只输出 JSON，格式为 {\"tasks\":[{\"imageNumber\":1,\"instruction\":\"明确、可直接交给图片编辑模型的中文要求\"}]}。",
              "不要添加用户没有要求的修改。不要输出不存在的图片编号。",
              "同一张图片若有多个要求，请合并成一条 instruction。",
            ].join("\n"),
          },
          {
            role: "user",
            content: `共上传了 ${imageCount} 张图片，编号为 1 到 ${imageCount}。\n用户要求：${instruction}`,
          },
        ],
      }),
    });

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
      message?: string;
    };

    if (!response.ok) {
      const message =
        payload.error?.message ?? payload.message ?? response.statusText;
      throw new Error(`AI 理解请求失败：${message}`);
    }

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("AI 没有返回任务理解结果");
    }

    let parsed: z.infer<typeof responseSchema>;
    try {
      parsed = responseSchema.parse(parseModelJson(content));
    } catch {
      throw new Error("AI 返回的任务格式无效，请重新描述需求");
    }

    const merged = new Map<number, string[]>();
    for (const task of parsed.tasks) {
      if (task.imageNumber > imageCount) {
        throw new Error(
          `AI 理解结果引用了不存在的图片 ${task.imageNumber}`,
        );
      }
      const instructions = merged.get(task.imageNumber) ?? [];
      instructions.push(task.instruction);
      merged.set(task.imageNumber, instructions);
    }

    return Array.from(merged.entries())
      .map(([imageNumber, instructions]) => ({
        imageNumber,
        instruction: Array.from(new Set(instructions)).join("；"),
      }))
      .sort((left, right) => left.imageNumber - right.imageNumber);
  };
}

export type { InterpretInput, TaskInterpreter };
