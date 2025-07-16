import { expect, test, vitest } from "vitest";
import { stringify } from "../../../index.js";

const BigIntPrototype = BigInt.prototype;

type ToJSON = (this: unknown, key: string) => unknown;
type BigIntProtoWithToJSON = { toJSON?: ToJSON } & typeof BigIntPrototype;

const ProtoWithJSON = BigIntPrototype as BigIntProtoWithToJSON;

test("primitive bigint toJSON getter invocation", () => {
  try {
    const get = vitest.fn<() => unknown>(function (this: unknown) {
      expect(this).toBe(42n);
      return () => 33;
    });

    Object.defineProperty(ProtoWithJSON, "toJSON", {
      get,
      enumerable: true,
      configurable: true,
    });

    const iter = stringify(42n, undefined, "  ");
    expect(iter.next()).toEqual({ done: false, value: "33" });

    expect(get).toHaveBeenCalledExactlyOnceWith();

    expect(iter.next()).toEqual({ done: true });
  } finally {
    delete ProtoWithJSON.toJSON;
  }
});
