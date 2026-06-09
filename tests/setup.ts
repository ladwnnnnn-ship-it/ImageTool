import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);

Object.defineProperty(URL, "createObjectURL", {
  value: (file: File) => `blob:${file.name}`,
  writable: true,
});

Object.defineProperty(URL, "revokeObjectURL", {
  value: () => undefined,
  writable: true,
});
