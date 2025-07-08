/**
 * Return whether a set `set` has element `t`, using `SameValueZero` semantics
 * (that equate zeroes of any sign and `NaN` and otherwise equate `SameValue`
 * values).
 */
export function SetHas<T>(set: Set<T>, t: T): boolean {
  return set.has(t);
}

/** Add an element `t` to `set`. */
export function SetAdd<T>(set: Set<T>, t: T): void {
  set.add(t);
}
