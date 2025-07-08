import type { Equal, Expect } from "type-testing";
import { EmitterBase, Quantum, type Replacer, type StringifiableValue } from "../shared.js";
import { IsArray } from "../../stdlib/array.js";
import { JSONStringify } from "../../stdlib/json-stringify.js";
import { LengthOfArrayLike } from "../../stdlib/length.js";
import { EnumerableOwnPropertyKeys } from "../../stdlib/object.js";

/** A class managing state incrementally sync-emitting JSON stringification. */
class StreamingJSONEmitter extends EmitterBase {
  private readonly emit: (s: string) => void;

  /** Break up the emitting of a lengthy  string. */
  private emitLengthy(s: string): void {
    for (let i = 0; i < s.length; i += Quantum)
      this.emit(s.slice(i, i + Quantum));
  }

  constructor(replacer: Replacer | undefined, space: string | number, emit: (s: string) => void) {
    super(replacer, space);
    this.emit = emit;
  }

  /**
   * Stringify `value`, emitting incremental parts of the overall result using
   * `emit`.
   */
  public run(value: unknown): void {
    const wrapper = typeof this.replacer === "function" ? { "": value } : null;
    const v: StringifiableValue | undefined = this.preprocessValue(value, wrapper, "");
    if (v === undefined)
      this.emit("null");
    else
      this.serializeValue(v);
  }

  /** Serialize a JSON-stringifiable value. */
  private serializeValue(value: StringifiableValue): void {
    if (IsArray(value)) {
      this.serializeArray(value);
      return;
    }

    if (value === null) {
      this.emit("null");
      return;
    }

    if (typeof value === "object") {
      this.serializeObject(value as Record<string, unknown>);
      return;
    }

    type assert_ValueTypeIs = Expect<
      Equal<
        typeof value,
        boolean | number | string
      >
    >;
    this.emitLengthy(JSONStringify(value));
  }

  /** Serialize `array`, respecting `this.indent`. */
  private serializeArray(array: readonly unknown[]): void {
    this.pushAcyclicStack(array);

    const len = LengthOfArrayLike(array);
    if (len === 0) {
      this.emit("[]");
    } else {
      const stepBack = this.indent;
      this.indent += this.gap;

      // In theory `this.indent` could grow long enough to require `emitLengthy`
      // here.  We ignore the concern for now.
      const [begin, separator, end] =
        this.gap === "" ? ["[", ",", "]"] : [`[\n${this.indent}`, `,\n${this.indent}`, `\n${stepBack}]`];

      this.emit(begin);

      let v = this.preprocessValue(array[0], array, "0");
      if (v === undefined)
        this.emit("null");
      else
        this.serializeValue(v);

      for (let i = 1; i < len; i++) {
        this.emit(separator);
        v = this.preprocessValue(array[i], array, String(i));
        if (v === undefined)
          this.emit("null");
        else
          this.serializeValue(v);
      }

      this.emit(end);

      this.indent = stepBack;
    }

    this.popStack();
  }

  /** Serialize `obj`, respecting `this.indent`. */
  private serializeObject(obj: Readonly<Record<string, unknown>>): void {
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
      const [opening, colon, comma, closing] =
        this.gap === "" ? ["{", ":", ",", "}"] : [`{\n${this.indent}`, ": ", `,\n${this.indent}`, `\n${stepBack}}`];

      this.emitLengthy(`${opening}${JSONStringify(props[i])}${colon}`);
      this.serializeValue(v);

      while (++i < propCount) {
        key = props[i];
        v = this.preprocessValue(obj[key], obj, key);
        if (v === undefined)
          continue;

        this.emitLengthy(`${comma}${JSONStringify(props[i])}${colon}`);
        this.serializeValue(v);
      }

      this.emit(closing);
      this.indent = stepBack;
      this.popStack();
      return;
    }

    // If all properties are omitted (potentially vacuously), emit the empty
    // object directly.
    this.emit("{}");

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
 * Upon return either the entire `JSON.stringify` result (or `null` in the edge
 * case above) will have passed through `emit`, or the function will have
 * thrown.
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
 *   The function to repeatedly call with successive fragments of the overall
 *   JSON result string.  (The precise locations of fragment boundaries are
 *   undefined.)
 * @throws
 *   The first exception that occurs during stringification or by an invocation
 *   of `emit`.
 */
export function stringify(
  value: unknown,
  replacer: Replacer | undefined,
  space: string | number,
  emit: (s: string) => void,
): void {
  new StreamingJSONEmitter(replacer, space, emit).run(value);
}
