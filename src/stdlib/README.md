# Stdlib wrappers

Files in this directory define helper functions that abstract away standard
library function use, in order that such uses be easily identified as vectors
for user-defined code to muck with package functionality.

Ideally this package wouldn't invoke user-modifiable standard library
functionality, for greatest faithfulness to standard library semantics.  And if
valid copies of standard library functions could be cached at package load
(after ensuring package code is evaluated sufficiently early that no user code
can modify the standard library), this could be done for stringification.

But parsing is currently implemented using generator syntax and `yield*`.
`yield*` depends upon certain standard library prototypes having their original
function values -- thereby making `yield*` externally-hijackable syntax:

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

In light of this, there's not much point trying *too* hard to be hygienic now.
