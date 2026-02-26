/**
 * Integration tests for /api/cyclist endpoints.
 * Mocks auth/role middleware and cyclistService; real Joi validation runs.
 */
import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import express from "express";
import request from "supertest";

// ── mock user ──
const mockUser = {
  _id: "6650a0000000000000000001",
  name: "Test Cyclist",
  email: "cyclist@example.com",
  role: "cyclist",
  isBlocked: false,
};

// ── mock middleware ──
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

// ── mock cyclistService ──
jest.unstable_mockModule("../../src/services/cyclistService.js", () => ({
  getStats: jest.fn(),
  updateDistance: jest.fn(),
  startRide: jest.fn(),
  endRide: jest.fn(),
  getActiveRide: jest.fn(),
  cancelRide: jest.fn(),
  getRides: jest.fn(),
  getLeaderboard: jest.fn(),
  getPartnerCount: jest.fn(),
  getPartnerShops: jest.fn(),
  getShopRewards: jest.fn(),
  CO2_PER_KM: 0.21,
  TOKENS_PER_KM: 10,
  MAX_DISTANCE_KM: 500,
}));

// ── dynamic imports ──
const cyclistService = await import("../../src/services/cyclistService.js");
const cyclistRoutes = (await import("../../src/routes/cyclistRoutes.js")).default;

// ── helper ──
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/cyclist", cyclistRoutes);
  app.use((err, _req, res, _next) => {
    const status = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
    res.status(status).json({ success: false, message: err.message });
  });
  return app;
}

// ── tests ──
describe("Cyclist endpoints (/api/cyclist)", () => {
  beforeEach(() => jest.clearAllMocks());

  // ────────── public routes ──────────
  describe("GET /api/cyclist/partner-count", () => {
    it("returns 200 with count", async () => {
      cyclistService.getPartnerCount.mockResolvedValue({ count: 12 });
      const res = await request(buildApp()).get("/api/cyclist/partner-count");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ count: 12 });
    });
  });

  describe("GET /api/cyclist/partners", () => {
    it("returns 200 with partner list", async () => {
      const shops = [{ _id: "p1", shopName: "Cafe A" }];
      cyclistService.getPartnerShops.mockResolvedValue(shops);
      const res = await request(buildApp()).get("/api/cyclist/partners");
      expect(res.status).toBe(200);
      expect(res.body).toEqual(shops);
    });
  });

  describe("GET /api/cyclist/partners/:id/rewards", () => {
    it("returns 200 with rewards for a partner shop", async () => {
      const rewards = [{ _id: "r1", title: "Free Juice", tokenCost: 30 }];
      cyclistService.getShopRewards.mockResolvedValue(rewards);
      const res = await request(buildApp()).get("/api/cyclist/partners/6650a0000000000000000099/rewards");
      expect(res.status).toBe(200);
      expect(res.body).toEqual(rewards);
      expect(cyclistService.getShopRewards).toHaveBeenCalledWith("6650a0000000000000000099");
    });
  });

  // ────────── protected route ──────────
  describe("GET /api/cyclist/leaderboard", () => {
    it("returns 200 with leaderboard data", async () => {
      const board = [{ name: "A", totalDistance: 100 }];
      cyclistService.getLeaderboard.mockResolvedValue(board);
      const res = await request(buildApp()).get("/api/cyclist/leaderboard");
      expect(res.status).toBe(200);
      expect(res.body).toEqual(board);
    });
  });

  // ────────── cyclist-only routes ──────────
  describe("GET /api/cyclist/stats", () => {
    it("returns 200 with cyclist stats", async () => {
      const stats = { totalDistance: 42.5, totalRides: 10, tokens: 425, co2Saved: 8.93 };
      cyclistService.getStats.mockResolvedValue(stats);
      const res = await request(buildApp()).get("/api/cyclist/stats");
      expect(res.status).toBe(200);
      expect(res.body).toEqual(stats);
      expect(cyclistService.getStats).toHaveBeenCalledWith(mockUser._id);
    });
  });

  describe("POST /api/cyclist/rides/start", () => {
    it("returns 201 when ride is started", async () => {
      const ride = { _id: "ride1", status: "active", cyclist: mockUser._id };
      cyclistService.startRide.mockResolvedValue(ride);

      const res = await request(buildApp())
        .post("/api/cyclist/rides/start")
        .send({ startLocation: "Colombo Fort" });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(ride);
      expect(cyclistService.startRide).toHaveBeenCalledWith(mockUser._id, { startLocation: "Colombo Fort" });
    });
  });

  describe("POST /api/cyclist/rides/:id/end", () => {
    it("returns 200 when ride is ended", async () => {
      const completed = { _id: "ride1", status: "completed", distance: 5 };
      cyclistService.endRide.mockResolvedValue(completed);

      const res = await request(buildApp())
        .post("/api/cyclist/rides/6650a0000000000000000077/end")
        .send({ distance: 5 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(completed);
      expect(cyclistService.endRide).toHaveBeenCalledWith(
        mockUser._id,
        "6650a0000000000000000077",
        { distance: 5 },
      );
    });
  });

  describe("POST /api/cyclist/rides/:id/cancel", () => {
    it("returns 200 when ride is cancelled", async () => {
      const cancelled = { _id: "ride1", status: "cancelled" };
      cyclistService.cancelRide.mockResolvedValue(cancelled);

      const res = await request(buildApp())
        .post("/api/cyclist/rides/6650a0000000000000000077/cancel");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(cancelled);
      expect(cyclistService.cancelRide).toHaveBeenCalledWith(mockUser._id, "6650a0000000000000000077");
    });
  });

  describe("GET /api/cyclist/rides", () => {
    it("returns 200 with ride history", async () => {
      const rides = [{ _id: "r1", distance: 5 }, { _id: "r2", distance: 8 }];
      cyclistService.getRides.mockResolvedValue(rides);

      const res = await request(buildApp()).get("/api/cyclist/rides");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(rides);
      expect(cyclistService.getRides).toHaveBeenCalledWith(mockUser._id, "week", "");
    });
  });

  describe("GET /api/cyclist/rides/active", () => {
    it("returns 200 with active ride", async () => {
      const active = { _id: "ride1", status: "active" };
      cyclistService.getActiveRide.mockResolvedValue(active);

      const res = await request(buildApp()).get("/api/cyclist/rides/active");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(active);
      expect(cyclistService.getActiveRide).toHaveBeenCalledWith(mockUser._id);
    });
  });
});
