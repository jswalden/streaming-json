import { expect, test, vitest } from "vitest";
import { stringify } from "../../../../index.js";

const BigIntPrototype = BigInt.prototype;

type ToJSON = (this: unknown, key: string) => unknown;
type BigIntProtoWithToJSON = { toJSON?: ToJSON } & typeof BigIntPrototype;

const ProtoWithJSON = BigIntPrototype as BigIntProtoWithToJSON;

test("primitive bigint toJSON to something else", () => {
  try {
    let i = 42;
    const toJSON = vitest.fn<ToJSON>(function (this: unknown) {
      expect(this).toEqual(17n);
      return String(i++);
    });

    ProtoWithJSON.toJSON = toJSON;

    const emit = vitest.fn<Parameters<typeof stringify>[3]>(() => {
      // do nothing
    });
    stringify(17n, undefined, "  ", emit);

    expect(toJSON).toHaveBeenCalledExactlyOnceWith("");
    expect(emit).toHaveBeenCalledExactlyOnceWith('"42"');
  } finally {
    delete ProtoWithJSON.toJSON;
  }
});
