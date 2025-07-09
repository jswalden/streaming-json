/** Given a `BigInt` object `obj`, return `obj.[[BigIntData]]`. */
// eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
export function ExtractBigIntData(obj: BigInt): bigint {
  return obj.valueOf();
}
