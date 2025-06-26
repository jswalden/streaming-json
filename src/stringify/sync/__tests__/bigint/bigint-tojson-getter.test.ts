import { expect, test, vitest } from "vitest";
import { stringify } from "../../../../index.js";

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

    const emit = vitest.fn<Parameters<typeof stringify>[3]>(() => {
      // do nothing
    });
    stringify(42n, undefined, "  ", emit);

    expect(get).toHaveBeenCalledExactlyOnceWith();
    expect(emit).toHaveBeenCalledExactlyOnceWith("33");
  } finally {
    delete ProtoWithJSON.toJSON;
  }
});
