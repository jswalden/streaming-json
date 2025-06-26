import { describe, expect, test } from "vitest";

describe("verify the custom matcher for SyntaxError-with-message works", () => {
  test("matcher string, does match", () => {
    expect(() => {
      throw new SyntaxError("password");
    }).toThrowErrorMatching(SyntaxError, "sword");
  });

  test("matcher string, doesn't match, wrong message thrown", () => {
    expect(() => {
      throw new SyntaxError("dagger");
    }).not.toThrowErrorMatching(SyntaxError, "sword");
  });

  test("matcher string, doesn't match, wrong type thrown", () => {
    expect(() => {
      throw new TypeError("sword");
    }).not.toThrowErrorMatching(SyntaxError, "sword");
  });

  test("matcher string, doesn't match, wrong type/message thrown", () => {
    expect(() => {
      throw new TypeError("dagger");
    }).not.toThrowErrorMatching(SyntaxError, "sword");
  });

  test("matcher string, doesn't match, no error thrown", () => {
    expect(() => {
      // don't throw
    }).not.toThrowErrorMatching(SyntaxError, "sword");
  });

  test("matcher regexp, does match", () => {
    expect(() => {
      throw new SyntaxError("password?");
    }).toThrowErrorMatching(SyntaxError, /^.+sword.+$/);
  });

  test("matcher regexp, doesn't match, wrong message thrown", () => {
    expect(() => {
      throw new SyntaxError("dagger");
    }).not.toThrowErrorMatching(SyntaxError, /sword/);
  });

  test("matcher regexp, doesn't match, wrong type thrown", () => {
    expect(() => {
      throw new TypeError("sword");
    }).not.toThrowErrorMatching(SyntaxError, /sword/);
  });

  test("matcher regexp, doesn't match, wrong type/message thrown", () => {
    expect(() => {
      throw new TypeError("dagger");
    }).not.toThrowErrorMatching(SyntaxError, /sword/);
  });

  test("matcher regexp, doesn't match, no error thrown", () => {
    expect(() => {
      // don't throw
    }).not.toThrowErrorMatching(SyntaxError, /sword/);
  });
});
