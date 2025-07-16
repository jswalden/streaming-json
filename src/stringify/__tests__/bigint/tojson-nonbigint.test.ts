import { expect, test, vitest } from "vitest";
import { stringify } from "../../../index.js";

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

    const iter = stringify(17n, undefined, "  ");

    expect(toJSON).toBeCalledTimes(0);

    expect(iter.next()).toEqual({ done: false, value: '"42"' });
    expect(toJSON).toHaveBeenCalledExactlyOnceWith("");

    expect(iter.next()).toEqual({ done: true });
  } finally {
    delete ProtoWithJSON.toJSON;
  }
});
