export default [
  { ignores: ["build/**", "coverage/**", "node_modules/**"] },
  {
    files: ["**/*.js", "**/*.jsx"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: { "no-debugger": "error" },
  },
];
