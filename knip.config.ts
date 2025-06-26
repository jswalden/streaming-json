import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: [],
  project: ["src/**/*.ts", "*.ts"],
  ignoreDependencies: [],
  tags: ["-allowunused"],
};

export default config;
