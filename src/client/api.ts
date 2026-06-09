import type { ImageTask } from "../shared/types";

type ProcessResult = {
  imageNumber: number;
  url?: string;
  base64?: string;
};

async function readJson(response: Response) {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message ?? "请求失败");
  }
  return payload;
}

export async function parseTasks(
  instruction: string,
  imageCount: number,
): Promise<ImageTask[]> {
  const response = await fetch("/api/parse", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ instruction, imageCount }),
  });
  const payload = await readJson(response);
  return payload.tasks;
}

export async function processImages(
  files: File[],
  tasks: ImageTask[],
): Promise<ProcessResult[]> {
  const form = new FormData();
  form.set("tasks", JSON.stringify(tasks));
  files.forEach((file) => form.append("images", file, file.name));

  const response = await fetch("/api/process", {
    method: "POST",
    body: form,
  });
  const payload = await readJson(response);
  return payload.results;
}

