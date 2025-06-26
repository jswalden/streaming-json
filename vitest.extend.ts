import { expect } from "vitest";

expect.extend({
  toThrowErrorMatching<C extends ErrorConstructor>(f: unknown, ctor: C, expected: string | RegExp) {
    if (typeof f !== "function")
      throw new Error("Must expect a function to call");

    const { isNot } = this;

    let behavior: string;
    let threw: Error | null = null;
    try {
      (f as () => void)();
      behavior = "didn't throw";
    } catch (e) {
      if (e instanceof ctor && e.name === ctor.name) {
        threw = e;
        behavior = `threw ${e.name}`;
      } else {
        behavior = `threw not a ${ctor.name}`;
      }
    }

    let pass = false;
    if (threw !== null) {
      const actualMessage = threw.message;
      pass = typeof expected === "string"
        ? actualMessage.includes(expected)
        : expected.test(actualMessage);
    }

    return {
      pass,
      message: pass
        ? () => `expected ${f as any} to ${isNot ? "not throw" : "throw"} a ${ctor.name} with message matching ${expected.toString()}`
        : () => `expected ${f as any} to ${isNot ? "not throw" : "throw"} a ${ctor.name} with message matching ${expected.toString()} (actual behavior: ${behavior})`,
    };
  },
});
