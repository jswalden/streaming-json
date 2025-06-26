import type { ExpectFalse } from "type-testing";

export { stringify } from "./stringify/sync/stringify.js";
export { stringifyAsync } from "./stringify/async/stringifyAsync.js";

export { type JSONValue, type Reviver, StreamingJSONParser } from "./parse/parser.js";

// @ts-expect-error Verify that type-testing in source files works.
type assert_FailingTypeTest = ExpectFalse<true>;
