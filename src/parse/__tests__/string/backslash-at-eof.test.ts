import { expect, test } from "vitest";
import { StreamingJSONParser } from "../../parser.js";

test("end of fragments after backslash in string", () => {
  const parser = new StreamingJSONParser();
  expect(parser.done()).toBe(false);

  parser.add('"\\');
  expect(parser.done()).toBe(false);

  expect(() => parser.finish()).toThrowErrorMatching(SyntaxError, "Incomplete escape sequence");
});
