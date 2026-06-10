import { describe, expect, it, vi } from "vitest";

import { createTaskInterpreter } from "../src/server/interpreter";

describe("task interpreter", () => {
  it("uses gpt-5.4-nano to turn conversational requests into image tasks", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  tasks: [{ imageNumber: 1, instruction: "清除图片中的文字" }],
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const interpret = createTaskInterpreter({
      apiKey: "secret-key",
      baseUrl: "https://llm-api.net",
      model: "gpt-5.4-nano",
      fetchImpl,
    });

    const tasks = await interpret({
      instruction: "清除图1文字",
      imageCount: 3,
    });

    expect(tasks).toEqual([
      { imageNumber: 1, instruction: "清除图片中的文字" },
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://llm-api.net/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer secret-key",
        }),
      }),
    );
    const request = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(request.model).toBe("gpt-5.4-nano");
    expect(request.messages[1].content).toContain("清除图1文字");
    expect(request.messages[1].content).toContain("共上传了 3 张图片");
  });

  it("rejects model output that references a missing image", async () => {
    const interpret = createTaskInterpreter({
      apiKey: "secret-key",
      baseUrl: "https://llm-api.net",
      model: "gpt-5.4-nano",
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    tasks: [{ imageNumber: 4, instruction: "清除文字" }],
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    });

    await expect(
      interpret({ instruction: "清除图4文字", imageCount: 3 }),
    ).rejects.toThrow("AI 理解结果引用了不存在的图片 4");
  });
});
