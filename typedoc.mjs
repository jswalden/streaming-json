/** @type {import("typedoc").TypeDocOptions} */
const config = {
  tsconfig: "./tsconfig.build.json",
  entryPoints: ["./src/index.ts"],
  plugin: ["typedoc-plugin-mdn-links"],
  out: "docs",
};

export default config;
