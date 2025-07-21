import { describe, expect, test } from "vitest";
import { HexDigitToNumber, Unicode } from "./unicode.js";

describe("HexDigitToNumber", () => {
  test.each([
    [{ desc: "space", n: Unicode.SP, result: null }],
    [{ desc: "0", n: Unicode.Zero, result: 0x0 }],
    [{ desc: "9", n: Unicode.Nine, result: 0x9 }],
    [{ desc: "a", n: Unicode.SmallLetterA, result: 0x0a }],
    [{ desc: "f", n: Unicode.SmallLetterF, result: 0x0f }],
    [{ desc: "g", n: "g".charCodeAt(0), result: null }],
    [{ desc: "A", n: Unicode.LargeLetterA, result: 0x0a }],
    [{ desc: "F", n: Unicode.LargeLetterF, result: 0x0f }],
    [{ desc: "G", n: "G".charCodeAt(0), result: null }],
  ])("$desc", ({ n, result }) => {
    expect(HexDigitToNumber(String.fromCharCode(n), 0)).toBe(result);
  });
});
