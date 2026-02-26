/**
 * tests/integration/transaction-endpoints.test.js
 * --------------------------------------------------
 * Integration tests for /api/tokens and /api/redeem endpoints.
 * Mocks auth/role middleware and transactionService.
 * The transactionController performs its own inline validation.
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import express from "express";
import request from "supertest";

/* ------------------------------------------------------------------ */
/*  Shared mock user                                                   */
/* ------------------------------------------------------------------ */
const mockUser = {
  _id: "6650a0000000000000000001",
  name: "Test",
  email: "test@example.com",
  role: "partner",
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
/*  Mock transactionService                                            */
/* ------------------------------------------------------------------ */
const mockTransactionService = {
  redeemTokens: jest.fn(),
  confirmRedeem: jest.fn(),
};
jest.unstable_mockModule("../../src/services/transactionService.js", () => mockTransactionService);

/* ------------------------------------------------------------------ */
/*  Build test app (after mocks registered)                            */
/* ------------------------------------------------------------------ */
const { default: tokenRoutes } = await import("../../src/routes/tokenRoutes.js");
const { default: redeemRoutes } = await import("../../src/routes/redeemRoutes.js");
const { errorHandler } = await import("../../src/middleware/errorHandler.js");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/tokens", tokenRoutes);
  app.use("/api/redeem", redeemRoutes);
  app.use(errorHandler);
  return app;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */
describe("Transaction endpoints — /api/tokens & /api/redeem", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  /* ================================================================ */
  /*  PATCH /api/tokens/redeem                                        */
  /* ================================================================ */

  /* ---------- missing body fields ---------- */
  it("PATCH /api/tokens/redeem → 400 missing body fields", async () => {
    const res = await request(app)
      .patch("/api/tokens/redeem")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/cyclistId/i);
    expect(mockTransactionService.redeemTokens).not.toHaveBeenCalled();
  });

  /* ---------- valid ---------- */
  it("PATCH /api/tokens/redeem → 200 success with valid body", async () => {
    const data = { message: "Tokens redeemed", transactionId: "tx1" };
    mockTransactionService.redeemTokens.mockResolvedValue(data);

    const res = await request(app)
      .patch("/api/tokens/redeem")
      .send({ cyclistId: "abc123", tokens: 10 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(data);
    expect(mockTransactionService.redeemTokens).toHaveBeenCalledWith(
      mockUser._id,
      "abc123",
      10
    );
  });

  /* ================================================================ */
  /*  POST /api/redeem/confirm                                        */
  /* ================================================================ */

  /* ---------- missing fields ---------- */
  it("POST /api/redeem/confirm → 400 missing fields", async () => {
    const res = await request(app)
      .post("/api/redeem/confirm")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/transactionId/i);
    expect(mockTransactionService.confirmRedeem).not.toHaveBeenCalled();
  });

  /* ---------- valid ---------- */
  it("POST /api/redeem/confirm → 200 success with valid body", async () => {
    const data = { message: "Redemption confirmed" };
    mockTransactionService.confirmRedeem.mockResolvedValue(data);

    const res = await request(app)
      .post("/api/redeem/confirm")
      .send({ transactionId: "tx1", cyclistId: "abc123", tokenAmount: 10 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(data);
    expect(mockTransactionService.confirmRedeem).toHaveBeenCalledWith(
      mockUser._id,
      expect.objectContaining({
        transactionId: "tx1",
        cyclistId: "abc123",
        tokenAmount: 10,
      })
    );
  });
});
