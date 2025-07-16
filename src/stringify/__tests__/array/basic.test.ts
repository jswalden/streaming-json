import { describe, expect, test } from "vitest";
import { stringify } from "../../../index.js";

describe("stringify array fragmenting", () => {
  test("single element array", () => {
    const it = stringify([5], null, "");

    expect([...it]).toEqual(["[", "5", "]"]);
  });

  test("single (filtered) element array", () => {
    const it = stringify([Symbol.iterator], null, "");

    expect([...it]).toEqual(["[", "null", "]"]);
  });

  test("single (filtered) element array pretty", () => {
    const it = stringify([Symbol.iterator], null, 2);

    expect([...it]).toEqual(["[\n  ", "null", "\n]"]);
  });

  test("two element array", () => {
    const it = stringify([5, 7], null, "");

    expect([...it]).toEqual(["[", "5", ",", "7", "]"]);
  });

  test("two (filtered) element array", () => {
    const it = stringify([Symbol.iterator, Symbol.iterator], null, "");

    expect([...it]).toEqual(["[", "null", ",", "null", "]"]);
  });

  test("two (filtered) element array pretty", () => {
    const it = stringify([Symbol.iterator, Symbol.iterator], null, 2);

    expect([...it]).toEqual(["[\n  ", "null", ",\n  ", "null", "\n]"]);
  });
});
