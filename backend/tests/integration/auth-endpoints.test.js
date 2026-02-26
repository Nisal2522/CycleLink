/**
 * Integration tests for /api/auth endpoints.
 * Mocks auth middleware and authService; exercises routes via supertest.
 */
import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import express from "express";
import request from "supertest";

// ── mock user injected by faked auth middleware ──
const mockUser = {
  _id: "6650a0000000000000000001",
  name: "Test User",
  email: "test@example.com",
  role: "cyclist",
  isBlocked: false,
};

// ── mock middleware (must appear before route import) ──
jest.unstable_mockModule("../../src/middleware/auth.js", () => ({
  protect: (req, _res, next) => {
    req.user = mockUser;
    next();
  },
}));
jest.unstable_mockModule("../../src/middleware/authMiddleware.js", () => ({
  protect: (req, _res, next) => {
    req.user = mockUser;
    next();
  },
  adminOnly: (_req, _res, next) => next(),
}));
jest.unstable_mockModule("../../src/middleware/role.js", () => ({
  cyclistOnly: (_req, _res, next) => next(),
  partnerOnly: (_req, _res, next) => next(),
  adminOnly: (_req, _res, next) => next(),
  roleCheck: () => (_req, _res, next) => next(),
}));

// ── mock authService ──
jest.unstable_mockModule("../../src/services/authService.js", () => ({
  register: jest.fn(),
  login: jest.fn(),
  googleLogin: jest.fn(),
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  uploadAvatar: jest.fn(),
  getPublicStats: jest.fn(),
  getUserById: jest.fn(),
}));

// ── dynamic imports ──
const authService = await import("../../src/services/authService.js");
const authRoutes = (await import("../../src/routes/authRoutes.js")).default;

// ── helper: build a fresh Express app with auth routes mounted ──
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  // global error handler
  app.use((err, _req, res, _next) => {
    const status = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
    res.status(status).json({ success: false, message: err.message });
  });
  return app;
}

// ── tests ──
describe("Auth endpoints (/api/auth)", () => {
  beforeEach(() => jest.clearAllMocks());

  // ────────── GET /api/auth/stats ──────────
  describe("GET /api/auth/stats", () => {
    it("returns 200 with public stats", async () => {
      authService.getPublicStats.mockResolvedValue({ totalUsers: 42 });
      const res = await request(buildApp()).get("/api/auth/stats");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({ totalUsers: 42 });
    });
  });

  // ────────── POST /api/auth/register ──────────
  describe("POST /api/auth/register", () => {
    it("returns 400 when body is empty", async () => {
      const res = await request(buildApp())
        .post("/api/auth/register")
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 201 on successful registration", async () => {
      const fakeUser = { _id: "abc123", name: "New", email: "new@test.com", role: "cyclist" };
      authService.register.mockResolvedValue({ user: fakeUser, token: "tok_123" });

      const res = await request(buildApp())
        .post("/api/auth/register")
        .send({ name: "New User", email: "new@test.com", password: "Password123" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBe("tok_123");
      expect(authService.register).toHaveBeenCalledTimes(1);
    });
  });

  // ────────── POST /api/auth/login ──────────
  describe("POST /api/auth/login", () => {
    it("returns 400 when email is missing", async () => {
      const res = await request(buildApp())
        .post("/api/auth/login")
        .send({ email: "" });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 200 on successful login", async () => {
      const fakeData = { user: { _id: "u1", name: "T" }, token: "jwt_xyz" };
      authService.login.mockResolvedValue(fakeData);

      const res = await request(buildApp())
        .post("/api/auth/login")
        .send({ email: "test@example.com", password: "Password123" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBe("jwt_xyz");
      expect(authService.login).toHaveBeenCalledWith("test@example.com", "Password123");
    });
  });

  // ────────── POST /api/auth/google ──────────
  describe("POST /api/auth/google", () => {
    it("returns 400 when credential is missing", async () => {
      const res = await request(buildApp())
        .post("/api/auth/google")
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/credential/i);
    });
  });

  // ────────── GET /api/auth/profile ──────────
  describe("GET /api/auth/profile", () => {
    it("returns 200 with user profile", async () => {
      const profile = { _id: mockUser._id, name: "Test User", email: "test@example.com" };
      authService.getProfile.mockResolvedValue(profile);

      const res = await request(buildApp()).get("/api/auth/profile");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe("test@example.com");
      expect(authService.getProfile).toHaveBeenCalledWith(mockUser._id);
    });
  });

  // ────────── PATCH /api/auth/profile ──────────
  describe("PATCH /api/auth/profile", () => {
    it("returns 200 when profile is updated", async () => {
      const updated = { _id: mockUser._id, name: "Updated Name" };
      authService.updateProfile.mockResolvedValue(updated);

      const res = await request(buildApp())
        .patch("/api/auth/profile")
        .send({ name: "Updated Name" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Updated Name");
      expect(authService.updateProfile).toHaveBeenCalledWith(mockUser._id, { name: "Updated Name" });
    });
  });
});
