/** @see https://tc39.es/ecma262/#eqn-truncate */
export function Truncate(n: number): number {
  if (!Number.isFinite(n))
    throw new RangeError("Truncate only handles finite numbers");
  return Math.trunc(n);
}
