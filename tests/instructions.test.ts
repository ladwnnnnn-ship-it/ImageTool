import { describe, expect, it } from "vitest";

import { parseInstruction } from "../src/shared/instructions";

describe("parseInstruction", () => {
  it("assigns separate instructions to a single image and a range", () => {
    expect(
      parseInstruction(
        "第1张去掉右下角水印。第3张到第5张去掉顶部文字，保持人物不变。",
        5,
      ),
    ).toEqual([
      { imageNumber: 1, instruction: "去掉右下角水印" },
      { imageNumber: 3, instruction: "去掉顶部文字，保持人物不变" },
      { imageNumber: 4, instruction: "去掉顶部文字，保持人物不变" },
      { imageNumber: 5, instruction: "去掉顶部文字，保持人物不变" },
    ]);
  });

  it("supports comma-separated image numbers", () => {
    expect(parseInstruction("第1、3、5张去掉左上角标志", 5)).toEqual([
      { imageNumber: 1, instruction: "去掉左上角标志" },
      { imageNumber: 3, instruction: "去掉左上角标志" },
      { imageNumber: 5, instruction: "去掉左上角标志" },
    ]);
  });

  it("supports Chinese image numbers from one to ten", () => {
    expect(parseInstruction("第一张去掉水印。第三张到第五张删除文字。", 5)).toEqual([
      { imageNumber: 1, instruction: "去掉水印" },
      { imageNumber: 3, instruction: "删除文字" },
      { imageNumber: 4, instruction: "删除文字" },
      { imageNumber: 5, instruction: "删除文字" },
    ]);
  });

  it("supports all images and exclusions", () => {
    expect(parseInstruction("除第2张外，其他图片都去掉底部水印", 4)).toEqual([
      { imageNumber: 1, instruction: "去掉底部水印" },
      { imageNumber: 3, instruction: "去掉底部水印" },
      { imageNumber: 4, instruction: "去掉底部水印" },
    ]);
  });

  it("rejects image references outside the uploaded image count", () => {
    expect(() => parseInstruction("第6张去掉水印", 5)).toThrow(
      "指令引用了不存在的图片 6",
    );
  });

  it("rejects instructions without an image selector", () => {
    expect(() => parseInstruction("把右下角水印去掉", 3)).toThrow(
      "请说明要处理第几张图片",
    );
  });
});
