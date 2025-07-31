import type { Equal, Expect } from "type-testing";
import { ArrayFind, IsArray, Pop, Push } from "../stdlib/array.js";
import {
  ExtractBigIntData,
  ExtractBooleanData,
  HasBigIntDataSlot,
  HasBooleanDataSlot,
  HasNumberDataSlot,
  HasStringDataSlot,
} from "../stdlib/boxed.js";
import { ThrowError, ThrowTypeError } from "../stdlib/error.js";
import { JSONStringify } from "../stdlib/json-stringify.js";
import { LengthOfArrayLike } from "../stdlib/length.js";
import { Min, Truncate } from "../stdlib/math.js";
import { ToNumber } from "../stdlib/number.js";
import { EnumerableOwnPropertyKeys } from "../stdlib/object.js";
import { ReflectApply } from "../stdlib/reflect.js";
import { SetHas, SetAdd } from "../stdlib/set.js";
import { StringRepeat, StringSlice, ToString } from "../stdlib/string.js";

// This algorithm is patterned on the `JSON.stringify`
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
//
// Additionally: getting the incremental fragments out of the spec's recursive
// algorithm into an easily-consumed iterable format would require either fairly
// awkward plumbing, or resort to unaesthetic callback functions.
//
// So we implement stringification in broadly similar fashion to how we
// implement parsing: with an iterative parsing algorithm that maintains a stack
// of current tree depth.  As with parsing, the resulting code isn't entirely
// simple.  But it's not terribly much code, and JavaScript generator syntax
// handles pausing/resuming reasonably elegantly.

/**
 * The string length at which emits of potentially unbounded length get broken
 * up.
 */
export const Quantum = 1024;

/**
 * The type of all values that can be stringified.
 *
 * This type is rough and inexact.  It's only used to leverage the type system
 * to distinguish values that pass the `preprocessValue` gauntlet and are
 * serializable from those that do not and cause a corresponding property to be
 * omitted from object serialization.
 */
type StringifiableValue = boolean | number | string | null | object;

/** A list of unique property strings. */
type PropertyList = readonly string[];

/**
 * A list of all properties to include in stringification of objects encountered
 * during stringification.
 */
export type ReplacerPropertyList = readonly (string | number)[];

function toPropertyList(array: ReplacerPropertyList): PropertyList {
  const propertyList: string[] = [];
  const set = new Set<string>();
  const len = LengthOfArrayLike(array);
  for (let k = 0; k < len; k++) {
    let v = array[k];
    v = typeof v === "number" ? ToString(v) : v;
    if (!SetHas(set, v)) {
      SetAdd(set, v);
      Push(propertyList, v);
    }
  }
  return propertyList;
}

/**
 * A replacer function, applied to each object/property name/value in the
 * overall graph created during stringification.  See `JSON.stringify`
 * documentation for precise details.
 *
 * Note that when the pertinent object is an array, keys are *strings* and not
 * numerical indexes.
 */
export type ReplacerFunction = (this: object, key: string, value: unknown) => unknown;

/** No replacer. */
export type NoReplacer = undefined | null;

const enum State {
  StringifiableValue,
  FinishArrayElement,
  FindUnfilteredObjectMember,
  AfterUnfilteredObjectMember,
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type FinishArrayElement = {
  readonly state: State.FinishArrayElement;
  readonly object: readonly unknown[];
  index: number;
  readonly length: number;
  readonly priorIndent: string;
  readonly separator: string;
  readonly end: string;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type FindUnfilteredObjectMember = {
  readonly state: State.FindUnfilteredObjectMember;
  readonly object: Record<string, unknown>;
  index: number;
  readonly props: readonly string[];
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type AfterUnfilteredObjectMember = {
  readonly state: State.AfterUnfilteredObjectMember;
  readonly object: Record<string, unknown>;
  index: number;
  readonly props: readonly string[];
  readonly priorIndent: string;
  readonly colon: string;
  readonly comma: string;
  readonly closing: string;
};

type SerializeEntry =
  FinishArrayElement |
  FindUnfilteredObjectMember |
  AfterUnfilteredObjectMember;

function BUG(msg: string): never {
  ThrowError(`LOGIC ERROR: ${msg}`);
}

class StringifyGenerator {
  private readonly stack: SerializeEntry[] = [];

  private indent = "";

  private readonly replacer: ReplacerFunction | undefined;
  private readonly propertyList: PropertyList | undefined;

  private readonly gap: string;

  constructor(replacer: ReplacerFunction | ReplacerPropertyList | NoReplacer, space: string | number) {
    if (typeof replacer === "function")
      this.replacer = replacer;
    else if (replacer)
      this.propertyList = toPropertyList(replacer);

    this.gap = typeof space === "string"
      ? StringSlice(space, 0, 10)
      : space >= 1
        ? StringRepeat(" ", Truncate(Min(10, space)))
        : "";
  }

  /** Yield constrained-length fragments of an unconstrained-length string. */
  private *lengthyFragment(frag: string): Generator<string, void, void> {
    for (let i = 0; i < frag.length; i += Quantum)
      yield StringSlice(frag, i, i + Quantum);
  }

  /** Ensure we aren't already stringifying `obj`. */
  private checkAcyclic(obj: object): void {
    // Accept quadratic cost for deep object graphs until someone complains.
    // (Mozilla's `JSON.stringify` is quadratic this way, so there's precedent
    // for ignoring the concern now.)
    if (ArrayFind(this.stack, (entry: SerializeEntry) => entry.object === obj))
      ThrowTypeError("Attempting to stringify a cyclic object");
  }

  /**
   * Begin serializing the given array.  Return the fragment corresponding to
   * the opening of the array.
   */
  private enterArray(array: unknown[], length: number): string {
    const stepBack = this.indent;
    this.indent += this.gap;

    const [begin, separator, end] =
      this.gap === "" ? ["[", ",", "]"] : [`[\n${this.indent}`, `,\n${this.indent}`, `\n${stepBack}]`];

    Push(this.stack, {
      state: State.FinishArrayElement,
      object: array,
      index: 0,
      length,
      priorIndent: stepBack,
      separator,
      end,
    } satisfies FinishArrayElement);

    return begin;
  }

  /** Begin serializing the given object. */
  private enterObject(object: object, props: readonly string[]): void {
    // `this.indent` is adjusted only once the first non-filtered property is
    // encountered.
    Push(this.stack, {
      state: State.FindUnfilteredObjectMember,
      object: object as Record<string, unknown>,
      index: 0,
      props,
    });
  }

  private stackTop(): SerializeEntry {
    return this.stack[this.stack.length - 1];
  }

  /** Stop serializing the current object. */
  private exitObject(): void {
    Pop(this.stack);
  }

  public *run(value: unknown): Generator<string, void, void> {
    let sval: StringifiableValue;
    {
      const v: StringifiableValue | undefined = this.preprocessValue(
        value,
        this.replacer ? { "": value } : null,
        "",
      );
      if (typeof v === "undefined")
        return;

      sval = v;
    }

    let state = State.StringifiableValue;
    processingElementOrPropertyValue: do {
      toFinishValue: switch (state) {
        // We could make any other state fall through to `StringifyValue`.  We
        // pick `FinishArrayElement` because array element stringification is
        // tighter than object-property stringification.
        // @ts-expect-error intentional fallthrough
        case State.FinishArrayElement: {
          const arrayState = this.stackTop() as FinishArrayElement;
          const index = ++arrayState.index;
          const length = arrayState.length;

          if (index >= length) {
            if (index > length)
              BUG("iterated past end of array elements");

            this.exitObject();
            this.indent = arrayState.priorIndent;

            // We ignore that `this.indent` might make this extremely long.
            yield arrayState.end;
            break toFinishValue;
          }

          const { object: array, separator } = arrayState;

          // We ignore that `this.indent` might make this extremely long.
          yield separator;

          sval = this.preprocessValue(array[index], array, ToString(index)) ?? null;

          state = State.StringifiableValue;
        }

        case State.StringifiableValue: {
          do {
            if (sval === null) {
              yield "null";
              break toFinishValue;
            }

            if (!IsArray(sval))
              break;

            this.checkAcyclic(sval);

            const length = LengthOfArrayLike(sval);
            if (length === 0) {
              yield "[]";
              break toFinishValue;
            }

            // We ignore that `this.indent` might make this extremely long.
            yield this.enterArray(sval, length);

            sval = this.preprocessValue(sval[0], sval, "0") ?? null;
          } while (true);

          if (typeof sval === "object") {
            this.checkAcyclic(sval);

            const props = this.propertyList ?? EnumerableOwnPropertyKeys(sval);
            this.enterObject(sval, props);

            state = State.FindUnfilteredObjectMember;
            continue processingElementOrPropertyValue;
          }

          type assert_ValueTypeIs = Expect<
            Equal<
              typeof sval,
              boolean | number | string
            >
          >;
          const frag = JSONStringify(sval);

          if (typeof sval === "string")
            yield* this.lengthyFragment(frag);
          else
            yield frag;
          break toFinishValue;
        }

        case State.FindUnfilteredObjectMember: {
          const objectState = this.stackTop() as FindUnfilteredObjectMember;
          const { object, props: keys } = objectState;

          // Loop looking for the first property with stringifiable value.
          let v: StringifiableValue | undefined;
          let index = objectState.index;
          let key: string;
          foundUnfilteredProperty: do {
            if (index >= keys.length) {
              if (index > keys.length)
                BUG("iterated past keys end looking for first stringifiable");

              this.exitObject();
              yield "{}";
              break toFinishValue;
            }

            key = keys[index];
            v = this.preprocessValue(object[key], object, key);
            if (typeof v !== "undefined")
              break foundUnfilteredProperty;

            index++;
          } while (true);

          const stepBack = this.indent;
          this.indent += this.gap;

          const [opening, colon, comma, closing] = this.gap === ""
            ? ["{", ":", ",", "}"]
            : [`{\n${this.indent}`, ": ", `,\n${this.indent}`, `\n${stepBack}}`];

          yield* this.lengthyFragment(`${opening}${JSONStringify(key)}${colon}`);

          this.stack[this.stack.length - 1] = {
            state: State.AfterUnfilteredObjectMember,
            object,
            index: index + 1,
            props: keys,
            priorIndent: stepBack,
            colon,
            comma,
            closing,
          } satisfies AfterUnfilteredObjectMember;

          sval = v;

          state = State.StringifiableValue;
          continue processingElementOrPropertyValue;
        }

        case State.AfterUnfilteredObjectMember: {
          const objectState = this.stackTop() as AfterUnfilteredObjectMember;
          const { object, props: keys } = objectState;

          let v: StringifiableValue | undefined;
          let index = objectState.index;
          let key: string;
          foundUnfilteredProperty: do {
            if (index >= keys.length) {
              if (index > keys.length)
                BUG("iterated past keys end looking for subsequent stringifiable");

              this.exitObject();
              this.indent = objectState.priorIndent;

              // We ignore that `this.indent` might make this extremely long.
              yield objectState.closing;
              break toFinishValue;
            }

            key = keys[index];

            v = this.preprocessValue(object[key], object, key);
            if (typeof v !== "undefined")
              break foundUnfilteredProperty;

            index++;
          } while (true);

          const { comma, colon } = objectState;

          yield* this.lengthyFragment(`${comma}${JSONStringify(key)}${colon}`);

          objectState.index = index + 1;

          sval = v;

          state = State.StringifiableValue;
          continue processingElementOrPropertyValue;
        }

        default: {
          type assert_AllStatesHandled = Expect<Equal<typeof state, never>>;
        }
      }

      if (this.stack.length === 0)
        break;

      state = this.stackTop().state;
    } while (true);
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
  private preprocessValue(
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
        const toJSON = (value as { toJSON: unknown }).toJSON;
        if (typeof toJSON === "function")
          value = ReflectApply(toJSON, value, [key]);
        break;
      default:
        break;
    }

    if (this.replacer)
      value = ReflectApply(this.replacer, holder, [key, value]);

    if (value === null)
      return value;

    if (typeof value === "object") {
      if (HasNumberDataSlot(value))
        value = ToNumber(value);
      else if (HasStringDataSlot(value))
        value = ToString(value);
      else if (HasBooleanDataSlot(value))
        value = ExtractBooleanData(value);
      else if (HasBigIntDataSlot(value))
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
        ThrowTypeError("Can't serialize bigint");
    }
  }
};

/**
 * Create an iterator over successive fragments of the JSON stringification of a
 * value, as if by `JSON.stringify(value, replacer, space)`.  Fragments will be
 * iterated until the entire stringification has been returned.  Where fragment
 * boundaries occur is explicitly not defined: do not attempt to infer or rely
 * upon boundary locations.
 *
 * If the incremental stringification operations performed to iterate the next
 * fragment throw an exception, that exception will propagate to the caller.
 *
 * ```js
 * import { stringify } from "@jswalden/streaming-json";
 *
 * const iter = stringify([1, { toJSON() { throw 42; } }, 3], null, 0);
 *
 * let result;
 *
 * // These fragment boundaries are not guaranteed.  This example merely
 * // demonstrates the exception propagation behavior.
 * result = iter.next();
 * assert(!result.done && result.value === "[");
 *
 * result = iter.next();
 * assert(!result.done && result.value === "1");
 *
 * result = iter.next();
 * assert(!result.done && result.value === ",");
 *
 * assertThrows(() => iter.next(), 42);
 * ```
 *
 * If `value` itself is not stringifiable (e.g. it's `undefined`, a symbol, or
 * is callable), *iteration will not produce any fragments*.  (Note that in this
 * case `JSON.stringify` would return `undefined`, not a string.)
 *
 * ```js
 * import { stringify } from "@jswalden/streaming-json";
 *
 * const cantStringify = undefined;
 * assert(JSON.stringify(cantStringify, null, 2) === undefined);
 * assert([...stringify(cantStringify, null, 2)].length === 0);
 * ```
 *
 * Therefore if you use this function on insufficiently-restricted values
 * expecting it to produce a concatenated stringification, you must be sure to
 * verify that it actually iterates a fragment.
 *
 * @param value
 *   The value to stringify.
 * @param replacer
 *   A property list identifying the properties to include in stringification,
 *   a replacer function to call that can modify or eliminate values encoded in
 *   the ultimate stringification, or `null`/`undefined` if no replacement or
 *   limitation of properties should occur.
 * @param space
 *   If a number, contents will be pretty-printed using that many U+0020 SPACE
 *   characters as indentation.  Otherwise up to the first ten characters of a
 *   supplied string will be used as indentation.  If the requested indentation
 *   is an empty string, no pretty-printing occurs.
 */
export function stringify(
  value: unknown,
  replacer?: ReplacerFunction | ReplacerPropertyList | NoReplacer,
  space: string | number = "",
): IterableIterator<string, void, void> {
  return new StringifyGenerator(replacer, space).run(value);
}
