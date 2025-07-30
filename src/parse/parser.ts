import type { Equal, Expect } from "type-testing";
import { IsArray, Pop, Push } from "../stdlib/array.js";
import { ThrowError, ThrowSyntaxError } from "../stdlib/error.js";
import { LengthOfArrayLike } from "../stdlib/length.js";
import { Min } from "../stdlib/math.js";
import { ParseDecimalDigits, ParseFloat } from "../stdlib/number.js";
import { CreateDataProperty, DeleteProperty, EnumerableOwnPropertyKeys } from "../stdlib/object.js";
import { ReflectApply } from "../stdlib/reflect.js";
import { StringCharCodeAt, StringFromCharCode, StringSlice, ToString } from "../stdlib/string.js";
import { HexDigitToNumber, IsAsciiDigit, Unicode } from "../utils/unicode.js";

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

const enum TokenType {
  String,
  Number,
  Boolean,
  Null,
  ObjectOpen,
  ObjectClose,
  ArrayOpen,
  ArrayClose,
  Comma,
  Colon,
};

type TokenValue = boolean | string | number | null;

const enum ParseState {
  FinishArrayElement,
  FinishObjectMember,
  Value,
};

function BUG(msg: string): never {
  ThrowError(`BUG: ${msg}`);
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
      BUG("incremented current past end");
    return current === end;
  };

  const consumeWhitespace = function* (): Generator<void, void, string> {
    do {
      while (!atEnd()) {
        const c = StringCharCodeAt(fragment, current);
        if (!(c === Unicode.SP as number ||
          c === Unicode.LF as number ||
          c === Unicode.CR as number ||
          c === Unicode.HT as number))
          return;
        current++;
      }

      if (yield* atEOF())
        return;
    } while (true);
  };

  const consumeKeyword = function* (keyword: string): Generator<void, void, string> {
    let i = 0;
    while (i < keyword.length) {
      if (atEnd() && (yield* atEOF()))
        ThrowSyntaxError(`End of data in middle of '${keyword}' keyword`);

      const amount = Min(keyword.length - i, end - current);
      if (StringSlice(keyword, i, i + amount) !== StringSlice(fragment, current, current + amount))
        ThrowSyntaxError(`Malformed '${keyword}' keyword`);

      current += amount;
      i += amount;
    }
  };

  const jsonString = function* (): Generator<void, string, string> {
    if (atEnd() || StringCharCodeAt(fragment, current) !== Unicode.QuotationMark as number)
      BUG("jsonString called while not at start of string");
    current++;

    let value = "";
    do {
      if (atEnd() && (yield* atEOF()))
        ThrowSyntaxError("Unterminated string literal");

      let c = fragment[current++];
      let code = StringCharCodeAt(c, 0);
      if (code === Unicode.QuotationMark as number)
        return value;

      if (code < (Unicode.SP as number))
        ThrowSyntaxError("Bad control character in string literal");

      if (code === Unicode.Backslash as number) {
        if (atEnd() && (yield* atEOF()))
          ThrowSyntaxError("Incomplete escape sequence");

        c = fragment[current++];
        code = StringCharCodeAt(c, 0);
        switch (code) {
          case Unicode.QuotationMark as number:
          case Unicode.ForwardSlash as number:
          case Unicode.Backslash as number:
            break;
          case Unicode.SmallLetterB as number:
            c = "\b";
            break;
          case Unicode.SmallLetterF as number:
            c = "\f";
            break;
          case Unicode.SmallLetterN as number:
            c = "\n";
            break;
          case Unicode.SmallLetterR as number:
            c = "\r";
            break;
          case Unicode.SmallLetterT as number:
            c = "\t";
            break;
          case Unicode.SmallLetterU as number: {
            code = 0;
            let digits = 0;
            do {
              if (atEnd() && (yield* atEOF()))
                ThrowSyntaxError("Too-short Unicode escape");

              const amount = Min(4 - digits, end - current);
              for (let i = 0; i < amount; i++) {
                const n = HexDigitToNumber(fragment, current + i);
                if (n === null)
                  ThrowSyntaxError(`Bad Unicode escape digit '${fragment[current + i]}'`);
                code = (code << 4) | n;
              }
              digits += amount;
              current += amount;
            } while (digits < 4);
            c = StringFromCharCode(code);
            break;
          }
          default:
            ThrowSyntaxError(`Bad escaped character '${c}'`);
        }
      }

      value += c;
    } while (true);
  };

  const jsonNumber = function* (): Generator<void, number, string> {
    if (atEnd())
      BUG("jsonNumber called while at end of fragment");

    // ^-?(0|[1-9][0-9]+)(\.[0-9]+)?([eE][\+\-]?[0-9]+)?$
    let c = fragment[current];
    let code = StringCharCodeAt(c, 0);
    if (!(code === Unicode.Dash as number || IsAsciiDigit(code)))
      BUG("jsonNumber called while not at start of number");

    let numText = "";

    // -?
    if (code === Unicode.Dash as number) {
      numText += c;
      current++;
      if (atEnd() && (yield* atEOF()))
        ThrowSyntaxError("Missing number after '-'");

      c = fragment[current];
      code = StringCharCodeAt(c, 0);
      if (!IsAsciiDigit(code))
        ThrowSyntaxError("Unexpected nondigit");
    }

    // 0|[1-9][0-9]+
    numText += c;
    current++;
    if (code !== Unicode.Zero as number) {
      do {
        if (atEnd()) {
          if (yield* atEOF())
            return ParseDecimalDigits(numText);
        }

        c = fragment[current];
        code = StringCharCodeAt(c, 0);
        if (!IsAsciiDigit(code))
          break;

        numText += c;
        current++;
      } while (true);
    }

    if (code !== Unicode.Period as number &&
      (code & ~0x0010_0000) !== Unicode.LargeLetterE as number)
      return ParseDecimalDigits(numText);

    // (\.[0-9]+)?
    if (code === Unicode.Period as number) {
      numText += c;
      current++;
      if (atEnd() && (yield* atEOF()))
        ThrowSyntaxError("Missing digits after decimal point");

      c = fragment[current];
      code = StringCharCodeAt(c, 0);
      if (!IsAsciiDigit(code))
        ThrowSyntaxError("Unterminated fractional number");
      numText += c;
      current++;

      do {
        if (atEnd() && (yield* atEOF()))
          return ParseFloat(numText);

        c = fragment[current];
        code = StringCharCodeAt(c, 0);
        if (!IsAsciiDigit(code))
          break;

        numText += c;
        current++;
      } while (true);
    }

    // ([eE][\+\-]?[0-9]+)?
    if ((code & ~0b0010_0000) === Unicode.LargeLetterE as number) {
      numText += c;
      current++;
      if (atEnd() && (yield* atEOF()))
        ThrowSyntaxError("Missing digits after exponent indicator");

      c = fragment[current];
      code = StringCharCodeAt(c, 0);
      if (code === Unicode.Plus as number || code === Unicode.Dash as number) {
        numText += c;
        current++;

        if (atEnd() && (yield* atEOF()))
          ThrowSyntaxError("Missing digits after exponent sign");
      }

      c = fragment[current];
      code = StringCharCodeAt(c, 0);
      if (!IsAsciiDigit(code))
        ThrowSyntaxError("Exponent part is missing a number");
      numText += c;
      current++;

      do {
        if (atEnd() && (yield* atEOF()))
          break;

        c = fragment[current];
        code = StringCharCodeAt(c, 0);
        if (!IsAsciiDigit(code))
          break;

        numText += c;
        current++;
      } while (true);
    }

    return ParseFloat(numText);
  };

  let tokenValue = null as TokenValue;

  const advanceColon = function* (): Generator<void, void, string> {
    yield* consumeWhitespace();

    if (atEnd() && (yield* atEOF()))
      ThrowSyntaxError("End of data looking for colon in object entry");

    if (StringCharCodeAt(fragment, current) !== Unicode.Colon as number)
      ThrowSyntaxError("Expected ':' after property name in object");

    current++;
  };

  const advanceObjectEnds = function* (): Generator<void, boolean, string> {
    yield* consumeWhitespace();

    if (atEnd() && (yield* atEOF()))
      ThrowSyntaxError("End of data after property value in object");

    const code = StringCharCodeAt(fragment, current++);
    if (code === Unicode.Comma as number)
      return false;
    if (code === Unicode.CloseBrace as number)
      return true;

    ThrowSyntaxError("Expected ',' or '}' after property value in object");
  };

  const advanceArrayEnds = function* (): Generator<void, boolean, string> {
    yield* consumeWhitespace();

    if (atEnd() && (yield* atEOF()))
      ThrowSyntaxError("End of data when ',' or ']' was expected");

    const code = StringCharCodeAt(fragment, current++);
    if (code === Unicode.Comma as number)
      return false;
    if (code === Unicode.CloseBracket as number)
      return true;

    ThrowSyntaxError("Expected property name or '}'");
  };

  const advance = function* (): Generator<void, TokenType, string> {
    yield* consumeWhitespace();

    if (atEnd() && (yield* atEOF()))
      ThrowSyntaxError("Unexpected end of data");

    const code = StringCharCodeAt(fragment, current);
    switch (code) {
      case Unicode.QuotationMark as number:
        tokenValue = yield* jsonString();
        return TokenType.String;

      case Unicode.SmallLetterT as number:
        yield* consumeKeyword("true");
        tokenValue = true;
        return TokenType.Boolean;

      case Unicode.SmallLetterF as number:
        yield* consumeKeyword("false");
        tokenValue = false;
        return TokenType.Boolean;

      case Unicode.SmallLetterN as number:
        yield* consumeKeyword("null");
        tokenValue = null;
        return TokenType.Null;

      case Unicode.OpenBracket as number:
        current++;
        return TokenType.ArrayOpen;
      case Unicode.CloseBracket as number:
        current++;
        return TokenType.ArrayClose;

      case Unicode.OpenBrace as number:
        current++;
        return TokenType.ObjectOpen;
      case Unicode.CloseBrace as number:
        current++;
        return TokenType.ObjectClose;

      case Unicode.Comma as number:
        current++;
        return TokenType.Comma;

      case Unicode.Colon as number:
        current++;
        return TokenType.Colon;
    }

    if (code === Unicode.Dash as number || IsAsciiDigit(code)) {
      tokenValue = yield* jsonNumber();
      return TokenType.Number;
    }

    ThrowSyntaxError("Unexpected character");
  };

  type PartialArray = JSONValue[];
  type ParsingArray = [ParseState.FinishArrayElement, PartialArray];
  type PartialObject = Partial<JSONObject>;
  type ParsingObject = [ParseState.FinishObjectMember, PartialObject, string];

  const stack: (ParsingArray | ParsingObject)[] = [];

  let value: JSONValue = "ERROR";

  let token: TokenType;
  let state = ParseState.Value as ParseState;
  toParseElementOrPropertyValue: do {
    toFinishValue: switch (state) {
      case ParseState.Value: {
        token = yield* advance();
        processValueToken: do {
          switch (token) {
            case TokenType.String:
            case TokenType.Number:
            case TokenType.Boolean:
            case TokenType.Null:
              value = tokenValue;
              break toFinishValue;

            case TokenType.ArrayOpen: {
              value = [] satisfies PartialArray;

              token = yield* advance();
              if (token === TokenType.ArrayClose)
                break toFinishValue;

              Push(stack, [ParseState.FinishArrayElement, value]);
              continue processValueToken;
            }

            case TokenType.ObjectOpen: {
              value = {} satisfies PartialObject;

              yield* consumeWhitespace();

              if (atEnd() && (yield* atEOF()))
                ThrowSyntaxError("End of data while reading object contents");

              const c = StringCharCodeAt(fragment, current);
              if (c === Unicode.CloseBrace as number) {
                current++;
                break toFinishValue;
              }

              if (c !== Unicode.QuotationMark as number)
                ThrowSyntaxError("Expected property name or '}'");

              Push(stack, [ParseState.FinishObjectMember, value, yield* jsonString()]);

              yield* advanceColon();

              type assert_stateIsAlreadyValue = Expect<
                Equal<
                  typeof state,
                  ParseState.Value
                >
              >;
              continue toParseElementOrPropertyValue;
            }

            case TokenType.ArrayClose:
            case TokenType.ObjectClose:
            case TokenType.Colon:
            case TokenType.Comma:
              ThrowSyntaxError(`Encountered token with internal value ${token} in value context`);

            default: {
              type assert_AllCasesHandled = Expect<Equal<typeof token, never>>;
            }
          }
        } while (true);
      }

      case ParseState.FinishObjectMember: {
        const objectInfo = stack[stack.length - 1] as ParsingObject;
        CreateDataProperty(objectInfo[1], objectInfo[2], value);

        if (yield* advanceObjectEnds()) {
          value = Pop(stack)[1];
          break toFinishValue;
        }

        yield* consumeWhitespace();

        if (atEnd() && (yield* atEOF()))
          ThrowSyntaxError("End of data where property name was expected");

        if (StringCharCodeAt(fragment, current) !== Unicode.QuotationMark as number)
          ThrowError("Expected property name");

        objectInfo[2] = yield* jsonString();

        yield* advanceColon();

        state = ParseState.Value;
        continue toParseElementOrPropertyValue;
      }

      case ParseState.FinishArrayElement: {
        const arrayInfo = stack[stack.length - 1] as ParsingArray;
        Push(arrayInfo[1], value);
        if (yield* advanceArrayEnds()) {
          value = Pop(stack)[1];
          break toFinishValue;
        }

        state = ParseState.Value;
        continue toParseElementOrPropertyValue;
      }
    }

    if (stack.length === 0)
      break;

    state = stack[stack.length - 1][0];
  } while (true);

  yield* consumeWhitespace();

  if (!atEnd())
    ThrowSyntaxError("Unexpected non-whitespace character after JSON data");

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
 * A JSON parser when you wish to incrementally parse your JSON in fragments,
 * rather than from one complete string.
 *
 * Feed fragments of JSON text to the parser by calling `add(fragment)`.  When
 * you've fed the entire JSON text to the parser, call `finish()` to get the
 * (optionally revived) result.
 *
 * If the concatenation of added fragments becomes not a prefix of valid JSON
 * text, or if the final concatenation of all fragments isn't valid JSON text,
 * the applicable `add(fragment)` or `finish()` will throw a `SyntaxError`.
 */
export class StreamingJSONParser {
  private parser = ParseJSON();
  private complete = false;

  constructor() {
    // Advance past the initial implicit yield to the first actual yield that
    // waits for a fragment.
    if (this.parser.next().done === true)
      BUG("parsing finished before any fragments added");
  }

  /**
   * Add a `fragment` of additional JSON text to the overall conceptual string
   * being parsed.
   *
   * @throws
   *   `SyntaxError` if adding this fragment makes the concatenation of all
   *   fragments not a valid prefix of JSON text.
   * @throws
   *   `Error` (exactly, not a subclass) if fragments can't be added because a
   *   previous `add(fragment)` already threw or because `finish()` was called.
   */
  add(fragment: string): void {
    if (this.complete)
      ThrowError("Can't add fragment: parsing already completed");

    // Filter out empty fragments so that "" can indicate end of JSON text.
    if (fragment.length === 0)
      return;

    try {
      if (this.parser.next(fragment).done === true)
        BUG("add(nonempty valid fragment) should never complete parsing");
    } catch (e) {
      this.complete = true;
      throw e;
    }
  }

  /**
   * Stop feeding fragments to this parser and compute and return the final
   * parse result.
   *
   * @throws
   *   `Error` if parsing was already `done()`.
   * @throws
   *   `SyntaxError` if the concatenation of all added fragments (which could be
   *   the empty string if no fragments were added) isn't valid JSON.  (It must
   *   be the *prefix* of valid JSON text or a preceding `add(fragment)` would
   *   have thrown.)
   * @returns
   *   The overall parse result if the concatenated fragments constitute valid
   *   JSON text.
   */
  finish(): JSONValue;
  /**
   * Stop feeding fragments to this parser, and compute the final parse result
   * as the value `unfiltered`.
   *
   * Then apply `reviver` to `unfiltered` (and recursively to its properties and
   * elements) exactly as
   * [`JSON.parse`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
   * would do if it were passed `reviver` and the concatenation of fragments
   * passed to this parser, and return the value `JSON.parse` would return
   * (which will be the result returned by the outermost call of `reviver`).
   *
   * @throws
   *   `Error` if parsing was already `done()`.
   * @throws
   *   `SyntaxError` if the concatenation of all added fragments (which could be
   *   the empty string if no fragments were added) isn't valid JSON.  (It must
   *   be the *prefix* of valid JSON text or a preceding `add(fragment)` would
   *   have thrown.)
   * @throws
   *   Any value that `reviver` throws during the reviving process.
   * @returns
   *   The overall parse result if the concatenated fragments constitute valid
   *   JSON text, as modified by `reviver`.
   */
  finish<T>(reviver: Reviver<T>): T;
  finish<T>(reviver?: Reviver<T>): ParseResult<typeof reviver> {
    if (this.complete) {
      ThrowError(
        "Can't call finish: it was either already called or a syntax error " +
        "was encountered",
      );
    }

    let unfiltered: JSONValue;
    try {
      const result = this.parser.next("");
      if (result.done === true)
        unfiltered = result.value;
      else
        ThrowSyntaxError("Complete text is not valid JSON");
    } finally {
      this.complete = true;
    }

    if (typeof reviver === "undefined")
      return unfiltered;

    // If a reviver was supplied, use it to compute the true desired value.
    const rootName = "";
    const root: object = { [rootName]: unfiltered };
    return InternalizeJSONProperty(root, rootName, reviver);
  }

  /**
   * Returns `true` if more fragments can be added to this parser and `finish()`
   * hasn't been called.  (Even if the concatenated fragments constitute a
   * complete JSON text, fragments containing only whitespace can still be
   * added.)
   *
   * Return `false` if no more fragments can be added (because `finish()` was
   * called or because a previously-added fragment caused a JSON syntax error).
   */
  done(): boolean {
    return this.complete;
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
