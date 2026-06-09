import type { ImageTask } from "./types.ts";

const chineseNumbers: Record<string, string> = {
  一: "1",
  二: "2",
  两: "2",
  三: "3",
  四: "4",
  五: "5",
  六: "6",
  七: "7",
  八: "8",
  九: "9",
  十: "10",
};

function normalizeNumbers(text: string) {
  return text.replace(/[一二两三四五六七八九十]/g, (value) => chineseNumbers[value]);
}

function assertImageNumber(imageNumber: number, imageCount: number) {
  if (imageNumber < 1 || imageNumber > imageCount) {
    throw new Error(`指令引用了不存在的图片 ${imageNumber}`);
  }
}

function range(start: number, end: number): number[] {
  const lower = Math.min(start, end);
  const upper = Math.max(start, end);
  return Array.from({ length: upper - lower + 1 }, (_, index) => lower + index);
}

function parseSelector(
  clause: string,
  imageCount: number,
): { imageNumbers: number[]; instruction: string } | null {
  const exclusion = clause.match(
    /^除第(\d+)张外[，,]?(?:其他|其余)?图片都(.+)$/,
  );
  if (exclusion) {
    const excluded = Number(exclusion[1]);
    assertImageNumber(excluded, imageCount);
    return {
      imageNumbers: range(1, imageCount).filter((number) => number !== excluded),
      instruction: exclusion[2].trim(),
    };
  }

  const all = clause.match(/^(?:所有|全部|每一张|每张)图片?(?:都)?(.+)$/);
  if (all) {
    return {
      imageNumbers: range(1, imageCount),
      instruction: all[1].trim(),
    };
  }

  const selectedRange = clause.match(/^第(\d+)(?:张)?到第?(\d+)张(.+)$/);
  if (selectedRange) {
    const start = Number(selectedRange[1]);
    const end = Number(selectedRange[2]);
    range(start, end).forEach((number) => assertImageNumber(number, imageCount));
    return {
      imageNumbers: range(start, end),
      instruction: selectedRange[3].trim(),
    };
  }

  const selectedList = clause.match(/^第([\d、,，和及]+)张(.+)$/);
  if (selectedList) {
    const imageNumbers = selectedList[1]
      .split(/[、,，和及]/)
      .filter(Boolean)
      .map(Number);
    imageNumbers.forEach((number) => assertImageNumber(number, imageCount));
    return {
      imageNumbers,
      instruction: selectedList[2].trim(),
    };
  }

  return null;
}

export function parseInstruction(text: string, imageCount: number): ImageTask[] {
  const clauses = normalizeNumbers(text)
    .split(/[。；;\n]+/)
    .map((clause) => clause.trim())
    .filter(Boolean);

  const tasks: ImageTask[] = [];

  for (const clause of clauses) {
    const parsed = parseSelector(clause, imageCount);
    if (!parsed) {
      throw new Error("请说明要处理第几张图片");
    }
    for (const imageNumber of parsed.imageNumbers) {
      tasks.push({ imageNumber, instruction: parsed.instruction });
    }
  }

  return tasks.sort((left, right) => left.imageNumber - right.imageNumber);
}
