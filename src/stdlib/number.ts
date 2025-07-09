/** @see https://tc39.es/ecma262/#sec-tonumber */
export function ToNumber(v: unknown): number {
  return +(v as any);
}
