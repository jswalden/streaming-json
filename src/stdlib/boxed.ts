/* eslint-disable @typescript-eslint/no-wrapper-object-types */

// XXX The spec requires that all these functions behave identically on
//     same-realm and cross-realm instances.  However, the only way to do this
//     would be using `ReflectApply(Number.prototype.valueOf, value, [])` and
//     similar and catching the exception in the (likely) case that `value`
//     isn't that kind of boxed object -- incurring the unreasonable overhead of
//     creating, throwing, and catching four exceptions per same-realm non-boxed
//     object/array being stringified.  So we knowingly use a fast but wrong
//     approach that doesn't handle cross-realm boxed objects.

/** Return whether `obj` has a `[[BigIntData]]` internal slot. */
export function HasBigIntDataSlot(obj: object): obj is BigInt {
  return obj instanceof BigInt;
}

/** Given a `BigInt` object `obj`, return `obj.[[BigIntData]]`. */
export function ExtractBigIntData(obj: BigInt): bigint {
  return obj.valueOf();
}

/** Return whether `obj` has a `[[BooleanData]]` internal slot. */
export function HasBooleanDataSlot(obj: object): obj is Boolean {
  return obj instanceof Boolean;
}

/** Given a `Boolean` object `obj`, return `obj.[[BooleanData]]`. */
export function ExtractBooleanData(obj: Boolean): boolean {
  return obj.valueOf();
}

/** Return whether `obj` has a `[[NumberData]]` internal slot. */
export function HasNumberDataSlot(obj: object): obj is Number {
  return obj instanceof Number;
}

/** Return whether `obj` has a `[[StringData]]` internal slot. */
export function HasStringDataSlot(obj: object): obj is String {
  return obj instanceof String;
}
