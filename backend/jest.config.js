/** Jest config for ESM */
export default {
  testEnvironment: "node",
  transform: {},
  testMatch: ["**/tests/**/*.test.js"],
  testTimeout: 15000,
  forceExit: true,
  detectOpenHandles: true,
  verbose: true,
};
