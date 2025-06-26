// This file defines helper functions that abstract away standard library
// function use, in order that such uses be easily identified as vectors for
// user-defined code to muck with package functionality.
//
// Ideally this package wouldn't invoke user-modifiable standard library
// functionality, for greatest faithfulness to standard library semantics.  If
// valid copies of standard library functions could be cached here (after
// ensuring this module is evaluated sufficiently early that no user code can
// modify the standard library), this could be done for stringification.
//
// But parsing is currently implemented using generator syntax and `yield*`, and
// `yield*` depends upon certain standard library prototypes having their
// original function values, making `yield*` a hijackable syntax:
//
// ```
// function* f() { yield 17; }
// function* g() { yield* f(); }
//
// function run() {
//   for (const v of g()) {
//     console.log(v);
//     break;
//   }
// }
//
// run(); // logs 17
//
// f().__proto__.__proto__.next = function() { return { value: 42, done: false }; };
//
// run(); // logs 42
// ```
//
// In light of this, there's not much point trying too hard to be hygienic.

export const ReflectApply = Reflect.apply;

export function DefineDataProperty(obj: object, key: string | number | symbol, value: unknown): boolean {
  return Reflect.defineProperty(obj, key, { value, enumerable: true, configurable: true, writable: true });
}

export function EnumerableOwnPropertyKeys(obj: object): string[] {
  return Object.keys(obj);
}

export function DeleteProperty(obj: object, prop: string | number | symbol): boolean {
  return Reflect.deleteProperty(obj, prop);
}

export function ToNumber(v: unknown): number {
  return +(v as any);
}

export const ToString = String;

export function Push<T>(arr: T[], t: NoInfer<T>): void {
  DefineDataProperty(arr, arr.length, t);
}

export const Pop = <T>(arr: T[]): T => {
  const t = arr[arr.length - 1];
  arr.length--;
  return t;
};

export const IsArray = Array.isArray;

// eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
export function ExtractBooleanData(obj: Boolean): boolean {
  return obj.valueOf();
}

// eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
export function ExtractBigIntData(obj: BigInt): bigint {
  return obj.valueOf();
}

export const JSONStringify = JSON.stringify;

export function ArrayContains<T>(arr: T[], t: T): boolean {
  return arr.includes(t);
}

export const StringFromCharCode = String.fromCharCode;

export function StringSlice(s: string, start: number, end: number): string {
  return s.slice(start, end);
}
