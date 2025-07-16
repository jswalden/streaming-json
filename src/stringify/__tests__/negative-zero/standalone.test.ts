import { describe, expect, test } from "vitest";
import { stringifyToString } from "../tostring.js";

describe("-0", () => {
  test("primitive", () => {
    // JSON to spec loses the sign.
    expect(stringifyToString(-0, null, "")).toBe("0");
  });

  test("boxed", () => {
    // JSON to spec loses the sign.
    expect(stringifyToString(new Number(-0), null, "")).toBe("0");
  });
});
