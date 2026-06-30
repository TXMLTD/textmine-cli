import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  platform: "node",
  clean: true,
  // Prepend a shebang so the built file is directly executable as `textmine`.
  banner: { js: "#!/usr/bin/env node" },
});
