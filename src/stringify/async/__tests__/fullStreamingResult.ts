import { stringifyAsync } from "../../../index.js";

export async function fullStreamingResult(value: unknown, space: string | number): Promise<string> {
  let result = "";
  // No replacer included -- if you want replacer tests, call `stringifyAsync`
  // directly.
  await stringifyAsync(value, undefined, space, async (s) => {
    result += s;
  });
  return result;
}
