import type { ExpectFalse } from "type-testing";

export {
  type NoReplacer,
  type ReplacerFunction,
  type ReplacerPropertyList,
  stringify,
} from "./stringify/stringify.js";

export {
  type JSONArray,
  type JSONObject,
  type JSONValue,
  type Reviver,
  StreamingJSONParser,
} from "./parse/parser.js";

// @ts-expect-error Verify that type-testing in source files works.
type assert_FailingTypeTest = ExpectFalse<true>;
