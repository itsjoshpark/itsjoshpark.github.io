import { defineConfig } from "vite-plus";

export default defineConfig({
  // Oxlint: recommended rules, plus type-aware rules and the type check that `vp check` runs.
  lint: {
    ignorePatterns: ["dist/**"],
    options: { typeAware: true, typeCheck: true },
    rules: {
      // The device engine is ported from the prototypes with loose types (tsconfig: no strictNullChecks), so this rule
      // cannot run.
      "typescript/no-useless-default-assignment": "off",
    },
  },
  // Oxfmt formats everything; it is the only formatter.
  fmt: {
    printWidth: 120,
    ignorePatterns: ["package-lock.json"],
  },
});
