# Stdlib wrappers

Files in this directory define helper functions that abstract away standard
library function use, in order that such uses be easily identified as vectors
for user-defined code to muck with package functionality.  (We don't bother to
abstract away use of the various `Error` constructors as they're trivially found
by searching.)

Ideally this package wouldn't invoke user-modifiable standard library
functionality, for greatest faithfulness to standard library semantics.  It
might, for example, cache valid copies of standard library functions at package
load whose semantics it could depend on no matter what happens beyond them.

But parsing and stringification currently both use generators &mdash; and
specifically they use `yield*`.  And `yield*` depends upon certain standard
library prototypes having their original function values -- making it possible
to hijack the behavior of `yield*` outside package code:

```js
function* f() { yield 17; }
function* g() { yield* f(); }

function run() {
  for (const v of g()) {
    console.log(v);
    break;
  }
}

run(); // logs 17

f().__proto__.__proto__.next = function() { return { value: 42, done: false }; };
run(); // logs 42
```

Given this pitfall, there's not much point trying *too* hard to be hygienic now.
