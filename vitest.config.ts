import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./vitest.extend.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
