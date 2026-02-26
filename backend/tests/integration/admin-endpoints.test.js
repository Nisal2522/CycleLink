/**
 * tests/integration/admin-endpoints.test.js
 * --------------------------------------------------
 * Integration tests for /api/admin endpoints.
 * Mocks auth/role middleware, adminService, and payoutService;
 * lets Joi validation run for payout schemas.
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import express from "express";
import request from "supertest";

/* ------------------------------------------------------------------ */
/*  Shared mock user (admin)                                           */
/* ------------------------------------------------------------------ */
const mockUser = {
  _id: "6650a0000000000000000001",
  name: "Admin",
  email: "admin@example.com",
  role: "admin",
  isBlocked: false,
};

/* ------------------------------------------------------------------ */
/*  Mock middleware                                                     */
/* ------------------------------------------------------------------ */
jest.unstable_mockModule("../../src/middleware/auth.js", () => ({
  protect: (req, res, next) => {
    req.user = mockUser;
    next();
  },
}));
jest.unstable_mockModule("../../src/middleware/authMiddleware.js", () => ({
  protect: (req, res, next) => {
    req.user = mockUser;
    next();
  },
  adminOnly: (req, res, next) => next(),
}));
jest.unstable_mockModule("../../src/middleware/role.js", () => ({
  cyclistOnly: (req, res, next) => next(),
  partnerOnly: (req, res, next) => next(),
  adminOnly: (req, res, next) => next(),
  roleCheck: () => (req, res, next) => next(),
}));

/* ------------------------------------------------------------------ */
/*  Mock adminService                                                  */
/* ------------------------------------------------------------------ */
const mockAdminService = {
  getStats: jest.fn(),
  getUserGrowthStats: jest.fn(),
  getUsers: jest.fn(),
  verifyUser: jest.fn(),
  blockUser: jest.fn(),
  deleteUser: jest.fn(),
  getRoutes: jest.fn(),
  getApprovedRoutes: jest.fn(),
  getRouteIssues: jest.fn(),
  deleteRoute: jest.fn(),
  getAdminHazards: jest.fn(),
  resolveAdminHazard: jest.fn(),
  deleteAdminHazard: jest.fn(),
  getPendingRoutes: jest.fn(),
  approveRoute: jest.fn(),
  rejectRoute: jest.fn(),
  getPayments: jest.fn(),
};
jest.unstable_mockModule("../../src/services/adminService.js", () => mockAdminService);

/* ------------------------------------------------------------------ */
/*  Mock payoutService (used by adminController for payout endpoints)  */
/* ------------------------------------------------------------------ */
const mockPayoutService = {
  getPayouts: jest.fn(),
  getPayoutsCsv: jest.fn(),
  calculatePayouts: jest.fn(),
  updatePayoutAdjustment: jest.fn(),
  processPayout: jest.fn(),
  getPayoutRequests: jest.fn(),
  getPayoutRequestById: jest.fn(),
  approvePayoutRequest: jest.fn(),
  rejectPayoutRequest: jest.fn(),
};
jest.unstable_mockModule("../../src/services/payoutService.js", () => mockPayoutService);

/* ------------------------------------------------------------------ */
/*  Mock payhereHelper (used by getPayhereInit in adminController)     */
/* ------------------------------------------------------------------ */
jest.unstable_mockModule("../../src/utils/payhereHelper.js", () => ({
  buildPayoutPaymentParams: jest.fn(() => ({
    payhereUrl: "https://sandbox.payhere.lk/pay/checkout",
    formData: { merchant_id: "test" },
  })),
  verifyNotifyPayload: jest.fn(),
  getMerchantId: jest.fn(() => "test"),
  getPayHereCheckoutUrl: jest.fn(() => "https://sandbox.payhere.lk/pay/checkout"),
  getNotifyUrl: jest.fn(() => "http://localhost:5000/api/payments/payhere/notify"),
}));

/* ------------------------------------------------------------------ */
/*  Build test app (after mocks registered)                            */
/* ------------------------------------------------------------------ */
const { default: adminRoutes } = await import("../../src/routes/adminRoutes.js");
const { errorHandler } = await import("../../src/middleware/errorHandler.js");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/admin", adminRoutes);
  app.use(errorHandler);
  return app;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */
describe("Admin endpoints — /api/admin", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  /* ---------- GET /api/admin/stats ---------- */
  it("GET /api/admin/stats → 200", async () => {
    const stats = { users: 10, routes: 5 };
    mockAdminService.getStats.mockResolvedValue(stats);

    const res = await request(app).get("/api/admin/stats");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(stats);
    expect(mockAdminService.getStats).toHaveBeenCalledTimes(1);
  });

  /* ---------- GET /api/admin/user-growth-stats ---------- */
  it("GET /api/admin/user-growth-stats → 200", async () => {
    const growth = { monthly: [1, 2, 3] };
    mockAdminService.getUserGrowthStats.mockResolvedValue(growth);

    const res = await request(app).get("/api/admin/user-growth-stats");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(growth);
    expect(mockAdminService.getUserGrowthStats).toHaveBeenCalledTimes(1);
  });

  /* ---------- GET /api/admin/users ---------- */
  it("GET /api/admin/users → 200", async () => {
    const users = [{ _id: "u1", name: "Alice" }];
    mockAdminService.getUsers.mockResolvedValue(users);

    const res = await request(app).get("/api/admin/users");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(users);
    expect(mockAdminService.getUsers).toHaveBeenCalledTimes(1);
  });

  /* ---------- PATCH /api/admin/users/:id/verify ---------- */
  it("PATCH /api/admin/users/:id/verify → 200", async () => {
    const result = { _id: "u1", isVerified: true };
    mockAdminService.verifyUser.mockResolvedValue(result);

    const res = await request(app).patch("/api/admin/users/u1/verify");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(result);
    expect(mockAdminService.verifyUser).toHaveBeenCalledWith("u1");
  });

  /* ---------- PATCH /api/admin/users/:id/block ---------- */
  it("PATCH /api/admin/users/:id/block → 200", async () => {
    const result = { _id: "u1", isBlocked: true };
    mockAdminService.blockUser.mockResolvedValue(result);

    const res = await request(app).patch("/api/admin/users/u1/block");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(result);
    expect(mockAdminService.blockUser).toHaveBeenCalledWith("u1", undefined);
  });

  /* ---------- DELETE /api/admin/users/:id ---------- */
  it("DELETE /api/admin/users/:id → 200", async () => {
    const result = { message: "User deleted" };
    mockAdminService.deleteUser.mockResolvedValue(result);

    const res = await request(app).delete("/api/admin/users/u1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(result);
    expect(mockAdminService.deleteUser).toHaveBeenCalledWith("u1");
  });

  /* ---------- GET /api/admin/routes ---------- */
  it("GET /api/admin/routes → 200", async () => {
    const routes = [{ _id: "r1" }];
    mockAdminService.getRoutes.mockResolvedValue(routes);

    const res = await request(app).get("/api/admin/routes");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(routes);
    expect(mockAdminService.getRoutes).toHaveBeenCalledTimes(1);
  });

  /* ---------- GET /api/admin/approved-routes ---------- */
  it("GET /api/admin/approved-routes → 200", async () => {
    const routes = [{ _id: "r2", status: "approved" }];
    mockAdminService.getApprovedRoutes.mockResolvedValue(routes);

    const res = await request(app).get("/api/admin/approved-routes");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(routes);
    expect(mockAdminService.getApprovedRoutes).toHaveBeenCalledTimes(1);
  });

  /* ---------- DELETE /api/admin/routes/:id ---------- */
  it("DELETE /api/admin/routes/:id → 200", async () => {
    const result = { message: "Route deleted" };
    mockAdminService.deleteRoute.mockResolvedValue(result);

    const res = await request(app).delete("/api/admin/routes/r1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(result);
    expect(mockAdminService.deleteRoute).toHaveBeenCalledWith("r1");
  });

  /* ---------- GET /api/admin/hazards ---------- */
  it("GET /api/admin/hazards → 200", async () => {
    const hazards = [{ _id: "h1", type: "pothole" }];
    mockAdminService.getAdminHazards.mockResolvedValue(hazards);

    const res = await request(app).get("/api/admin/hazards");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(hazards);
    expect(mockAdminService.getAdminHazards).toHaveBeenCalledTimes(1);
  });

  /* ---------- PATCH /api/admin/hazards/:id/resolve ---------- */
  it("PATCH /api/admin/hazards/:id/resolve → 200", async () => {
    const result = { _id: "h1", status: "resolved" };
    mockAdminService.resolveAdminHazard.mockResolvedValue(result);

    const res = await request(app).patch("/api/admin/hazards/h1/resolve");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(result);
    expect(mockAdminService.resolveAdminHazard).toHaveBeenCalledWith("h1");
  });

  /* ---------- DELETE /api/admin/hazards/:id ---------- */
  it("DELETE /api/admin/hazards/:id → 200", async () => {
    const result = { message: "Hazard deleted" };
    mockAdminService.deleteAdminHazard.mockResolvedValue(result);

    const res = await request(app).delete("/api/admin/hazards/h1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(result);
    expect(mockAdminService.deleteAdminHazard).toHaveBeenCalledWith("h1");
  });

  /* ---------- GET /api/admin/pending-routes ---------- */
  it("GET /api/admin/pending-routes → 200", async () => {
    const pending = [{ _id: "r3", status: "pending" }];
    mockAdminService.getPendingRoutes.mockResolvedValue(pending);

    const res = await request(app).get("/api/admin/pending-routes");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(pending);
    expect(mockAdminService.getPendingRoutes).toHaveBeenCalledTimes(1);
  });

  /* ---------- PATCH /api/admin/approve-route/:id ---------- */
  it("PATCH /api/admin/approve-route/:id → 200", async () => {
    const result = { _id: "r3", status: "approved" };
    mockAdminService.approveRoute.mockResolvedValue(result);

    const res = await request(app).patch("/api/admin/approve-route/r3");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(result);
    expect(mockAdminService.approveRoute).toHaveBeenCalledWith("r3");
  });

  /* ---------- PATCH /api/admin/reject-route/:id ---------- */
  it("PATCH /api/admin/reject-route/:id → 200", async () => {
    const result = { _id: "r3", status: "rejected" };
    mockAdminService.rejectRoute.mockResolvedValue(result);

    const res = await request(app).patch("/api/admin/reject-route/r3");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(result);
    expect(mockAdminService.rejectRoute).toHaveBeenCalledWith("r3");
  });

  /* ---------- GET /api/admin/payments ---------- */
  it("GET /api/admin/payments → 200", async () => {
    const payments = [{ _id: "p1", amount: 100 }];
    mockAdminService.getPayments.mockResolvedValue(payments);

    const res = await request(app).get("/api/admin/payments");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(payments);
    expect(mockAdminService.getPayments).toHaveBeenCalledTimes(1);
  });

  /* ---------- GET /api/admin/payouts ---------- */
  it("GET /api/admin/payouts → 200", async () => {
    const payouts = [{ _id: "po1", amount: 500 }];
    mockPayoutService.getPayouts.mockResolvedValue(payouts);

    const res = await request(app).get("/api/admin/payouts");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(payouts);
    expect(mockPayoutService.getPayouts).toHaveBeenCalledTimes(1);
  });

  /* ---------- POST /api/admin/payout-requests/:id/reject — valid ---------- */
  it("POST /api/admin/payout-requests/:id/reject → 200 with valid body", async () => {
    const result = { _id: "pr1", status: "Rejected" };
    mockPayoutService.rejectPayoutRequest.mockResolvedValue(result);

    const res = await request(app)
      .post("/api/admin/payout-requests/pr1/reject")
      .send({ rejectionReason: "Invalid" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPayoutService.rejectPayoutRequest).toHaveBeenCalledWith(
      "pr1",
      { rejectionReason: "Invalid" }
    );
  });

  /* ---------- POST /api/admin/payout-requests/:id/reject — empty body ---------- */
  it("POST /api/admin/payout-requests/:id/reject → 400 with empty body (validation)", async () => {
    const res = await request(app)
      .post("/api/admin/payout-requests/pr1/reject")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(mockPayoutService.rejectPayoutRequest).not.toHaveBeenCalled();
  });
});
