import { describe, expect, test } from "vitest";
import { StreamingJSONParser } from "../../index.js";

describe("example StreamingJSONParser usage in README.md", () => {
  test("example", () => {
    const parser = new StreamingJSONParser();

    parser.add("{");
    parser.add('"property');
    parser.add('Name": 1');
    parser.add('7, "complex": {');
    parser.add("}}");

    const result = parser.finish();
    expect(result).toEqual({ propertyName: 17, complex: {} });
  });
});
