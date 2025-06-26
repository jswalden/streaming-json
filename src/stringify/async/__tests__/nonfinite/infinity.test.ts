import { describe, expect, test } from "vitest";
import { fullStreamingResult } from "../fullStreamingResult.js";

describe("infinity", async () => {
  test("+∞", async () => {
    await expect(fullStreamingResult(Number.POSITIVE_INFINITY, "")).resolves.toBe("null");
  });
  test("-∞", async () => {
    await expect(fullStreamingResult(Number.NEGATIVE_INFINITY, "")).resolves.toBe("null");
  });

  test("+∞ as property value", async () => {
    await expect(fullStreamingResult({ x: Number.POSITIVE_INFINITY }, "")).resolves.toBe('{"x":null}');
  });
  test("-∞ as property value", async () => {
    await expect(fullStreamingResult({ x: Number.NEGATIVE_INFINITY }, "")).resolves.toBe('{"x":null}');
  });
});
