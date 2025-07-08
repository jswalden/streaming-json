import type { Equal, Expect } from "type-testing";
import { EmitterBase, Quantum, type Replacer, type StringifiableValue } from "../shared.js";
import { IsArray } from "../../stdlib/array.js";
import { JSONStringify } from "../../stdlib/json-stringify.js";
import { LengthOfArrayLike } from "../../stdlib/length.js";
import { EnumerableOwnPropertyKeys } from "../../stdlib/object.js";

// It's not possible to transform a sync implementation into an async/await
// implementation -- the syntax just doesn't compose.  So we duplicate the
// algorithm in synchronous-with-callback and async-with-async-callbacks
// versions.
//
// If both algorithms ever require modification, you should edit the sync
// algorithm, then copy/paste it over the `async` algorithm and manually massage
// it to be `async` -- and then check the resulting diff *very carefully*.

/**
 * A class managing state when asynchronously incrementally emitting JSON
 * stringification.
 */
class AsyncStreamingJSONEmitter extends EmitterBase {
  private readonly emit: (s: string) => Promise<void>;

  /** Emit a potentially lengthy string in multiple chunks. */
  private async emitLengthy(s: string): Promise<void> {
    for (let i = 0; i < s.length; i += Quantum)
      await this.emit(s.slice(i, i + Quantum));
  }

  constructor(replacer: Replacer | undefined, space: string | number, emit: (s: string) => Promise<void>) {
    super(replacer, space);
    this.emit = emit;
  }

  /**
   * Stringify `value`, emitting incremental parts of the overall result using
   * `emit`.
   */
  public async run(value: unknown): Promise<void> {
    const wrapper = typeof this.replacer === "function" ? { "": value } : null;
    const v: StringifiableValue | undefined = this.preprocessValue(value, wrapper, "");
    return v === undefined ? this.emit("null") : this.serializeValue(v);
  }

  /** Serialize a JSON-stringifiable value. */
  private async serializeValue(value: StringifiableValue): Promise<void> {
    if (IsArray(value))
      return this.serializeArray(value);

    if (value === null)
      return this.emit("null");

    if (typeof value === "object")
      return this.serializeObject(value as Record<string, unknown>);

    type assert_ValueTypeIs = Expect<
      Equal<
        typeof value,
        boolean | number | string
      >
    >;
    return this.emitLengthy(JSONStringify(value));
  }

  /** Serialize `array`, respecting `this.indent`. */
  private async serializeArray(array: readonly unknown[]): Promise<void> {
    this.pushAcyclicStack(array);

    const len = LengthOfArrayLike(array);
    if (len === 0) {
      await this.emit("[]");
    } else {
      const stepBack = this.indent;
      this.indent += this.gap;

      // In theory `this.indent` could grow long enough to require `emitLengthy`
      // here.  We ignore the concern for now.
      const [begin, separator, end] =
        this.gap === "" ? ["[", ",", "]"] : [`[\n${this.indent}`, `,\n${this.indent}`, `\n${stepBack}]`];

      await this.emit(begin);

      let v = this.preprocessValue(array[0], array, "0");
      if (v === undefined)
        await this.emit("null");
      else
        await this.serializeValue(v);

      for (let i = 1; i < len; i++) {
        await this.emit(separator);
        v = this.preprocessValue(array[i], array, String(i));
        if (v === undefined)
          await this.emit("null");
        else
          await this.serializeValue(v);
      }

      await this.emit(end);

      this.indent = stepBack;
    }

    this.popStack();
  }

  /** Serialize `obj`, respecting `this.indent`. */
  private async serializeObject(obj: Readonly<Record<string, unknown>>): Promise<void> {
    this.pushAcyclicStack(obj);

    let i = 0;
    const props = typeof this.replacer === "object" ? this.replacer : EnumerableOwnPropertyKeys(obj);
    const propCount = props.length;
    while (i < propCount) {
      let key = props[i];
      let v = this.preprocessValue(obj[key], obj, key);
      if (v === undefined) {
        i++;
        continue;
      }

      // Adjust the saved indent only after a property demands it.
      const stepBack = this.indent;
      this.indent += this.gap;

      // In theory `this.indent` could grow long enough to require `emitLengthy`
      // here.  We ignore the concern for now.
      const [opening, colon, separator, closing] =
        this.gap === "" ? ["{", ":", ",", "}"] : [`{\n${this.indent}`, ": ", `,\n${this.indent}`, `\n${stepBack}}`];

      await this.emitLengthy(`${opening}${JSONStringify(props[i])}${colon}`);
      await this.serializeValue(v);

      while (++i < propCount) {
        key = props[i];
        v = this.preprocessValue(obj[key], obj, key);
        if (v === undefined)
          continue;

        await this.emitLengthy(`${separator}${JSONStringify(props[i])}${colon}`);
        await this.serializeValue(v);
      }

      await this.emit(closing);
      this.indent = stepBack;
      this.popStack();
      return;
    }

    // If all properties are omitted (potentially vacuously), emit the empty
    // object directly.
    await this.emit("{}");

    this.popStack();
  }
}

/**
 * Incrementally stringify a value by emitting strings that, when concatenated,
 * form a JSON string as if for `JSON.stringify(value, replacer, space)` except
 * that:
 *
 *   * If `value` itself is not stringifiable (e.g. it's `undefined`, a symbol,
 *     or is callable), it's coerced to `null` as would happen if the same value
 *     were encountered as an array element.  Thus while
 *     `assert(JSON.stringify(undefined) === undefined)`, instead
 *     `stringify(undefined, (s) => assert(s === 'null'), "")`.
 *   * Simplifications implied by the types of `value`, `replacer`, and `space`
 *     are performed.
 *
 * When the promise returned by this function resolves, the entire
 * `JSON.stringify` result will have passed through `emit` with each call
 * returning a promise that resolved before continuing stringification.  If the
 * returned promise instead rejects, an error occurred during stringification
 * (perhaps as result of an invocation of `emit` having returned a promise that
 * rejects).
 *
 * @param value
 *   The value to stringify.
 * @param
 *   A property list identifying the properties to include in stringification,
 *   or a replacer function to call that can modify or eliminate values encoded
 *   in the ultimate stringification -- or `undefined` if no replacement or
 *   limitation of properties is to occur.
 * @param space
 *   A `space` string/number controlling the presence of added whitespace within
 *   the stringification.
 * @param emit
 *   A function to repeatedly call with successive fragments of the overall JSON
 *   result string.  (Where fragment boundaries are located is undefined.)
 *   Stringification is delayed until the promise returned from each invocation
 *   settles.
 * @returns
 *   A promise that resolves if stringification was successful and all promises
 *   returned for all `emit` calls resolved, or that rejects upon the first
 *   exception thrown by stringification or first rejection of a promise
 *   returned from an `emit` call.
 */
export async function stringifyAsync(
  value: unknown,
  replacer: Replacer | undefined,
  space: string | number,
  emit: (s: string) => Promise<void>,
): Promise<void> {
  return new AsyncStreamingJSONEmitter(replacer, space, emit).run(value);
}
