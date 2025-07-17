import { describe, expect, test } from "vitest";
import { StreamingJSONParser } from "../../../index.js";
import { stringifyToString } from "../helpers.js";

describe("roundtrip complex values", () => {
  test.each([
    [{ desc: "array of varied contents", value: [[2, { m: 5, obj: {}, q: { n: 4.67 } }]] }],
    [{ desc: "multilevel multi-property objects", value: { x: 1, y: { m: 2, z: { a: true }, q: 3 } } }],
  ])("$desc", ({ value }) => {
    const stringified = stringifyToString(value, null, "  ");

    const parser = new StreamingJSONParser();
    for (const c of stringified)
      parser.add(c);

    const roundtripped = parser.finish();

    expect(roundtripped).toEqual(value);
  });
});
