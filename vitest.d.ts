export {};

// Custom matcher hookup (with TypeScript support) implementation is courtesy of
// the pattern described here:
//
// https://stackoverflow.com/questions/78492545/adding-vitest-d-env-for-custom-matchers-breaks-vitest-ts-support/78524129#78524129
//
// Particularly helpfully, this answer included not merely a runthrough of the
// separate files and their purposes/contents in passing, but also *code blocks
// containing the exact contents of the separate files*.

interface CustomMatchers<R = unknown> {
  /**
   * Expect that the function passed to `expect` throws an error of the given
   * error constructor (e.g. `Error`, `SyntaxError`, and so on) whose message
   * contains the given string as substring or matches the given regular
   * expression.
   */
  toThrowErrorMatching: <C extends ErrorConstructor>(ctor: C, matcher: string | RegExp) => R;
}

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- this is how vitest does it
  interface Assertion<T = any> extends CustomMatchers<T> {}
}
