/**
 * Integration tests for /api/partner endpoints.
 * Mocks auth/role middleware and partnerService; real Joi validation runs.
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

// ── mock partnerService ──
jest.unstable_mockModule("../../src/services/partnerService.js", () => ({
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  uploadShopImage: jest.fn(),
  getBankDetails: jest.fn(),
  updateBankDetails: jest.fn(),
  clearBankDetails: jest.fn(),
  getMyPayouts: jest.fn(),
  getEarningsSummary: jest.fn(),
  createPayoutRequest: jest.fn(),
  getCheckouts: jest.fn(),
  getScanStats: jest.fn(),
  getRecentRedemptions: jest.fn(),
}));

// ── dynamic imports ──
const partnerService = await import("../../src/services/partnerService.js");
const partnerRoutes = (await import("../../src/routes/partnerRoutes.js")).default;

// ── helper ──
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/partner", partnerRoutes);
  app.use((err, _req, res, _next) => {
    const status = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
    res.status(status).json({ success: false, message: err.message });
  });
  return app;
}

// ── tests ──
describe("Partner endpoints (/api/partner)", () => {
  beforeEach(() => jest.clearAllMocks());

  // ────────── GET /api/partner/profile ──────────
  describe("GET /api/partner/profile", () => {
    it("returns 200 with partner profile", async () => {
      const profile = { _id: mockUser._id, shopName: "Green Cafe", email: mockUser.email };
      partnerService.getProfile.mockResolvedValue(profile);

      const res = await request(buildApp()).get("/api/partner/profile");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.shopName).toBe("Green Cafe");
      expect(partnerService.getProfile).toHaveBeenCalledWith(mockUser._id);
    });
  });

  // ────────── PATCH /api/partner/profile ──────────
  describe("PATCH /api/partner/profile", () => {
    it("returns 200 when profile is updated", async () => {
      const updated = { _id: mockUser._id, shopName: "New Name" };
      partnerService.updateProfile.mockResolvedValue(updated);

      const res = await request(buildApp())
        .patch("/api/partner/profile")
        .send({ shopName: "New Name" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.shopName).toBe("New Name");
      expect(partnerService.updateProfile).toHaveBeenCalledWith(mockUser._id, { shopName: "New Name" });
    });
  });

  // ────────── GET /api/partner/bank-details ──────────
  describe("GET /api/partner/bank-details", () => {
    it("returns 200 with bank details", async () => {
      const bank = { bankName: "BOC", branchName: "Main", accountNo: "123", accountHolderName: "Test" };
      partnerService.getBankDetails.mockResolvedValue(bank);

      const res = await request(buildApp()).get("/api/partner/bank-details");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bankName).toBe("BOC");
      expect(partnerService.getBankDetails).toHaveBeenCalledWith(mockUser._id);
    });
  });

  // ────────── PUT /api/partner/bank-details ──────────
  describe("PUT /api/partner/bank-details", () => {
    it("returns 200 when bank details are saved", async () => {
      const payload = { bankName: "BOC", branchName: "Main", accountNo: "123", accountHolderName: "Test" };
      partnerService.updateBankDetails.mockResolvedValue(payload);

      const res = await request(buildApp())
        .put("/api/partner/bank-details")
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bankName).toBe("BOC");
      expect(partnerService.updateBankDetails).toHaveBeenCalledWith(mockUser._id, payload);
    });
  });

  // ────────── DELETE /api/partner/bank-details ──────────
  describe("DELETE /api/partner/bank-details", () => {
    it("returns 200 when bank details are cleared", async () => {
      partnerService.clearBankDetails.mockResolvedValue({});

      const res = await request(buildApp()).delete("/api/partner/bank-details");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(partnerService.clearBankDetails).toHaveBeenCalledWith(mockUser._id);
    });
  });

  // ────────── GET /api/partner/payouts ──────────
  describe("GET /api/partner/payouts", () => {
    it("returns 200 with payouts list", async () => {
      const payouts = [{ _id: "p1", amount: 500, status: "completed" }];
      partnerService.getMyPayouts.mockResolvedValue(payouts);

      const res = await request(buildApp()).get("/api/partner/payouts");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(payouts);
      expect(partnerService.getMyPayouts).toHaveBeenCalledWith(mockUser._id);
    });
  });

  // ────────── GET /api/partner/earnings ──────────
  describe("GET /api/partner/earnings", () => {
    it("returns 200 with earnings summary", async () => {
      const earnings = { totalTokens: 5000, totalAmount: 2500, totalRedemptions: 120 };
      partnerService.getEarningsSummary.mockResolvedValue(earnings);

      const res = await request(buildApp()).get("/api/partner/earnings");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalTokens).toBe(5000);
      expect(partnerService.getEarningsSummary).toHaveBeenCalledWith(mockUser._id);
    });
  });

  // ────────── GET /api/partner/checkouts ──────────
  describe("GET /api/partner/checkouts", () => {
    it("returns 200 with paginated checkouts", async () => {
      const result = {
        checkouts: [{ _id: "c1" }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      partnerService.getCheckouts.mockResolvedValue(result);

      const res = await request(buildApp()).get("/api/partner/checkouts");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([{ _id: "c1" }]);
      expect(res.body.pagination).toBeDefined();
      expect(partnerService.getCheckouts).toHaveBeenCalledWith(mockUser._id, 1, 10);
    });
  });

  // ────────── GET /api/partner/scan-stats ──────────
  describe("GET /api/partner/scan-stats", () => {
    it("returns 200 with scan statistics", async () => {
      const stats = { totalScans: 85, uniqueCyclists: 42 };
      partnerService.getScanStats.mockResolvedValue(stats);

      const res = await request(buildApp()).get("/api/partner/scan-stats");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(stats);
      expect(partnerService.getScanStats).toHaveBeenCalledWith(mockUser._id);
    });
  });

  // ────────── GET /api/partner/recent-redemptions ──────────
  describe("GET /api/partner/recent-redemptions", () => {
    it("returns 200 with recent redemptions", async () => {
      const redemptions = [{ _id: "rd1", reward: "Coffee", cyclist: "Alice" }];
      partnerService.getRecentRedemptions.mockResolvedValue(redemptions);

      const res = await request(buildApp()).get("/api/partner/recent-redemptions");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(redemptions);
      expect(partnerService.getRecentRedemptions).toHaveBeenCalledWith(mockUser._id, 5);
    });
  });

  // ────────── POST /api/partner/payout-requests ──────────
  describe("POST /api/partner/payout-requests", () => {
    it("returns 201 when payout request is created", async () => {
      const payoutReq = { _id: "pr1", amount: 500, status: "pending" };
      partnerService.createPayoutRequest.mockResolvedValue(payoutReq);

      const res = await request(buildApp())
        .post("/api/partner/payout-requests")
        .send({ amount: 500 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(500);
      expect(partnerService.createPayoutRequest).toHaveBeenCalledWith(mockUser._id, 500);
    });
  });
});
