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

This package implements a `stringify` function that returns an iterator over the
fragments that constitute the JSON stringification of a value.  You can either
import `stringify` directly:

```js
import { stringify } from "@jswalden/streaming-json";

async function writeAsJSONToFileAsync(value, file) {
  for (const frag of stringify(value, null, "  ")) {
    await file.write(frag);
  }
}
```

Or you import the module as a wildcard, with resulting aesthetics similar to
using `JSON.stringify` itself:

```js
import * as StreamingJSON from "@jswalden/streaming-json";

async function writeAsJSONToFileAsync(value, file) {
  for (const frag of StreamingJSON.stringify(value, null, "  ")) {
    await file.write(frag);
  }
}
```

`stringify` implements JSON stringification where it's undesirable (or
impossible because the entire stringification is too large to represent as a JS
string or in memory) to compute the entire JSON string at once.  It accepts the
same arguments as `JSON.stringify` (albeit with narrower types to make clearer
code).  It returns an iterator that yields successive fragments of the overall
JSON stringification.[^between-emits]

[^between-emits]: If the object graph being stringified is modified between
calls to the iterator's `next()` function, stringification behavior will change
in potentially unexpected ways.  You should take care to protect your value
being stringified from modification during the stringification process to
prevent confusing behavior.

Where fragment boundaries are placed is explicitly not defined.  Thus for
example `stringify(true, null, "")` might successively yield `"t"`, `"ru"`,
`"e"` &mdash; or instead simply `"true"`.  Don't make semantically visible
distinctions based on where these boundaries occur!

If any operation during iteration throws (e.g. property gets, `toJSON`
invocations, stray `bigint` values in the graph), the `next()` call that
triggers that operation will throw that value.

As long as type signatures are respected, the stringification performed by
`stringify` is the same as `JSON.stringify(value, replacer, space)` performs.
However, one special case must be noted: if `JSON.stringify` would return the
literal value `undefined` and not a string value[^stringify-not-string], the
iterator returned by `stringify` will produce no fragments:

```js
import { stringify } from "@jswalden/streaming-json";

const value = () => 42;

let res = JSON.stringify(value, null, 2);
assert(res === undefined); // not a string value!

let frags = [...stringify(value, null, 2)];
assert(frags.length === 0);
```

It's incumbent upon users who try to stringify sufficiently-broad values to
appropriately handle no fragments being iterated.

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

withReviver.add("true");

const resultWithReviver = withReviver.finish(function(_name, _value) {
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
