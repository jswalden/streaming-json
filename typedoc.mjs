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
    // Typedoc issues warnings for non-link footnotes, so using footnotes for
    // paragraphs of text will trigger warnings:
    //
    // https://github.com/TypeStrong/typedoc/issues/2991
    //
    // Not ideal, but the output looks fine, and Github shows the README with
    // footnotes just fine, so we suck it up.
    parser.use(MarkdownItFootnotePlugin);
  },
};

export default config;
