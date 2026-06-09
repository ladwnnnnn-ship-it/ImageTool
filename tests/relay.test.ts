import { describe, expect, it, vi } from "vitest";

import { createRelayProcessor } from "../src/server/relay";

describe("relay processor", () => {
  it("submits an OpenAI-compatible image edit request", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ data: [{ url: "https://example.com/result.png" }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const processImage = createRelayProcessor({
      apiKey: "secret-key",
      baseUrl: "https://llm-api.net",
      model: "gpt-image-1",
      fetchImpl,
    });

    const result = await processImage({
      buffer: Buffer.from("image"),
      filename: "source.png",
      mimeType: "image/png",
      instruction: "去掉右下角水印，保持其他内容不变",
    });

    expect(result).toEqual({ url: "https://example.com/result.png" });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://llm-api.net/v1/images/edits",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer secret-key" },
      }),
    );
    const body = fetchImpl.mock.calls[0][1].body as FormData;
    expect(body.get("model")).toBe("gpt-image-1");
    expect(body.get("prompt")).toContain("去掉右下角水印");
    expect(body.get("image")).toBeInstanceOf(Blob);
  });

  it("surfaces relay error messages", async () => {
    const processImage = createRelayProcessor({
      apiKey: "secret-key",
      baseUrl: "https://llm-api.net/",
      model: "gpt-image-1",
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "余额不足" } }), {
          status: 402,
        }),
      ),
    });

    await expect(
      processImage({
        buffer: Buffer.from("image"),
        filename: "source.png",
        mimeType: "image/png",
        instruction: "去掉水印",
      }),
    ).rejects.toThrow("中转站请求失败：余额不足");
  });
});
