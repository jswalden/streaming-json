/**
 * Throw an `Error` instance (that is, `Error` exactly, not a subclass of it)
 * with the given message.
 */
export function ThrowError(msg: string): never {
  throw new Error(msg);
}

/** Throw a `RangeError` instance with the given message. */
export function ThrowRangeError(msg: string): never {
  throw new RangeError(msg);
}

/** Throw a `SyntaxError` instance with the given message. */
export function ThrowSyntaxError(msg: string): never {
  throw new SyntaxError(msg);
}

/** Throw a `TypeError` instance with the given message. */
export function ThrowTypeError(msg: string): never {
  throw new TypeError(msg);
}
