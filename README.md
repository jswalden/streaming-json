# streaming-json

This package implements streaming versions of
[`JSON.parse`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
and
[`JSON.stringify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
functionality.

The operations in this package behave consistent with ECMAScript semantics, but
modifications to various standard-library functionality can interfere with these
semantics.  (And, of course, user code between iteration operations or between
additions of JSON fragments to a parser can perform actions that might
observably disturb the intermediate states created by ECMAScript semantics.)

## Stringification

This package implements two stringification function entrypoints: `stringify`
and `stringifyAsync`.  You can either import the specific function you need:

```js
import { stringifyAsync } from "@jswalden/streaming-json";

async function writeJSONToFileAsync(value, file) {
  for await (const frag of stringifyAsync(value, null, "  ")) {
    await file.write(frag);
  }
}
```

Or you can do a wildcard import of the and use it similar to how you would use
the `JSON` object:

```js
import * as StreamingJSON from "@jswalden/streaming-json";

async function writeJSONToFileAsync(value, file) {
  for await (const frag of StreamingJSON.stringifyAsync(value, null, "  ")) {
    await file.write(frag);
  }
}

function writeJSONToFile(value, file) {
  for (const frag of StreamingJSON.stringify(value, null, "  "))
    file.write(frag);
}
```

`stringify` and `stringifyAsync` implement JSON stringification where it's
undesirable (or impossible, because the entire stringification is too large
to represent as a JS string or in memory) to compute the entire JSON string at
once.  They accept the same arguments as `JSON.stringify` (albeit with certain
narrowing of types for clearer code).  Each returns a generator yielding
(asynchronously, for `stringifyAsync`) successive fragments of the overall JSON
stringification.[^between-emits]

[^between-emits]: If the object graph being stringified is modified between
calls to the generator's `next()` function (or between the asynchronously
performed jobs triggered by `next()` that compose the `stringifyAsync`
algorithm), stringification behavior will be changed in potentially
unpredictable ways.  You should take care to protect your value being
stringified from modification during the stringification process to prevent
confusing behavior.

How stringification is broken into fragments is not defined.  Thus for example
`stringify(true, null, "")` might successively yield `"t"`, `"ru"`, `"e"`
&mdash; or instead simply `"true"`.  Don't try to infer where fragmentation
boundaries will appear!

If any operation in the stringification algorithm throws (e.g. property gets,
`toJSON` invocations, stray `bigint` values in the graph), the `next()` call
that triggers it will throw that value (or reject the returned promise, for
`stringifyAsync`).

As long as type signatures are respected, the stringification performed by these
functions is consistent with `JSON.stringify(value, replacer, space)`.  However,
one special case must be noted: cases where `JSON.stringify` would return the
literal value `undefined` and not a string value.[^stringify-not-string]  We
handle such cases by yielding no fragments:

```js
import { stringify } from "@jswalden/streaming-json";

const value = () => 42;

let res = JSON.stringify(value, null, 2);
assert(res === undefined);

let frags = [...stringify(value, null, 2)];
assert(frags.length === 0);
```

It's incumbent upon users who try to stringify sufficiently-broad values that
they appropriately handle the case where no fragments are yielded.

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

If the fragments can't be the prefix of valid JSON, the `add(fragment)` that
creates this condition will throw a `SyntaxError`.  If the fragments aren't
valid JSON at time `finish()` is called, `finish()` will throw a `SyntaxError`.
`add(fragment)` and `finish()` may only be called while parsing is incomplete
and has not fallen into error: after this the parser is no longer usable.
