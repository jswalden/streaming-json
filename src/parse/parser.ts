import type { Equal, Expect } from "type-testing";
import { IsArray, Pop, Push } from "../stdlib/array.js";
import { LengthOfArrayLike } from "../stdlib/length.js";
import { Min } from "../stdlib/math.js";
import { ParseDecimalDigits, ParseFloat, ParseHexDigits } from "../stdlib/number.js";
import { CreateDataProperty, DeleteProperty, EnumerableOwnPropertyKeys } from "../stdlib/object.js";
import { ReflectApply } from "../stdlib/reflect.js";
import { StringFromCharCode, StringSlice, ToString } from "../stdlib/string.js";

interface JSONObject {
  [key: string]: JSONValue | undefined;
};
type JSONArray = JSONValue[];

/**
 * A type broadly describing all values that can be serialized to JSON text.
 *
 * This type doesn't limit objects/arrays compatible with it to not have
 * getters/setters, to not be proxies with handler-implemented traps (or that
 * have been revoked), etc.  It's just moderately nicer than using `any`.
 */
export type JSONValue = number | string | boolean | null | JSONArray | JSONObject;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type StringToken = { type: "string"; value: string };
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type NumberToken = { type: "number"; value: number };
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type BooleanToken = { type: "boolean"; value: boolean };
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type NullToken = { type: "null" };
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type ObjectCloseToken = { type: "object-close" };
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type ArrayCloseToken = { type: "array-close" };
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type CommaToken = { type: "comma" };
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type ColonToken = { type: "colon" };

type JSONToken =
  | StringToken |
  NumberToken |
  BooleanToken |
  NullToken |
  ObjectCloseToken |
  ArrayCloseToken |
  CommaToken |
  ColonToken |
  { type: "array-open" | "object-open" };

type ParseState = "finish-array-element" | "finish-object-member" | "value";

function IsJSONWhitespace(c: string): boolean {
  return c === "\t" || c === "\r" || c === "\n" || c === " ";
}

function IsAsciiDigit(c: string): boolean {
  return c.length === 1 && "0" <= c && c <= "9";
}

function IsHexDigit(c: string): boolean {
  return c.length === 1 && (("0" <= c && c <= "9") ||
    ("a" <= c && c <= "f") ||
    ("A" <= c && c <= "F"));
}

/**
 * Create a generator that incrementally parses as JSON a series of nonempty
 * fragments passed to the generator as arguments to its `next()` property.
 *
 * As JSON can be surrounded by arbitrary amounts of whitespace, the overall
 * text can be infinitely long.  To indicate the end of the text intended to be
 * parsed, call `next("")` passing an empty fragment.
 *
 * If the combined fragments aren't valid JSON, the `next()` call supplying the
 * fragment that makes the combination invalid will throw a `SyntaxError`.
 * Fragments will continue to be parsed until either an error is detected or
 * until the parsed prefix is invalid JSON.
 * Because JSON can be surrounded by whitespace, it can in principle parse an
 * infinitely long overall
 *
 * @throws
 *   A `SyntaxError` at the earliest instant that it's known that the combined
 *   fragments don't constitute valid JSON.
 * @returns
 *   Upon a call of `next("")`, assuming all fragments do constitute a valid
 *   JSON text, the corresponding JSON value.
 */
function* ParseJSON(): Generator<void, JSONValue, string> {
  let fragment = "";
  let current = 0;
  let end = 0;
  let eof = false;
  const atEOF = function* (): Generator<void, boolean, string> {
    if (eof)
      return true;

    const data = yield;
    if (data.length === 0) {
      eof = true;
      return true;
    }

    fragment = data;
    current = 0;
    end = fragment.length;
    return false;
  };
  const atEnd = (): boolean => {
    if (current > end)
      throw new Error("LOGIC ERROR");
    return current === end;
  };

  const consumeWhitespace = function* (): Generator<void, void, string> {
    do {
      while (!atEnd()) {
        if (!IsJSONWhitespace(fragment[current]))
          return;
        current++;
      }

      if (yield* atEOF())
        return;
    }
    while (true);
  };

  const consumeKeyword = function* (keyword: string): Generator<void, void, string> {
    let i = 0;
    while (i < keyword.length) {
      if (atEnd() && (yield* atEOF()))
        throw new SyntaxError(`End of data in middle of '${keyword}' keyword`);

      const amount = Min(keyword.length - i, end - current);
      if (StringSlice(keyword, i, i + amount) !== StringSlice(fragment, current, current + amount))
        throw new SyntaxError(`Malformed '${keyword}' keyword`);

      current += amount;
      i += amount;
    }
  };

  const jsonString = function* (): Generator<void, string, string> {
    if (atEnd() || fragment[current] !== '"')
      throw new Error("LOGIC ERROR");
    current++;

    let value = "";

    do {
      if (atEnd() && (yield* atEOF()))
        throw new SyntaxError("Unterminated string literal");

      let c = fragment[current++];
      if (c === '"')
        return value;

      if (c <= "\u001F")
        throw new SyntaxError("Bad control character in string literal");

      if (c === "\\") {
        if (atEnd() && (yield* atEOF()))
          throw new SyntaxError("Incomplete escape sequence");

        c = fragment[current++];
        switch (c) {
          case '"':
          case "/":
          case "\\":
            break;
          case "b":
            c = "\b";
            break;
          case "f":
            c = "\f";
            break;
          case "n":
            c = "\n";
            break;
          case "r":
            c = "\r";
            break;
          case "t":
            c = "\t";
            break;

          case "u": {
            let digits = "";
            do {
              if (atEnd() && (yield* atEOF()))
                throw new SyntaxError("Too-short Unicode escape");

              const amount = Min(4 - digits.length, end - current);
              for (let i = 0; i < amount; i++) {
                if (!IsHexDigit(fragment[current + i]))
                  throw new SyntaxError("Bad Unicode escape");
              }
              digits += StringSlice(fragment, current, current + amount);
              current += amount;
            } while (digits.length < 4);
            c = StringFromCharCode(ParseHexDigits(digits));
            break;
          }

          default:
            throw new SyntaxError(`Bad escaped character '${c}'`);
        }
      }

      value += c;
    } while (true);
  };

  const jsonNumber = function* (): Generator<void, number, string> {
    if (atEnd())
      throw new Error("LOGIC ERROR");

    // ^-?(0|[1-9][0-9]+)(\.[0-9]+)?([eE][\+\-]?[0-9]+)?$
    let c = fragment[current];
    if (!(c === "-" || ("0" <= c && c <= "9")))
      throw new Error("LOGIC ERROR");

    let numText = "";

    // -?
    if (c === "-") {
      numText += c;
      current++;
      if (atEnd() && (yield* atEOF()))
        throw new SyntaxError("Missing number after '-'");

      c = fragment[current];
      if (!("0" <= c && c <= "9"))
        throw new SyntaxError("Unexpected nondigit");
    }

    // 0|[1-9][0-9]+
    numText += c;
    current++;
    if (c !== "0") {
      do {
        if (atEnd()) {
          if (yield* atEOF())
            return ParseDecimalDigits(numText);
        }

        c = fragment[current];
        if (!IsAsciiDigit(c))
          break;

        numText += c;
        current++;
      } while (true);
    }

    if (c !== "." && c !== "e" && c !== "E")
      return ParseDecimalDigits(numText);

    // (\.[0-9]+)?
    if (c === ".") {
      numText += c;
      current++;
      if (atEnd() && (yield* atEOF()))
        throw new SyntaxError("Missing digits after decimal point");

      c = fragment[current];
      if (!IsAsciiDigit(c))
        throw new SyntaxError("Unterminated fractional number");
      numText += c;
      current++;

      do {
        if (atEnd() && (yield* atEOF()))
          return ParseFloat(numText);

        c = fragment[current];
        if (!IsAsciiDigit(c))
          break;

        numText += c;
        current++;
      } while (true);
    }

    // ([eE][\+\-]?[0-9]+)?
    if (c === "e" || c === "E") {
      numText += c;
      current++;
      if (atEnd() && (yield* atEOF()))
        throw new SyntaxError("Missing digits after exponent indicator");

      c = fragment[current];
      if (c === "+" || c === "-") {
        numText += c;
        current++;

        if (atEnd() && (yield* atEOF()))
          throw new SyntaxError("Missing digits after exponent sign");
      }

      c = fragment[current];
      if (!IsAsciiDigit(c))
        throw new SyntaxError("Exponent part is missing a number");
      numText += c;
      current++;

      do {
        if (atEnd() && (yield* atEOF()))
          break;

        c = fragment[current];
        if (!IsAsciiDigit(c))
          break;

        numText += c;
        current++;
      } while (true);
    }

    return ParseFloat(numText);
  };

  const advanceAfterObjectOpen = function* (): Generator<void, ObjectCloseToken | StringToken, string> {
    yield* consumeWhitespace();

    if (atEnd() && (yield* atEOF()))
      throw new SyntaxError("End of data while reading object contents");

    const c = fragment[current];
    if (c === '"')
      return { type: "string", value: yield* jsonString() };

    if (c === "}") {
      current++;
      return { type: "object-close" };
    }

    throw new SyntaxError("Expected property name or '}'");
  };

  const advanceColon = function* (): Generator<void, void, string> {
    yield* consumeWhitespace();

    if (atEnd() && (yield* atEOF()))
      throw new SyntaxError("End of data looking for colon in object entry");

    if (fragment[current] !== ":")
      throw new SyntaxError("Expected ':' after property name in object");

    current++;
  };

  const advanceAfterObjectEntry = function* (): Generator<void, "}" | ",", string> {
    yield* consumeWhitespace();

    if (atEnd() && (yield* atEOF()))
      throw new SyntaxError("End of data after property value in object");

    const c = fragment[current++];
    if (c === "," || c === "}")
      return c;

    throw new SyntaxError("Expected ',' or '}' after property value in object");
  };

  const advanceAfterArrayElement = function* (): Generator<void, "]" | ",", string> {
    yield* consumeWhitespace();

    if (atEnd() && (yield* atEOF()))
      throw new SyntaxError("End of data when ',' or ']' was expected");

    const c = fragment[current++];
    if (c === "]" || c === ",")
      return c;

    throw new SyntaxError("Expected property name or '}'");
  };

  const advance = function* (): Generator<void, JSONToken, string> {
    yield* consumeWhitespace();

    if (atEnd() && (yield* atEOF()))
      throw new SyntaxError("Unexpected end of data");

    switch (fragment[current]) {
      case '"':
        return { type: "string", value: yield* jsonString() };

      case "-":
      case "0":
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
        return { type: "number", value: yield* jsonNumber() };

      case "t":
        yield* consumeKeyword("true");
        return { type: "boolean", value: true };

      case "f":
        yield* consumeKeyword("false");
        return { type: "boolean", value: false };

      case "n":
        yield* consumeKeyword("null");
        return { type: "null" };

      case "[":
        current++;
        return { type: "array-open" };
      case "]":
        current++;
        return { type: "array-close" };

      case "{":
        current++;
        return { type: "object-open" };
      case "}":
        current++;
        return { type: "object-close" };

      case ",":
        current++;
        return { type: "comma" };

      case ":":
        current++;
        return { type: "colon" };

      default:
        throw new SyntaxError("Unexpected character");
    }
  };

  type PartialArray = JSONValue[];
  type PartialObject = Record<string, JSONValue | undefined>;
  type PartialObjectAndPendingProperty = [PartialObject, string];

  const stack: [ParseState, PartialArray | PartialObjectAndPendingProperty][] = [];

  let value: JSONValue = "ERROR";

  let token: JSONToken;
  let state: ParseState = "value";
  toArrayElementOrObjectPropertyValue: do {
    toFinishValue: switch (state) {
      case "value": {
        token = yield* advance();
        processValueToken: do {
          switch (token.type) {
            case "string":
            case "number":
            case "boolean":
              value = token.value;
              break toFinishValue;

            case "null":
              value = null;
              break toFinishValue;

            case "array-open": {
              Push(stack, ["finish-array-element", [] satisfies PartialArray]);
              token = yield* advance();
              if (token.type === "array-close") {
                value = Pop(stack)[1];
                break toFinishValue;
              }

              continue processValueToken;
            }

            case "object-open": {
              const stackEntry = [{}, "PLACEHOLDER"] satisfies PartialObjectAndPendingProperty;
              Push(stack, ["finish-object-member", stackEntry]);
              const propertyOrClose = yield* advanceAfterObjectOpen();
              if (propertyOrClose.type === "object-close") {
                value = Pop(stack)[1][0];
                break toFinishValue;
              }

              stackEntry[1] = propertyOrClose.value;
              yield* advanceColon();

              token = yield* advance();
              continue processValueToken;
            }

            case "array-close":
            case "object-close":
            case "colon":
            case "comma":
              throw new SyntaxError(`Encountered ${token.type} token in value context`);

            default: {
              type assert_AllCasesHandled = Expect<Equal<typeof token, never>>;
            }
          }
        } while (true);
      }

      case "finish-object-member": {
        const objectInfo = stack[stack.length - 1] as [ParseState, PartialObjectAndPendingProperty];
        const [partialObj, pendingProperty] = objectInfo[1];
        CreateDataProperty(partialObj, pendingProperty, value);

        const punct = yield* advanceAfterObjectEntry();
        if (punct === "}") {
          value = Pop(stack)[1][0];
          break toFinishValue;
        }

        yield* consumeWhitespace();

        if (atEnd() && (yield* atEOF()))
          throw new SyntaxError("End of data where property name was expected");

        if (fragment[current] !== '"')
          throw new Error("Expected property name");

        const property = yield* jsonString();
        objectInfo[1][1] = property;

        yield* advanceColon();

        state = "value";
        continue toArrayElementOrObjectPropertyValue;
      }

      case "finish-array-element": {
        const arrayInfo = stack[stack.length - 1] as [ParseState, PartialArray];
        Push(arrayInfo[1], value);
        const punct = yield* advanceAfterArrayElement();
        if (punct === "]") {
          value = Pop(stack)[1];
          break toFinishValue;
        }

        state = "value";
        continue toArrayElementOrObjectPropertyValue;
      }
    }

    if (stack.length === 0)
      break;

    state = stack[stack.length - 1][0];
  } while (true);

  yield* consumeWhitespace();

  if (!atEnd())
    throw new SyntaxError("Unexpected non-whitespace character after JSON data");

  return value;
}

/**
 * The type of the optional `reviver` function that can be passed to
 * `StreamingJSONParser.finish`.
 */
export type Reviver<T> = (this: object, prop: string, val: any) => T;

type ParseResult<R extends undefined | Reviver<unknown>> =
  R extends undefined
    ? JSONValue
    : R extends Reviver<unknown>
      ? ReturnType<R>
      : never;

/**
 * A JSON parser when you'd prefer to incrementally parse your JSON in fragments
 * rather than from one single string.
 *
 * Feed fragments of JSON text to the parser by calling `add(fragment)`.  When
 * you've fed the entire JSON text to the parser, call `finish()` to get the
 * (optionally revived) result.
 *
 * If the concatenation of fragments is ever definitely not a prefix of valid
 * JSON text, or if the final concatenation of all fragments is not valid JSON
 * text, a `SyntaxError` is thrown by the applicable `add(fragment)` or
 * `finish()`.
 */
export class StreamingJSONParser {
  #parser = ParseJSON();
  #done = false;

  constructor() {
    // Advance past initial implicit yield to first actual yield.
    const done = this.#parser.next().done;
    if (typeof done === "boolean" && done)
      throw new Error("BUG: PARSER PREMATURELY FINISHED");
  }

  /**
   * Add a `fragment` of additional JSON text to the overall conceptual string
   * being parsed.
   *
   * @throws
   *   A `SyntaxError` if adding this fragment makes the concatenation of all
   *   fragments not a valid prefix of JSON text.
   * @throws
   *   An `Error` if fragments can't be added because a previous fragment
   *   triggered a syntax error or because `finish()` was called.
   */
  add(fragment: string): void {
    if (this.#done)
      throw new Error("Can't add fragment: parsing already completed");

    // Filter out magical end-of-text fragments.
    if (fragment.length > 0) {
      try {
        const done = this.#parser.next(fragment).done;
        if (typeof done === "boolean" && done)
          throw new Error("BUG add(nonempty fragment) never completes parsing");
      } catch (e) {
        this.#done = true;
        throw e;
      }
    }
  }

  /**
   * Returns `true` if more fragments can be added to this parser (even if only
   * trailing whitespace) and `finish()` hasn't been called.
   *
   * Return `false` if no more fragments can be added (because `finish()` was
   * called or because a preceding fragment contained a syntax error).
   */
  done(): boolean {
    return this.#done;
  }

  /**
   * Stop feeding fragments to this parser and compute and return the final
   * result of parsing and any requested postprocessing.
   *
   * If the concatenation of all fragments (or, in the vacuous case of no
   * fragments, the empty string) is not valid JSON (even as it necessarily was
   * an acceptable prefix of some valid JSON or `add(fragment)` would have
   * thrown), throw a `SyntaxError`.
   *
   * Otherwise compute the overall result of parsing as the value `unfiltered`.
   * If a `reviver` was not supplied, return `unfiltered`.
   *
   * If `reviver` was supplied, apply it to `unfiltered` and to its properties,
   * elements, subarrays, subobjects subproperties, etc. recursively as
   * [`JSON.parse`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
   * would do if it were passed `reviver` and the combined fragments passed to
   * this parser.  The result of reviving as `JSON.parse` would have computed it
   * is then returned.
   *
   * @throws
   *   `Error` if parsing was already `done()`.
   * @throws
   *   `SyntaxError` if parsing wasn't `done()` and the concatenation of all
   *   fragments isn't valid JSON (even as it must be the *prefix* of valid JSON
   *   text).
   * @throws
   *   Any value thrown by `reviver` during the reviving process.
   * @returns
   *   The overall parse result, optionally revived, if all fragments together
   *   constitute valid JSON text.
   */
  finish(): JSONValue;
  finish<T>(reviver: Reviver<T>): T;
  finish<T>(reviver?: Reviver<T>): ParseResult<typeof reviver> {
    if (this.#done) {
      throw new Error(
        "Can't call finish: it was either already called or a syntax error " +
        "was encountered",
      );
    }

    let unfiltered: JSONValue;
    try {
      // Finish parsing and compute the unfiltered result of the parse.
      const result = this.#parser.next("");

      const done = result.done;
      if (typeof done !== "boolean" || !done)
        throw new SyntaxError("Complete text is not valid JSON");

      unfiltered = result.value;
    } catch (e) {
      throw e;
    } finally {
      this.#done = true;
    }

    // If a reviver wasn't supplied, return the unfiltered result.
    if (typeof reviver === "undefined")
      return unfiltered;

    // If a reviver was supplied, use it to compute the true desired value.

    // Don't use `this.#try` for the `reviver` case because we want to throw
    // errors during revival verbatim -- and because `this.#try` would return a
    // combined `JSONValue | T` type, losing the distinction the separate
    // overloads convey across the callback boundary.
    const rootName = "";
    const root: object = { [rootName]: unfiltered };
    return InternalizeJSONProperty(root, rootName, reviver);
  }
};

/** @see https://tc39.es/ecma262/#sec-internalizejsonproperty */
function InternalizeJSONProperty<
  R extends Reviver<T>,
  T,
>(holder: object, name: string | number, reviver: R): ReturnType<R> {
  const val = (holder as Record<string, unknown>)[name];
  if (val !== null && typeof val === "object") {
    const isArray = IsArray(val);
    if (isArray) {
      const len = LengthOfArrayLike(val);
      for (let i = 0; i < len; i++) {
        const newElement = InternalizeJSONProperty(val, ToString(i), reviver);
        // Intentionally ignore deletion/definition returning false, per spec
        // (but still propagate outright failures that throw).
        if (typeof newElement === "undefined")
          DeleteProperty(val, i);
        else
          CreateDataProperty(val, i, newElement);
      }
    } else {
      const keys = EnumerableOwnPropertyKeys(val);
      for (let i = 0, len = keys.length; i < len; i++) {
        const p = keys[i];
        // Intentionally ignore deletion/definition returning false, per spec
        // (but still propagate outright failures that throw).
        const newElement = InternalizeJSONProperty(val, p, reviver);
        if (typeof newElement === "undefined")
          DeleteProperty(val, p);
        else
          CreateDataProperty(val, p, newElement);
      }
    }
  }

  return ReflectApply(reviver, holder, [name, val]) as ReturnType<R>;
}
