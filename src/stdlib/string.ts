/**
 * Convert a value to string, by ECMAScript `ToString` semantics.
 *
 * @see https://tc39.es/ecma262/#sec-tostring
 */
export const ToString = String;

/** Return a string consisting of all of the supplied character codes. */
export const StringFromCharCode = String.fromCharCode;

/**
 * Return a substring of `s` that starts with character `s[start]` and proceeds
 * up to (but does not include) the character at index `limit`.  If this would
 * exceed the string's length, return a slice ending at the end of the string.
 */
export function StringSlice(s: string, start: number, limit: number): string {
  return s.slice(start, limit);
}

/** Return a string consisting of `s` repeated `count` times. */
export function StringRepeat(s: string, count: number): string {
  return s.repeat(count);
}

/** Return the character code of `s[i]`. */
export function StringCharCodeAt(s: string, i: number): number {
  return s.charCodeAt(i);
}
