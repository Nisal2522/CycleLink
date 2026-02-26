/**
 * tests/helpers/testApp.js — Integration test Express app builder.
 */
import express from "express";

/**
 * Build a minimal Express app for integration testing.
 * Mounts the given route module at mountPath with JSON parsing + error handler.
 */
export function createTestApp(mountPath, routeModule) {
  const app = express();
  app.use(express.json());
  app.use(mountPath, routeModule);

  // Global error handler matching production behavior
  app.use((err, req, res, _next) => {
    const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
    res.status(statusCode).json({
      success: false,
      message: err.message || "Internal server error",
    });
  });

  return app;
}

/**
 * Middleware factory that injects req.user to bypass auth in tests.
 */
export function injectUser(userOverrides = {}) {
  const defaultUser = {
    _id: "6650a0000000000000000001",
    name: "Test User",
    email: "test@example.com",
    role: "cyclist",
    isBlocked: false,
    ...userOverrides,
  };
  return (req, _res, next) => {
    req.user = defaultUser;
    next();
  };
}
