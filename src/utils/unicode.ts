import { StringCharCodeAt } from "../stdlib/string.js";

/**
 * Various Unicode code point values as inlinable constants.
 *
 * Because this is a `const enum`, values are inlined at point of use.
 * Unfortunately uses typically must be explicitly cast to `number` to avoid
 * `enum` comparison warnings.  Such is life.
 */
export const enum Unicode {
  HT = 0x0009,
  LF = 0x000a,
  CR = 0x000d,
  SP = 0x0020,
  QuotationMark = 0x0022,
  Plus = 0x002b,
  Comma = 0x002c,
  Dash = 0x002d,
  Period = 0x002e,
  ForwardSlash = 0x002f,
  Zero = 0x0030,
  Nine = 0x0039,
  Colon = 0x003a,
  LargeLetterA = 0x0041,
  LargeLetterE = 0x0045,
  LargeLetterF = 0x0046,
  OpenBracket = 0x005b,
  Backslash = 0x005c,
  CloseBracket = 0x005d,
  SmallLetterA = 0x0061,
  SmallLetterB = 0x0062,
  SmallLetterF = 0x0066,
  SmallLetterN = 0x006e,
  SmallLetterR = 0x0072,
  SmallLetterT = 0x0074,
  SmallLetterU = 0x0075,
  OpenBrace = 0x007b,
  CloseBrace = 0x007d,
};

/** Return true iff the supplied character code is an ASCII decimal digit. */
export function IsAsciiDigit(c: number): boolean {
  return Unicode.Zero as number <= c && c <= (Unicode.Nine as number);
}

/**
 * Convert `fragment[i]` to the number it encodes as hex digit.  If it doesn't
 * encode a hex digit, return `null`.
 */
export function HexDigitToNumber(fragment: string, i: number): number | null {
  let c = StringCharCodeAt(fragment, i);
  if (Unicode.Zero as number <= c && c <= (Unicode.Nine as number))
    return c - Unicode.Zero;

  c &= ~0b0010_0000;
  if (Unicode.LargeLetterA as number <= c && c <= (Unicode.LargeLetterF as number))
    return c - Unicode.LargeLetterA + 10;

  return null;
}
