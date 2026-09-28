import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Convention : un paramètre/variable préfixé par `_` est volontairement inutilisé
      // (ex. signatures de mocks `(..._args) => {}` dans les tests).
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      // Signale les setState synchrones dans un effet. Utile pour repérer un state
      // recopié d'une prop, mais bruyant sur les patterns légitimes (flag de
      // chargement avant un fetch, réaction à un événement du store) : warn.
      "react-hooks/set-state-in-effect": "warn",
      // L'apostrophe est omniprésente dans les textes français et sans danger en
      // JSX ; on garde les caractères qui trahissent vraiment une faute de frappe.
      "react/no-unescaped-entities": ["error", { forbid: [">", "}", "\""] }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Scripts Node ponctuels (CommonJS), hors app.
    "scripts/**",
  ]),
]);

export default eslintConfig;
