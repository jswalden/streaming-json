import type { Equal, Expect } from "type-testing";
import { describe, expect, test } from "vitest";
import * as StreamingJSON from "./index.js";
import { type JSONValue, type Reviver, StreamingJSONParser } from "./index.js";
import type { NoReplacer, ReplacerFunction, ReplacerPropertyList } from "./stringify/stringify.js";

// @ts-expect-error Verify that type-testing in test files works.
type test_FailingTypeTest = ExpectFalse<true>;

describe("default export tests", () => {
  test("stringify", () => {
    const stringify = StreamingJSON.stringify;
    expect(typeof stringify).toBe("function");

    type test_stringifyArgs = Expect<
      Equal<
        Parameters<typeof stringify>,
        [unknown, ReplacerFunction | ReplacerPropertyList | NoReplacer, number | string]
      >
    >;

    type test_stringifyReturn = Expect<
      Equal<
        ReturnType<typeof stringify>,
        IterableIterator<string, void, void>
      >
    >;
  });

  type PrimitiveJSON = boolean | number | string | null;

  type test_PrimitiveTypesInJSONValue = Expect<
    Equal<
      Extract<PrimitiveJSON | PrimitiveJSON[], JSONValue>,
      PrimitiveJSON | PrimitiveJSON[]
    >
  >;
  type test_ArrayOfPrimitiveTypeInJSONValue = Expect<
    Equal<
      Extract<PrimitiveJSON[], JSONValue>,
      PrimitiveJSON[]
    >
  >;
  // Enough sanity checking, no need to reiterate the full recursive type.

  // The `reviver` interface and operation is well more than a bit naff, so the
  // example we use here is more than a bit artificial.  🤷
  const _reviver: Reviver<17> = function (this: unknown, _p: string, _val: JSONValue): 17 {
    return 17;
  };

  test("StreamingJSONParser", () => {
    expect(typeof StreamingJSONParser).toBe("function");

    type test_StreamingJSONParserCtorHasNoParameters = Expect<
      Equal<
        ConstructorParameters<typeof StreamingJSONParser>,
        []
      >
    >;

    const p = new StreamingJSONParser();

    // eslint-disable-next-line @typescript-eslint/unbound-method, @typescript-eslint/no-unused-vars
    const { add, done } = p;

    type test_addTakesOneString = Expect<
      Equal<
        Parameters<typeof add>,
        [string]
      >
    >;
    type test_addReturnsVoid = Expect<
      Equal<
        ReturnType<typeof add>,
        void
      >
    >;

    type test_doneTakesNoArgs = Expect<
      Equal<
        Parameters<typeof done>,
        []
      >
    >;
    type test_doneReturnsBoolean = Expect<
      Equal<
        ReturnType<typeof done>,
        boolean
      >
    >;

    {
      // The type of `finish` depends on the arguments passed to it, so we must
      // actually put it through its paces to verify typing.

      // No arguments.
      {
        const p = new StreamingJSONParser();
        p.add("true");

        const _result = p.finish();

        type test_finishNoArgsReturnsJSONValue = Expect<
          Equal<
            typeof _result,
            JSONValue
          >
        >;
      }

      // No `(reviver: undefined)` overload is exposed (although it would work
      // if you disabled the compile error or called it that way from untyped
      // JS).
      {
        const p = new StreamingJSONParser();
        p.add("true");

        // @ts-expect-error No such overload defined!
        p.finish(undefined);
      }

      // `reviver` supplied.
      {
        const p = new StreamingJSONParser();
        p.add("true");

        const _result = p.finish(function (this: unknown, _prop: string, _val: unknown): 42 {
          return 42;
        });

        type test_returnTypeOfFinishWithReviver = Expect<
          Equal<
            typeof _result,
            42
          >
        >;
      }
    }
  });
});
