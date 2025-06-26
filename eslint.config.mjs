import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import neslint from "eslint-plugin-n";
import stylistic from "@stylistic/eslint-plugin";

function permitLimitedUnpublishedImports(files, allowModules) {
  return {
    files,
    rules: {
      "n/no-unpublished-import": [
        "error",
        {
          allowModules,
        },
      ],
    },
  };
}

const testFilePatterns = ["src/**/*.test.ts"];

export default defineConfig([
  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
      },
    },
  },

  {
    plugins: {
      "@stylistic": stylistic,
    },
  },

  neslint.configs["flat/recommended-module"],
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Style rules.
  // Baseline.
  stylistic.configs.customize({
    arrowParens: true,
    blockSpacing: true,
    braceStyle: "1tbs",
    commaDangle: "always-multiline",
    indent: 2,
    quoteProps: "consistent-as-needed",
    semi: true,
    severity: "error",
  }),
  // Additional style requirements and overrides.
  {
    rules: {
      "curly": ["error", "multi-or-nest", "consistent"],
      "@stylistic/nonblock-statement-body-position": ["error", "below"],
      "@stylistic/object-property-newline": [
        "error",
        { allowAllPropertiesOnSameLine: true },
      ],
      "@stylistic/operator-linebreak": ["error", "after", { overrides: { "?": "before", ":": "before" } }],
      "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
      "@stylistic/nonblock-statement-body-position": ["error", "below"],
      "object-shorthand": "error",
      "no-useless-rename": "error",
      "n/file-extension-in-import": ["error", "always"],
    },
  },

  // Semantic rules.
  {
    rules: {
      "eqeqeq": "error",
      "no-unused-vars": "error",
      "n/no-missing-import": [
        "error",
        {
          // XXX For some reason eslint -- and only eslint, the code compiles
          //     just fine as far as `tsc` is concerned -- can't find the
          //     'type-testing' module when importing types (e.g. `Expect`) from
          //     it with a `import { type T, ... }` import.  Setting this option
          //     and instead using `import type { ... }` works around the issue.
          ignoreTypeImport: true,
        },
      ],
      "n/no-unpublished-import": "error",
      "radix": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
    },
  },

  // TypeScript rules.
  {
    files: ["**/*.ts", "**/*.cts", "**/*.mts"],
    rules: {
      "@typescript-eslint/strict-boolean-expressions": "error",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/interface-name-prefix": "off",

      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          fixStyle: "inline-type-imports",
        },
      ],

      // The TypeScript rule conflicts with no-unused-vars, so replace it rather
      // than augmenting it.
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          vars: "all",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          // Allow `_*` as the standard deliberately-unused naming pattern.  But
          // also allow `assert_*` so that type variables can be defined that
          // use `type-testing` helpers to assert typing characteristics of the
          // adjacent code.  (Unfortunately, this relaxation must be applied to
          // variables and type variables both -- there's no way to limit it to
          // just type variables.)
          varsIgnorePattern: "^(?:assert)?_",
        },
      ],

      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/explicit-module-boundary-types": ["error"],
      "@typescript-eslint/promise-function-async": "error",
      "@typescript-eslint/require-await": "off", // conflicts with 'promise-function-async'
    },
  },

  // Disable type-aware linting on JS files.
  {
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    ...tseslint.configs.disableTypeChecked,
  },

  // Relax some rules in tests.
  {
    files: testFilePatterns,
    rules: {
      "@typescript-eslint/ban-ts-ignore": "off",
      "@typescript-eslint/ban-ts-comment": "off",

      // Redefine the unused-variables rule options so that variables named
      // `test_*` can be unused.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          vars: "all",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          // Allow `_*` as the standard deliberately-unused naming pattern.  But
          // also allow `test*` so that type-testing assertions can be written
          // for use in tests.  (Unfortunately, this relaxation must apply to
          // variables and type variables both -- there's no way to limit it to
          // just type variables.)
          varsIgnorePattern: "^(?:test)?_",
        },
      ],
    },
  },
  permitLimitedUnpublishedImports(testFilePatterns, ["vitest"]),

  // Allow specific unpublished imports in unshipped files.
  permitLimitedUnpublishedImports(["knip.config.ts"], ["knip"]),
  permitLimitedUnpublishedImports(["vitest.config.ts"], ["vitest"]),

  // Don't lint generated files.
  { ignores: ["dist/**"] },
]);
