/**
 * Attempt to define an enumerable, configurable, writable property of the given
 * name with the specified value.  Return true/false indicating whether the
 * definition attempt succeeded.
 *
 * (The attempt will not succeed if it would redefine a nonconfigurable property
 * or would add a new property to a nonextensible `obj`.)
 *
 * @see https://tc39.es/ecma262/#sec-createdataproperty
 */
export function CreateDataProperty(obj: object, key: string | number | symbol, value: unknown): boolean {
  return Reflect.defineProperty(obj, key, { value, enumerable: true, configurable: true, writable: true });
}

/**
 * Return an array of the names of all own properties of `obj`.
 *
 * @see https://tc39.es/ecma262/#sec-enumerableownproperties
 */
export function EnumerableOwnPropertyKeys(obj: object): string[] {
  return Object.keys(obj);
}

/** Perform and return `obj.[[Delete]](prop)`. */
export function DeleteProperty(obj: object, prop: string | number | symbol): boolean {
  return Reflect.deleteProperty(obj, prop);
}
