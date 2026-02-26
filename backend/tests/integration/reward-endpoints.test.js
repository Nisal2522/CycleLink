/**
 * Integration tests for /api/rewards endpoints.
 * Mocks auth/role middleware and rewardService; exercises routes via supertest.
 */
import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import express from "express";
import request from "supertest";

// ── mock user (partner role) ──
const mockUser = {
  _id: "6650a0000000000000000002",
  name: "Test Partner",
  email: "partner@example.com",
  role: "partner",
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

// ── mock rewardService ──
jest.unstable_mockModule("../../src/services/rewardService.js", () => ({
  createReward: jest.fn(),
  getPartnerRewards: jest.fn(),
  updateReward: jest.fn(),
  deleteReward: jest.fn(),
}));

// ── dynamic imports ──
const rewardService = await import("../../src/services/rewardService.js");
const rewardRoutes = (await import("../../src/routes/rewardRoutes.js")).default;

// ── helper ──
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/rewards", rewardRoutes);
  app.use((err, _req, res, _next) => {
    const status = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
    res.status(status).json({ success: false, message: err.message });
  });
  return app;
}

// ── tests ──
describe("Reward endpoints (/api/rewards)", () => {
  beforeEach(() => jest.clearAllMocks());

  // ────────── POST /api/rewards ──────────
  describe("POST /api/rewards", () => {
    it("returns 201 when reward is created", async () => {
      const reward = { _id: "rew1", title: "Free Coffee", tokenCost: 50, partnerId: mockUser._id };
      rewardService.createReward.mockResolvedValue(reward);

      const res = await request(buildApp())
        .post("/api/rewards")
        .send({ title: "Free Coffee", tokenCost: 50 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Free Coffee");
      expect(rewardService.createReward).toHaveBeenCalledWith(mockUser._id, {
        title: "Free Coffee",
        description: undefined,
        tokenCost: 50,
        expiryDate: undefined,
      });
    });
  });

  // ────────── GET /api/rewards/partner/:id ──────────
  describe("GET /api/rewards/partner/:id", () => {
    it("returns 200 with partner rewards", async () => {
      const rewards = [
        { _id: "rew1", title: "Free Coffee", tokenCost: 50 },
        { _id: "rew2", title: "Discount", tokenCost: 30 },
      ];
      rewardService.getPartnerRewards.mockResolvedValue(rewards);

      const res = await request(buildApp()).get("/api/rewards/partner/6650a0000000000000000099");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(rewardService.getPartnerRewards).toHaveBeenCalledWith(mockUser._id, "6650a0000000000000000099");
    });
  });

  // ────────── PATCH /api/rewards/:id ──────────
  describe("PATCH /api/rewards/:id", () => {
    it("returns 200 when reward is updated", async () => {
      const updated = { _id: "rew1", title: "Updated", tokenCost: 50 };
      rewardService.updateReward.mockResolvedValue(updated);

      const res = await request(buildApp())
        .patch("/api/rewards/6650a0000000000000000055")
        .send({ title: "Updated" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Updated");
      expect(rewardService.updateReward).toHaveBeenCalledWith(
        mockUser._id,
        "6650a0000000000000000055",
        { title: "Updated" },
      );
    });
  });

  // ────────── DELETE /api/rewards/:id ──────────
  describe("DELETE /api/rewards/:id", () => {
    it("returns 200 when reward is deleted", async () => {
      rewardService.deleteReward.mockResolvedValue({ message: "Reward archived" });

      const res = await request(buildApp()).delete("/api/rewards/6650a0000000000000000055");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(rewardService.deleteReward).toHaveBeenCalledWith(mockUser._id, "6650a0000000000000000055");
    });
  });

  // ────────── service throws 404 ──────────
  describe("error propagation", () => {
    it("returns 404 when service throws a not-found error", async () => {
      const err = new Error("Reward not found");
      err.statusCode = 404;
      rewardService.updateReward.mockRejectedValue(err);

      const res = await request(buildApp())
        .patch("/api/rewards/6650a0000000000000000099")
        .send({ title: "Nope" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });
  });
});
