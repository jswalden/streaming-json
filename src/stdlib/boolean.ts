/** Given a `Boolean` object `obj`, return `obj.[[BooleanData]]`. */
// eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
export function ExtractBooleanData(obj: Boolean): boolean {
  return obj.valueOf();
}
