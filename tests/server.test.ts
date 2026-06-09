import { describe, expect, it, vi } from "vitest";

import { buildApp } from "../src/server/app";

function multipartBody(fields: Record<string, string>, files: Buffer[]) {
  const boundary = "----image-task-studio-test";
  const chunks: Buffer[] = [];

  for (const [name, value] of Object.entries(fields)) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
      ),
    );
  }

  files.forEach((file, index) => {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="images"; filename="image-${index + 1}.png"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      file,
      Buffer.from("\r\n"),
    );
  });
  chunks.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    body: Buffer.concat(chunks),
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
  };
}

describe("server API", () => {
  it("protects the app when a private password is configured", async () => {
    const app = buildApp({
      processImage: vi.fn(),
      appPassword: "private-pass",
    });

    const unauthorized = await app.inject({
      method: "GET",
      url: "/api/health",
    });
    const authorized = await app.inject({
      method: "GET",
      url: "/api/health",
      headers: {
        authorization: `Basic ${Buffer.from("studio:private-pass").toString("base64")}`,
      },
    });

    expect(unauthorized.statusCode).toBe(401);
    expect(unauthorized.headers["www-authenticate"]).toContain("Basic");
    expect(authorized.statusCode).toBe(200);
  });

  it("parses numbered instructions", async () => {
    const app = buildApp({ processImage: vi.fn() });
    const response = await app.inject({
      method: "POST",
      url: "/api/parse",
      payload: {
        instruction: "第1张去掉水印。第2到第3张删除顶部文字。",
        imageCount: 3,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      tasks: [
        { imageNumber: 1, instruction: "去掉水印" },
        { imageNumber: 2, instruction: "删除顶部文字" },
        { imageNumber: 3, instruction: "删除顶部文字" },
      ],
    });
  });

  it("processes each selected image with its own instruction", async () => {
    const processImage = vi
      .fn()
      .mockResolvedValueOnce({ url: "https://example.com/one.png" })
      .mockResolvedValueOnce({ url: "https://example.com/two.png" });
    const app = buildApp({ processImage });
    const multipart = multipartBody(
      {
        tasks: JSON.stringify([
          { imageNumber: 1, instruction: "去掉右下角水印" },
          { imageNumber: 2, instruction: "删除顶部文字" },
        ]),
      },
      [Buffer.from("first"), Buffer.from("second")],
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/process",
      payload: multipart.body,
      headers: multipart.headers,
    });

    expect(response.statusCode).toBe(200);
    expect(processImage).toHaveBeenCalledTimes(2);
    expect(processImage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        filename: "image-1.png",
        instruction: "去掉右下角水印",
      }),
    );
    expect(response.json().results).toEqual([
      { imageNumber: 1, url: "https://example.com/one.png" },
      { imageNumber: 2, url: "https://example.com/two.png" },
    ]);
  });

  it("rejects more than ten uploaded images", async () => {
    const app = buildApp({ processImage: vi.fn() });
    const files = Array.from({ length: 11 }, (_, index) =>
      Buffer.from(`image-${index}`),
    );
    const multipart = multipartBody(
      {
        tasks: JSON.stringify([
          { imageNumber: 1, instruction: "去掉水印" },
        ]),
      },
      files,
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/process",
      payload: multipart.body,
      headers: multipart.headers,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().message).toContain("最多上传 10 张图片");
  });
});
