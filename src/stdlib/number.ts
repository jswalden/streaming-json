/**
 * Convert a value to number consistent with ECMAScript `ToNumber` semantics.
 *
 * @see https://tc39.es/ecma262/#sec-tonumber
 */
export function ToNumber(v: unknown): number {
  return +(v as any);
}

/** Convert a string of decimal digits to the number those digits identify. */
export function ParseDecimalDigits(digits: string): number {
  return parseInt(digits, 10);
}

/** Parse a JSON floating-point number to number value. */
export const ParseFloat = parseFloat;
