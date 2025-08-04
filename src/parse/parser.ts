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

/**
 * A type broadly characterizing all JSON-compatible objects that are not
 * arrays.
 */
export interface JSONObject {
  [key: string]: JSONValue | undefined;
};

/** A type broadly characterizing all JSON arrays. */
export type JSONArray = JSONValue[];

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

function BUG(msg: string): never {
  ThrowError(`BUG: ${msg}`);
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
  /** The current fragment being parsed. */
  private fragment = "";
  /** The index within `this.fragment` of the next unexamined character. */
  private current = 0;
  /** The length of `this.fragment`. */
  private end = 0;
  /** Whether all fragments have been added. */
  private eof = false;

  /**
   * Assuming `this.atEnd()`, wait for another fragment.  If the sentinel ""
   * fragment is received, return `true`.  Otherwise set it as the current
   * fragment and return `false` so that it can be parsed.
   */
  private *atEOF(): Generator<void, boolean, string> {
    if (this.current !== this.end)
      BUG("atEOF called when !atEnd()");
    if (this.eof)
      return true;

    const data = yield;
    if (data.length === 0) {
      this.eof = true;
      return true;
    }

    this.fragment = data;
    this.current = 0;
    this.end = data.length;
    return false;
  }

  /** Whether we've parsed to the end of the current fragment. */
  private atEnd(): boolean {
    if (this.current > this.end)
      BUG("incremented current past end");
    return this.current === this.end;
  }

  /**
   * Consume whitespace until the current character isn't whitespace (or all
   * JSON text has been processed).
   */
  private *consumeWhitespace(): Generator<void, void, string> {
    do {
      while (!this.atEnd()) {
        const c = StringCharCodeAt(this.fragment, this.current);
        if (!(c === Unicode.SP as number ||
          c === Unicode.LF as number ||
          c === Unicode.CR as number ||
          c === Unicode.HT as number))
          return;
        this.current++;
      }

      if (yield* this.atEOF())
        return;
    } while (true);
  }

  /** Consume the given keyword starting from the current character. */
  private *consumeKeyword(keyword: string): Generator<void, void, string> {
    let i = 0;
    while (i < keyword.length) {
      if (this.atEnd() && (yield* this.atEOF()))
        ThrowSyntaxError(`End of data in middle of '${keyword}' keyword`);

      const amount = Min(keyword.length - i, this.end - this.current);
      if (StringSlice(keyword, i, i + amount) !==
        StringSlice(this.fragment, this.current, this.current + amount))
        ThrowSyntaxError(`Malformed '${keyword}' keyword`);

      this.current += amount;
      i += amount;
    }
  }

  /** Consume and return a JSON string, starting at its leading `"`. */
  private *jsonString(): Generator<void, string, string> {
    if (this.atEnd() || StringCharCodeAt(this.fragment, this.current) !== Unicode.QuotationMark as number)
      BUG("jsonString called while not at start of string");
    this.current++;

    let value = "";
    do {
      if (this.atEnd() && (yield* this.atEOF()))
        ThrowSyntaxError("Unterminated string literal");

      let c = this.fragment[this.current++];
      let code = StringCharCodeAt(c, 0);
      if (code === Unicode.QuotationMark as number)
        return value;

      if (code < (Unicode.SP as number))
        ThrowSyntaxError("Bad control character in string literal");

      if (code === Unicode.Backslash as number) {
        if (this.atEnd() && (yield* this.atEOF()))
          ThrowSyntaxError("Incomplete escape sequence");

        c = this.fragment[this.current++];
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
              if (this.atEnd() && (yield* this.atEOF()))
                ThrowSyntaxError("Too-short Unicode escape");

              const amount = Min(4 - digits, this.end - this.current);
              for (let i = 0; i < amount; i++) {
                const n = HexDigitToNumber(this.fragment, this.current + i);
                if (n === null)
                  ThrowSyntaxError(`Bad Unicode escape digit '${this.fragment[this.current + i]}'`);
                code = (code << 4) | n;
              }
              digits += amount;
              this.current += amount;
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
  }

  /** Consume and return a JSON number, starting at its leading digit or `-`. */
  private *jsonNumber(): Generator<void, number, string> {
    if (this.atEnd())
      BUG("jsonNumber called while at end of fragment");

    // ^-?(0|[1-9][0-9]+)(\.[0-9]+)?([eE][\+\-]?[0-9]+)?$
    let c = this.fragment[this.current];
    let code = StringCharCodeAt(c, 0);
    if (!(code === Unicode.Dash as number || IsAsciiDigit(code)))
      BUG("jsonNumber called while not at start of number");

    let numText = "";

    // -?
    if (code === Unicode.Dash as number) {
      numText += c;
      this.current++;
      if (this.atEnd() && (yield* this.atEOF()))
        ThrowSyntaxError("Missing number after '-'");

      c = this.fragment[this.current];
      code = StringCharCodeAt(c, 0);
      if (!IsAsciiDigit(code))
        ThrowSyntaxError("Unexpected nondigit");
    }

    // 0|[1-9][0-9]+
    numText += c;
    this.current++;
    if (code !== Unicode.Zero as number) {
      do {
        if (this.atEnd()) {
          if (yield* this.atEOF())
            return ParseDecimalDigits(numText);
        }

        c = this.fragment[this.current];
        code = StringCharCodeAt(c, 0);
        if (!IsAsciiDigit(code))
          break;

        numText += c;
        this.current++;
      } while (true);
    }

    if (code !== Unicode.Period as number &&
      (code & ~0x0010_0000) !== Unicode.LargeLetterE as number)
      return ParseDecimalDigits(numText);

    // (\.[0-9]+)?
    if (code === Unicode.Period as number) {
      numText += c;
      this.current++;
      if (this.atEnd() && (yield* this.atEOF()))
        ThrowSyntaxError("Missing digits after decimal point");

      c = this.fragment[this.current];
      code = StringCharCodeAt(c, 0);
      if (!IsAsciiDigit(code))
        ThrowSyntaxError("Unterminated fractional number");
      numText += c;
      this.current++;

      do {
        if (this.atEnd() && (yield* this.atEOF()))
          return ParseFloat(numText);

        c = this.fragment[this.current];
        code = StringCharCodeAt(c, 0);
        if (!IsAsciiDigit(code))
          break;

        numText += c;
        this.current++;
      } while (true);
    }

    // ([eE][\+\-]?[0-9]+)?
    if ((code & ~0b0010_0000) === Unicode.LargeLetterE as number) {
      numText += c;
      this.current++;
      if (this.atEnd() && (yield* this.atEOF()))
        ThrowSyntaxError("Missing digits after exponent indicator");

      c = this.fragment[this.current];
      code = StringCharCodeAt(c, 0);
      if (code === Unicode.Plus as number || code === Unicode.Dash as number) {
        numText += c;
        this.current++;

        if (this.atEnd() && (yield* this.atEOF()))
          ThrowSyntaxError("Missing digits after exponent sign");
      }

      c = this.fragment[this.current];
      code = StringCharCodeAt(c, 0);
      if (!IsAsciiDigit(code))
        ThrowSyntaxError("Exponent part is missing a number");
      numText += c;
      this.current++;

      do {
        if (this.atEnd() && (yield* this.atEOF()))
          break;

        c = this.fragment[this.current];
        code = StringCharCodeAt(c, 0);
        if (!IsAsciiDigit(code))
          break;

        numText += c;
        this.current++;
      } while (true);
    }

    return ParseFloat(numText);
  }

  /**
   * Consume the (optional whitespace and) colon after a property name in an
   * object literal.
   */
  private *advanceColon(): Generator<void, void, string> {
    yield* this.consumeWhitespace();

    if (this.atEnd() && (yield* this.atEOF()))
      ThrowSyntaxError("End of data looking for colon in object entry");

    if (StringCharCodeAt(this.fragment, this.current) !== Unicode.Colon as number)
      ThrowSyntaxError("Expected ':' after property name in object");

    this.current++;
  }

  /**
   * Consume the (optional whitespace and) `,` or `}` after a property value in
   * an object literal.
   *
   * @returns `true` iff `}` was consumed and the object has ended
   */
  private *advanceObjectEnds(): Generator<void, boolean, string> {
    yield* this.consumeWhitespace();

    if (this.atEnd() && (yield* this.atEOF()))
      ThrowSyntaxError("End of data after property value in object");

    const code = StringCharCodeAt(this.fragment, this.current++);
    if (code === Unicode.Comma as number)
      return false;
    if (code === Unicode.CloseBrace as number)
      return true;

    ThrowSyntaxError("Expected ',' or '}' after property value in object");
  }

  /**
   * Consume the (optional whitespace and) `,` or `]` after an element in an
   * array literal.
   *
   * @returns `true` iff `]` was consumed and the array has ended
   */
  private *advanceArrayEnds(): Generator<void, boolean, string> {
    yield* this.consumeWhitespace();

    if (this.atEnd() && (yield* this.atEOF()))
      ThrowSyntaxError("End of data when ',' or ']' was expected");

    const code = StringCharCodeAt(this.fragment, this.current++);
    if (code === Unicode.Comma as number)
      return false;
    if (code === Unicode.CloseBracket as number)
      return true;

    ThrowSyntaxError("Expected property name or '}'");
  }

  /** The value of the atomic token consumed by an `advance`. */
  private tokenValue: boolean | string | number | null = null;

  /** Advance and consume a token, in context where a JSON value is expected. */
  private *advance(): Generator<void, TokenType, string> {
    yield* this.consumeWhitespace();

    if (this.atEnd() && (yield* this.atEOF()))
      ThrowSyntaxError("Unexpected end of data");

    const code = StringCharCodeAt(this.fragment, this.current);
    switch (code) {
      case Unicode.QuotationMark as number:
        this.tokenValue = yield* this.jsonString();
        return TokenType.String;

      case Unicode.SmallLetterT as number:
        yield* this.consumeKeyword("true");
        this.tokenValue = true;
        return TokenType.Boolean;

      case Unicode.SmallLetterF as number:
        yield* this.consumeKeyword("false");
        this.tokenValue = false;
        return TokenType.Boolean;

      case Unicode.SmallLetterN as number:
        yield* this.consumeKeyword("null");
        this.tokenValue = null;
        return TokenType.Null;

      case Unicode.OpenBracket as number:
        this.current++;
        return TokenType.ArrayOpen;
      case Unicode.CloseBracket as number:
        this.current++;
        return TokenType.ArrayClose;

      case Unicode.OpenBrace as number:
        this.current++;
        return TokenType.ObjectOpen;
      case Unicode.CloseBrace as number:
        this.current++;
        return TokenType.ObjectClose;

      case Unicode.Comma as number:
        this.current++;
        return TokenType.Comma;

      case Unicode.Colon as number:
        this.current++;
        return TokenType.Colon;
    }

    if (code === Unicode.Dash as number || IsAsciiDigit(code)) {
      this.tokenValue = yield* this.jsonNumber();
      return TokenType.Number;
    }

    ThrowSyntaxError("Unexpected character");
  }

  /**
   * A generator for incrementally parsing a JSON text from nonempty fragments.
   * (Callers must filter out empty fragments manually if they choose to support
   * them.)
   *
   * After the implicit initial `yield` is passed by calling `.next()`, add the
   * nonempty fragments of JSON text using `.next(fragment)`.  Indicate that all
   * fragments have been added using `.next("")`.
   *
   * If a `.next(fragment)` causes the concatenated fragments to not be a valid
   * prefix of JSON text, or if the concatenated fragments upon `.next("")` form
   * invalid JSON text, the pertinent `.next()` throws a `SyntaxError`.
   *
   * If upon `.next("")` the concatenated fragments form valid JSON text, that
   * call returns `{ done: true, value: <result of parsing the JSON text> }`.
   */
  private *parseJSON(): Generator<void, JSONValue, string> {
    type PartialArray = JSONValue[];
    type ParsingArray = [ParseState.FinishArrayElement, PartialArray];
    type PartialObject = Partial<JSONObject>;
    type ParsingObject = [ParseState.FinishObjectMember, PartialObject, string];

    const stack: (ParsingArray | ParsingObject)[] = [];

    let value: JSONValue = "ERROR"; // overwritten when the value is parsed

    const enum ParseState {
      FinishArrayElement,
      FinishObjectMember,
      Value,
    };

    let token: TokenType;
    let state: ParseState = ParseState.Value;
    toParseElementOrPropertyValue: do {
      toFinishValue: switch (state) {
        case ParseState.Value: {
          token = yield* this.advance();
          processValueToken: do {
            switch (token) {
              case TokenType.String:
              case TokenType.Number:
              case TokenType.Boolean:
              case TokenType.Null:
                value = this.tokenValue;
                break toFinishValue;

              case TokenType.ArrayOpen: {
                value = [] satisfies PartialArray;

                token = yield* this.advance();
                if (token === TokenType.ArrayClose)
                  break toFinishValue;

                Push(stack, [ParseState.FinishArrayElement, value]);
                continue processValueToken;
              }

              case TokenType.ObjectOpen: {
                value = {} satisfies PartialObject;

                yield* this.consumeWhitespace();

                if (this.atEnd() && (yield* this.atEOF()))
                  ThrowSyntaxError("End of data while reading object contents");

                const c = StringCharCodeAt(this.fragment, this.current);
                if (c === Unicode.CloseBrace as number) {
                  this.current++;
                  break toFinishValue;
                }

                if (c !== Unicode.QuotationMark as number)
                  ThrowSyntaxError("Expected property name or '}'");

                Push(stack, [ParseState.FinishObjectMember, value, yield* this.jsonString()]);

                yield* this.advanceColon();

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

          if (yield* this.advanceObjectEnds()) {
            value = Pop(stack)[1];
            break toFinishValue;
          }

          yield* this.consumeWhitespace();

          if (this.atEnd() && (yield* this.atEOF()))
            ThrowSyntaxError("End of data where property name was expected");

          if (StringCharCodeAt(this.fragment, this.current) !== Unicode.QuotationMark as number)
            ThrowError("Expected property name");

          objectInfo[2] = yield* this.jsonString();

          yield* this.advanceColon();

          state = ParseState.Value;
          continue toParseElementOrPropertyValue;
        }

        case ParseState.FinishArrayElement: {
          const arrayInfo = stack[stack.length - 1] as ParsingArray;
          Push(arrayInfo[1], value);
          if (yield* this.advanceArrayEnds()) {
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

    yield* this.consumeWhitespace();

    if (!this.atEnd())
      ThrowSyntaxError("Unexpected non-whitespace character after JSON data");

    return value;
  }

  private parser: Generator<void, JSONValue, string> = this.parseJSON();
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
  public add(fragment: string): void {
    if (this.complete)
      ThrowError("Can't add fragment: parsing already completed");

    // Ignore empty fragments that would mistakenly indicate end of JSON text.
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
  public finish(): JSONValue;
  /**
   * Stop feeding fragments to this parser, and compute the final parse result
   * as the value `unfiltered`.
   *
   * Then apply `reviver` to `unfiltered` (and recursively to its properties and
   * elements) exactly as {@link JSON.parse} would do if it passed `reviver` and
   * the concatenation of fragments passed to this parser, and return the value
   * {@link JSON.parse} would return (which will be the result returned by the
   * outermost call of `reviver`).
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
  public finish<T>(reviver: Reviver<T>): T;
  public finish<T>(reviver?: Reviver<T>): ParseResult<typeof reviver> {
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
    const root = { [rootName]: unfiltered };
    return InternalizeJSONProperty(root, rootName, reviver);
  }

  /**
   * Return `true` if more fragments can be added to this parser and `finish()`
   * hasn't been called.  (Even if the concatenated fragments constitute a
   * complete JSON text, fragments containing only whitespace can still be
   * added.)
   *
   * Return `false` if no more fragments can be added (because `finish()` was
   * called or because a previously-added fragment caused a JSON syntax error).
   */
  public done(): boolean {
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
