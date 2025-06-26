import { describe, expect, test, vi } from "vitest";
import { type JSONValue, type Reviver, StreamingJSONParser } from "../../../index.js";

describe("spying on reviver invocations", () => {
  test("example", () => {
    const parser = new StreamingJSONParser();

    const json = `
[
    0,
    {
      "2": [null, { "m": 6.125 }]
      },
    "2"]
`;

    parser.add(json.slice(0, 15));
    parser.add(json.slice(15, 33));
    parser.add(json.slice(33));

    const reviver = vi.fn<Reviver<JSONValue>>((_prop: string, val: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return val;
    });

    const result = parser.finish(reviver);
    expect(result).toEqual([
      0,
      {
        2: [
          null,
          {
            m: 6.125,
          },
        ],
      },
      "2",
    ]);

    expect(reviver.mock.calls).toEqual([
      ["0", 0],
      ["0", null],
      ["m", 6.125],
      ["1", { m: 6.125 }],
      ["2", [null, { m: 6.125 }]],
      ["1", { 2: [null, { m: 6.125 }] }],
      ["2", "2"],
      ["", [0, { 2: [null, { m: 6.125 }] }, "2"]],
    ]);
  });
});
