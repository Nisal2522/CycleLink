/**
 * tests/integration/hazard-endpoints.test.js
 * --------------------------------------------------
 * Integration tests for /api/hazards endpoints.
 * Mocks auth/role middleware and hazardService; lets Joi validation run.
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
  role: "cyclist",
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
/*  Mock hazardService                                                 */
/* ------------------------------------------------------------------ */
const mockHazardService = {
  getHazards: jest.fn(),
  getHazardMarkers: jest.fn(),
  reportHazard: jest.fn(),
  updateHazard: jest.fn(),
  deleteHazard: jest.fn(),
  verifyHazard: jest.fn(),
  getHazardVerifications: jest.fn(),
  moderateHazard: jest.fn(),
  forceDeleteHazard: jest.fn(),
  cleanupStaleHazards: jest.fn(),
};
jest.unstable_mockModule("../../src/services/hazardService.js", () => mockHazardService);

/* ------------------------------------------------------------------ */
/*  Build test app (after mocks registered)                            */
/* ------------------------------------------------------------------ */
const { default: hazardRoutes } = await import("../../src/routes/hazardRoutes.js");
const { errorHandler } = await import("../../src/middleware/errorHandler.js");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/hazards", hazardRoutes);
  app.use(errorHandler);
  return app;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */
describe("Hazard endpoints — /api/hazards", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  /* ---------- GET /api/hazards ---------- */
  it("GET /api/hazards → 200 returns hazards list", async () => {
    const hazards = [{ _id: "h1", type: "pothole" }];
    mockHazardService.getHazards.mockResolvedValue(hazards);

    const res = await request(app).get("/api/hazards");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(hazards);
    expect(mockHazardService.getHazards).toHaveBeenCalledTimes(1);
  });

  /* ---------- GET /api/hazards/markers ---------- */
  it("GET /api/hazards/markers → 200 returns markers", async () => {
    const markers = [{ _id: "m1", lat: 6.9, lng: 79.8 }];
    mockHazardService.getHazardMarkers.mockResolvedValue(markers);

    const res = await request(app).get("/api/hazards/markers");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(markers);
    expect(mockHazardService.getHazardMarkers).toHaveBeenCalledTimes(1);
  });

  /* ---------- POST /api/hazards/report — valid ---------- */
  it("POST /api/hazards/report → 201 with valid body", async () => {
    const created = { _id: "h2", lat: 6.9, lng: 79.8, type: "pothole" };
    mockHazardService.reportHazard.mockResolvedValue(created);

    const res = await request(app)
      .post("/api/hazards/report")
      .send({ lat: 6.9, lng: 79.8, type: "pothole" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(created);
    expect(mockHazardService.reportHazard).toHaveBeenCalledWith(
      mockUser._id,
      expect.objectContaining({ lat: 6.9, lng: 79.8, type: "pothole" })
    );
  });

  /* ---------- POST /api/hazards/report — invalid lat ---------- */
  it("POST /api/hazards/report → 400 with invalid lat (lat: 100)", async () => {
    const res = await request(app)
      .post("/api/hazards/report")
      .send({ lat: 100, lng: 79.8, type: "pothole" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(mockHazardService.reportHazard).not.toHaveBeenCalled();
  });

  /* ---------- PATCH /api/hazards/:id ---------- */
  it("PATCH /api/hazards/:id → 200 update", async () => {
    const updated = { _id: "h1", type: "construction" };
    mockHazardService.updateHazard.mockResolvedValue(updated);

    const res = await request(app)
      .patch("/api/hazards/h1")
      .send({ type: "construction" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(updated);
    expect(mockHazardService.updateHazard).toHaveBeenCalledWith(
      "h1",
      mockUser._id,
      expect.objectContaining({ type: "construction" })
    );
  });

  /* ---------- DELETE /api/hazards/:id ---------- */
  it("DELETE /api/hazards/:id → 200 delete", async () => {
    const result = { message: "Hazard deleted" };
    mockHazardService.deleteHazard.mockResolvedValue(result);

    const res = await request(app).delete("/api/hazards/h1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(result);
    expect(mockHazardService.deleteHazard).toHaveBeenCalledWith("h1", mockUser._id);
  });

  /* ---------- POST /api/hazards/:id/verify — valid ---------- */
  it("POST /api/hazards/:id/verify → 200 with valid status", async () => {
    const verified = { _id: "h1", status: "exists" };
    mockHazardService.verifyHazard.mockResolvedValue(verified);

    const res = await request(app)
      .post("/api/hazards/h1/verify")
      .send({ status: "exists" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(verified);
    expect(mockHazardService.verifyHazard).toHaveBeenCalledWith("h1", mockUser._id, "exists");
  });

  /* ---------- POST /api/hazards/:id/verify — invalid status ---------- */
  it("POST /api/hazards/:id/verify → 400 with invalid status", async () => {
    const res = await request(app)
      .post("/api/hazards/h1/verify")
      .send({ status: "invalid_status" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(mockHazardService.verifyHazard).not.toHaveBeenCalled();
  });

  /* ---------- GET /api/hazards/:id/verifications ---------- */
  it("GET /api/hazards/:id/verifications → 200", async () => {
    const verifications = [{ userId: "u1", status: "exists" }];
    mockHazardService.getHazardVerifications.mockResolvedValue(verifications);

    const res = await request(app).get("/api/hazards/h1/verifications");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(verifications);
    expect(mockHazardService.getHazardVerifications).toHaveBeenCalledWith("h1");
  });

  /* ---------- PATCH /api/hazards/:id/moderate (admin) ---------- */
  it("PATCH /api/hazards/:id/moderate → 200 (admin)", async () => {
    const moderated = { _id: "h1", status: "verified" };
    mockHazardService.moderateHazard.mockResolvedValue(moderated);

    const res = await request(app)
      .patch("/api/hazards/h1/moderate")
      .send({ status: "verified" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(moderated);
    expect(mockHazardService.moderateHazard).toHaveBeenCalledWith(
      "h1",
      mockUser._id,
      expect.objectContaining({ status: "verified" })
    );
  });

  /* ---------- DELETE /api/hazards/:id/force (admin) ---------- */
  it("DELETE /api/hazards/:id/force → 200 (admin)", async () => {
    const result = { message: "Hazard permanently deleted" };
    mockHazardService.forceDeleteHazard.mockResolvedValue(result);

    const res = await request(app).delete("/api/hazards/h1/force");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(result);
    expect(mockHazardService.forceDeleteHazard).toHaveBeenCalledWith("h1", mockUser._id);
  });

  /* ---------- POST /api/hazards/cleanup (admin) ---------- */
  it("POST /api/hazards/cleanup → 200 (admin)", async () => {
    const result = { removedCount: 5 };
    mockHazardService.cleanupStaleHazards.mockResolvedValue(result);

    const res = await request(app).post("/api/hazards/cleanup");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(result);
    expect(mockHazardService.cleanupStaleHazards).toHaveBeenCalledTimes(1);
  });
});
