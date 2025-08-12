import MarkdownItFootnotePlugin from "markdown-it-footnote";

/** @type {import("typedoc").TypeDocOptions} */
const config = {
  tsconfig: "./tsconfig.build.json",
  entryPoints: ["./src/index.ts"],
  plugin: ["typedoc-plugin-mdn-links"],
  out: "docs",
  /**
   * @param {import("markdown-it").default} parser
   */
  markdownItLoader(parser) {
    parser.use(MarkdownItFootnotePlugin);
  },
};

export default config;
