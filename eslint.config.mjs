import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const restrict = (patterns) => ({
  rules: { "no-restricted-imports": ["error", { patterns }] },
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  // Architecture Guardrails (strict error enforcement)
  // ui/ must stay domain-free
  {
    files: ["components/ui/**"],
    ...restrict([
      {
        group: ["@/features/*", "@/server/*"],
        message: "components/ui/ is domain-free.",
      },
    ]),
  },

  // lib/ must not know about React components, features, or server code
  {
    files: ["lib/**"],
    ...restrict([
      {
        group: ["@/components/*", "@/features/*", "@/server/*"],
        message: "lib/ is framework-agnostic.",
      },
    ]),
  },

  // features: no server code, no deep imports into other features
  {
    files: ["features/**"],
    ...restrict([
      {
        group: ["@/server/*"],
        message: "Client features cannot import server code.",
      },
      {
        group: ["@/features/*/*"],
        message: "Import other features via '@/features/<name>' only.",
      },
    ]),
  },

  // size guards
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "max-lines": [
        "error",
        { max: 300, skipBlankLines: true, skipComments: true },
      ],
      "max-lines-per-function": [
        "error",
        { max: 150, skipBlankLines: true, skipComments: true },
      ],
      complexity: ["error", 15],
    },
  },
]);

export default eslintConfig;
