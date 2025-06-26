# streaming-json

This package implements streaming versions of
[`JSON.parse`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
and
[`JSON.stringify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
functionality.

The operations in this package behave consistent with ECMAScript semantics, but
modifications to various standard-library functionality can interfere with these
semantics.  (And, of course, user-supplied callback functions can perform
actions that might observably disturb the intermediate states created by
ECMAScript semantics.)

## Stringification

This package implements two stringification function entrypoints: `stringify`
and `stringifyAsync`.  You can either import the specific function you need:

```js
import { stringifyAsync } from "@jswalden/streaming-json";

async function writeJSONToFileAsync(value, file) {
  return stringifyAsync(value, null, "  ", async (s) => {
    await file.write(s);
  });
}
```

Or you can do a wildcard import of the and use it similar to how you would use
the `JSON` object:

```js
import * as StreamingJSON from "@jswalden/streaming-json";

async function writeJSONToFileAsync(value, file) {
  return StreamingJSON.stringifyAsync(value, null, "  ", async (s) => {
    await file.write(s);
  });
}

function writeJSONToFile(value, file) {
  StreamingJSON.stringify(value, null, "  ", (s) => {
    file.write(s);
  })
}
```

`stringify` and `stringifyAsync` implement JSON stringification where it's
undesirable (or impossible, because the entire stringification is too large
to represent as a JS string or in memory) to compute the entire JSON string at
once, taking the standard `JSON.stringify` interface and adding an `emit`
callback function as trailing argument (and adding `async` and internal `await`s
to make `stringifyAsync` asynchronous).  They stringify some portion of the
value, call `emit` with the computed fragment, then repeat until stringification
completes.[^between-emits]

[^between-emits]: If the object graph being stringified is modified within the
`emit` callback operation, or if it is modified between the asynchronously
performed jobs that compose the `stringifyAsync` algorithm, stringification
behavior will change in potentially unpredictable ways.  You should somehow
protect your value being stringified from modification while it's being
stringified to prevent confusing behavior.

How stringification is broken into fragments is not defined.  Thus for example
`stringify(true, null, "", emit)` might perform `emit("t")`, `emit("ru")`,
`emit("e")` -- or instead simply `emit("true")`.

The `emit` callback is called synchronously.  For `stringify`, stringification
resumes after `emit` returns.  For `stringifyAsync`, stringification resumes
after the promise returned from `emit` settles.  If `emit` throws (or in the
latter case, if it returns a promise that rejects), that error propagates
through the overall stringification operation.  (Errors that occur during
stringification from property gets, `toJSON`, and similar are also propagated.)

As long as type signatures are respected, the stringification performed by these
functions is consistent with `JSON.stringify(value, replacer, space)` except
where `JSON.stringify` would return `undefined`.[^stringify-not-string]  We
handle such cases by converting the value to `null`, as it would be converted if
it had been encountered as an element of an array being stringified.

```js
import { stringify } from "@jswalden/streaming-json";

const value = () => 42;

let res = JSON.stringify(value, null, 2);
assert(res === undefined);

let out = "";
stringify(value, null, 2, (s) => { out += s; });
assert(out === "null");
```

Successful stringification thus always calls `emit` at least once.

[^stringify-not-string]: `JSON.stringify` returns `undefined` if the `value`
passed to it is `undefined`, a
[symbol](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol),
a callable object (i.e. `typeof value === "function"`), or an object whose
`toJSON` property is a function that returns one of these values.

## Parsing

This package exports a `StreamingJSONParser` class that can be used to
incrementally parse fragments of a full JSON text.  Create a
`StreamingJSONParser`, feed it fragments of the JSON text using `add(fragment)`,
and then finish parsing and retrieve the result of parsing using `finish()` --
passing a `reviver` that behaves as the optional `reviver` argument to
`JSON.parse` would if desired:

```js
import { JSONParser } from "@jswalden/streaming-json";

const parser = new StreamingJSONParser();

parser.add("{");
parser.add('"property');
parser.add('Name": 1');
parser.add('7, "complex": {');
parser.add("}}");

const result = parser.finish();
assert(result && typeof result === "object");
assert(result.propertyName === 17);
assert(result.complex !== null);
assert(Object.keys(result.complex).length === 0);

const withReviver = new StreamingJSONParser();

parser.add("true");

const resultWithReviver = parser.finish(function(_name, _value) {
  // throws away `this[_name] === _value` where `_value === true`
  return 42;
});
assert(resultWithReviver === 42);
```

As soon as the fragments received cannot be the prefix of valid JSON,
`add(fragment)` will throw a `SyntaxError`, and subsequent calls of
`StreamingJSONParser` member functions will rethrow that same `SyntaxError`.
Syntax errors are detected and thrown at the earliest possible instance.
