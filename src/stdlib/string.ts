/** @see https://tc39.es/ecma262/#sec-tostring */
export const ToString = String;

/** Return a string consisting of all of the supplied character codes. */
export const StringFromCharCode = String.fromCharCode;

/**
 * Return a substring of `s` that starts with character `s[start]` and proceeds
 * up to (but does not include) the character at index `limit`.
 */
export function StringSlice(s: string, start: number, limit: number): string {
  return s.slice(start, limit);
}
