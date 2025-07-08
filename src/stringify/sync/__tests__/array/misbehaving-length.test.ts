import { expect, test, vi } from "vitest";
import { stringify } from "../../../../index.js";

test("IsArray but with .length === NaN", () => {
  const target = [42, 17];
  const handlerGet = vi.fn<NonNullable<ProxyHandler<typeof target>["get"]>>((_target, prop, _receiver): number | string | undefined => {
    // A proxy of an array can return a "length" that isn't the target's length
    // as long as the target's length property is writable.  (If it were
    // nonwritable, then the handler would be required to return the actual
    // value.)
    if (prop === "length")
      return Number.NaN;
    // These should never happen.  (But, historically, because of an `=== 0`
    // test that `NaN` fails, briefly did happen.)
    if (prop === "0" || prop === "1")
      return "BAD";
    return undefined;
  });
  const obj = new Proxy(target, { get: handlerGet });

  let result = "";
  expect(stringify(obj, undefined, 0, (s) => {
    result += s;
  })).toBe(undefined);

  const propertyGets = handlerGet.mock.calls.map(([_target, prop, _receiver]) => prop);
  expect(propertyGets).toEqual(["toJSON", "length"]);
  expect(result).toBe("[]");
});
