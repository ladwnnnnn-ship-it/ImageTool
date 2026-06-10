import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "../src/client/App";

afterEach(() => {
  vi.unstubAllGlobals();
});

function imageFile(name: string) {
  return new File(["image"], name, { type: "image/png" });
}

describe("App", () => {
  it("numbers uploaded images and limits the workspace to ten", async () => {
    render(<App />);
    const input = screen.getByLabelText("选择图片");
    const files = Array.from({ length: 11 }, (_, index) =>
      imageFile(`${index + 1}.png`),
    );

    fireEvent.change(input, { target: { files } });

    expect(await screen.findByText("图片 10")).toBeInTheDocument();
    expect(screen.queryByText("图片 11")).not.toBeInTheDocument();
    expect(screen.getByText("一次最多处理 10 张图片")).toBeInTheDocument();
  });

  it("shows the parsed per-image task list before processing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            tasks: [
              { imageNumber: 1, instruction: "去掉右下角水印" },
              { imageNumber: 2, instruction: "删除顶部文字" },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    render(<App />);
    fireEvent.change(screen.getByLabelText("选择图片"), {
      target: { files: [imageFile("one.png"), imageFile("two.png")] },
    });
    fireEvent.change(screen.getByLabelText("修图要求"), {
      target: {
        value: "第1张去掉右下角水印。第2张删除顶部文字。",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "AI 理解任务" }));

    await waitFor(() => {
      expect(screen.getAllByText("去掉右下角水印")).toHaveLength(2);
      expect(screen.getAllByText("删除顶部文字")).toHaveLength(2);
    });
    expect(
      screen.getByRole("button", { name: "确认并开始处理" }),
    ).toBeEnabled();
    expect(
      screen.getByText(/由 gpt-5\.4-nano 理解/),
    ).toBeInTheDocument();
  });
});
