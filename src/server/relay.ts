import type { ProcessImage } from "./app.ts";

type RelayOptions = {
  apiKey: string;
  baseUrl: string;
  model: string;
  fetchImpl?: typeof fetch;
};

export function createRelayProcessor(options: RelayOptions): ProcessImage {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl.replace(/\/+$/, "");

  return async ({ buffer, filename, mimeType, instruction }) => {
    const form = new FormData();
    form.set("model", options.model);
    form.set(
      "prompt",
      `${instruction}。只修改要求涉及的内容，保持人物、构图、尺寸和其他区域不变，自然补全背景。`,
    );
    form.set("image", new Blob([buffer], { type: mimeType }), filename);
    form.set("response_format", "url");

    const response = await fetchImpl(`${baseUrl}/v1/images/edits`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
      },
      body: form,
    });

    const payload = (await response.json()) as {
      data?: Array<{ url?: string; b64_json?: string }>;
      error?: { message?: string };
      message?: string;
    };

    if (!response.ok) {
      const message = payload.error?.message ?? payload.message ?? response.statusText;
      throw new Error(`中转站请求失败：${message}`);
    }

    const image = payload.data?.[0];
    if (!image?.url && !image?.b64_json) {
      throw new Error("中转站没有返回生成图片");
    }

    return image.url ? { url: image.url } : { base64: image.b64_json };
  };
}
