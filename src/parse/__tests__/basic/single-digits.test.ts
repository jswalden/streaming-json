import { describe, expect, test } from "vitest";
import { StreamingJSONParser } from "../../parser.js";

describe("single-digit decimal numbers", () => {
  for (let i = 0; i < 10; i++) {
    test(`the number ${i}`, () => {
      const parser = new StreamingJSONParser();
      expect(parser.done()).toBe(false);

      parser.add(`${i}`);
      expect(parser.done()).toBe(false);

      const res = parser.finish();
      expect(res).toBe(i);

      expect(() => parser.finish()).toThrowErrorMatching(Error, "Can't call finish: ");
    });
  }
});
