import { describe, expect, test } from "vitest";
import { StreamingJSONParser } from "../../../index.js";

describe("replace entire JSON result", () => {
  test("example", () => {
    const parser = new StreamingJSONParser();

    parser.add("{");
    parser.add('"property');
    parser.add('Name": 1');
    parser.add('7, "complex": {');
    parser.add("}}");

    const result = parser.finish(function () {
      expect(parser.done()).toBe(true);
      expect(this).not.toBeNull();
      expect(this).toBeTypeOf("object");
      return 42;
    });
    expect(result).toBe(42);
  });
});
