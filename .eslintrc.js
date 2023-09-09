module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react-hooks", "jest"],
  env: { "jest/globals": true },
  extends: [
    "eslint:recommended",
    "@react-native-community",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:react-hooks/recommended",
    "prettier",
  ],
  rules: {
    "no-var": "off",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "react-hooks/exhaustive-deps": "off",
    "react/display-name": "off",
  },
};
