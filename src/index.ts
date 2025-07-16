import type { ExpectFalse } from "type-testing";

export { stringify } from "./stringify/stringify.js";

export { type JSONValue, type Reviver, StreamingJSONParser } from "./parse/parser.js";

// @ts-expect-error Verify that type-testing in source files works.
type assert_FailingTypeTest = ExpectFalse<true>;
