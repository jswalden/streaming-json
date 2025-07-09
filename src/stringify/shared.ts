// The algorithms implemented here are patterned upon the `JSON.stringify`
// [spec algorithm](https://tc39.es/ecma262/#sec-json.stringify).  However, the
// spec algorithm naively serializes object property values to string (or
// `undefined` if serialization is disallowed) before serializing the property
// name (if the value didn't serialize to `undefined`), which would mess up
// order of emitting.
//
// So we steal a page from Mozilla's (and likely others') JSON stringify
// <https://searchfox.org/mozilla-central/rev/ec8a326713f60dec138a3e3383b03ac739870fc7/js/src/builtin/JSON.cpp#1456>
// and implement an equivalent two-step: first preprocess values to either a
// serializable value or `undefined`, then handle `undefined` specially
// or another value generally at each call site.  Thus for object properties we
// check for `undefined` and skip the property name/value if so, else emit prior
// separation/property name/colon and then serialize the preprocessed value.
// And for array elements and top-level values we check for `undefined` and emit
// `null` if so, otherwise emit the preprocessed value.

import { ArrayContains, Pop, Push } from "../stdlib/array.js";
import { ExtractBigIntData } from "../stdlib/bigint.js";
import { ExtractBooleanData } from "../stdlib/boolean.js";
import { ToNumber } from "../stdlib/number.js";
import { ReflectApply } from "../stdlib/reflect.js";
import { ToString } from "../stdlib/string.js";

/**
 * The type of all values that can be stringified.
 *
 * This type is rough and inexact.  It's only used to leverage the type system
 * to distinguish values that pass the `preprocessValue` gauntlet and are
 * serializable from those that do not and cause a corresponding property to be
 * omitted from object serialization.
 */
export type StringifiableValue = boolean | number | string | null | object;

type PropertyList = readonly string[];

/**
 * Accept properties lists including both strings and numbers as the spec does,
 * but don't go any further than that.
 */
type ReplacerPropertyList = readonly (string | number)[];

/**
 * The replacer function type.
 *
 * The `holder` can be restricted to `object`.  All keys are `string`, even
 * array element indexes.  And each value being stringified has `unknown` type.
 */
type ReplacerFunction = ((this: object, key: string, value: unknown) => unknown);

/**
 * The combined property-list or replacer-function type accepted by the
 * `stringify` functions as replacer.
 */
export type Replacer = ReplacerPropertyList | ReplacerFunction;

function toPropertyList(array: ReplacerPropertyList): PropertyList {
  const propertyList: string[] = [];
  const len = array.length;
  for (let k = 0; k < len; k++) {
    const v = array[k];
    Push(propertyList, typeof v === "number" ? ToString(v) : v);
  }
  return propertyList;
}

export class EmitterBase {
  protected stack: object[] = [];

  protected indent = "";

  protected readonly replacer: PropertyList | ReplacerFunction | undefined;

  protected readonly gap: string;

  constructor(replacer: Replacer | undefined, space: string | number) {
    this.replacer = typeof replacer === "object" ? toPropertyList(replacer) : replacer;

    this.gap = typeof space === "string"
      ? space.slice(0, 10)
      : space >= 1
        ? " ".repeat(Math.min(Math.trunc(space), 10))
        : "";
  }

  /**
   * If a property whose value is `value` would be excluded from JSON
   * stringification -- if `value` is `undefined`, a symbol, or a callable
   * object value --  return `undefined`.
   *
   * If attempting to stringify `value` must throw a `TypeError` (i.e. it's a
   * `bigint` or a boxed `bigint`), throw that `TypeError`.
   *
   * Otherwise return a value that JSON stringifies as `value` will.  (This will
   * substitute in the result of a `toJSON` function call and unbox boxed
   * primitives.)
   *
   * Callers potentially stringifying `value` should call this function, handle
   * `undefined` appropriately for the context if it's returned, or else
   * stringify the returned value as per context.
   *
   * In the spec, `holder` is always an object -- even if it can't be observed
   * because `replacer` isn't a function.  We relax this to allow `null` when
   * `holder` can't be observed.
   */
  protected preprocessValue(
    value: unknown,
    holder: object | null,
    key: string,
  ): StringifiableValue | undefined {
    switch (typeof value) {
      // @ts-expect-error intentional fallthrough
      case "object":
        if (value === null)
          break;
      case "function":
      case "bigint":
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- required by spec
        const toJSON = (value as any).toJSON as unknown;
        if (typeof toJSON === "function")
          value = ReflectApply(toJSON, value, [key]);
        break;
      default:
        break;
    }

    if (typeof this.replacer === "function")
      value = ReflectApply(this.replacer, holder, [key, value]);

    if (value === null)
      return value;

    if (typeof value === "object") {
      if (value instanceof Number)
        value = ToNumber(value);
      else if (value instanceof String)
        value = ToString(value);
      else if (value instanceof Boolean)
        value = ExtractBooleanData(value);
      else if (value instanceof BigInt)
        value = ExtractBigIntData(value);
    }

    switch (typeof value) {
      case "string":
      case "number":
      case "boolean":
      case "object":
        return value;
      case "symbol":
      case "undefined":
      case "function":
        return undefined;
      case "bigint":
        throw new TypeError("Can't serialize bigint");
    }
  }

  protected pushAcyclicStack(obj: object): void {
    // Accept quadratic cost for deep object graphs until someone complains.
    // (Mozilla's `JSON.stringify` is quadratic in this fashion, so there's
    // reason to ignore this concern now.)
    if (ArrayContains(this.stack, obj))
      throw new TypeError("Attempting to stringify a cyclic object");

    Push(this.stack, obj);
  }

  protected popStack(): void {
    Pop(this.stack);
  }
};

/**
 * The string length at which emits of potentially unbounded length get broken
 * up.
 */
export const Quantum = 1024;
