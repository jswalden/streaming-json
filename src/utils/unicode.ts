export const enum Unicode {
  HT = 0x0009,
  LF = 0x000a,
  CR = 0x000d,
  SP = 0x0020,
  QuotationMark = 0x0022,
  Comma = 0x002c,
  Dash = 0x002d,
  Zero = 0x0030,
  Nine = 0x0039,
  Colon = 0x003a,
  OpenBracket = 0x005b,
  CloseBracket = 0x005d,
  SmallLetterF = 0x0066,
  SmallLetterN = 0x006e,
  SmallLetterT = 0x0074,
  OpenBrace = 0x007b,
  CloseBrace = 0x007d,
};

export function IsAsciiDigit(c: number): boolean {
  return Unicode.Zero as number <= c && c <= (Unicode.Nine as number);
}
