/**
 * tests/integration/route-endpoints.test.js
 * --------------------------------------------------
 * Integration tests for /api/routes endpoints.
 * Mocks auth/role middleware and routeService; lets Joi validation run.
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
/*  Mock routeService                                                  */
/* ------------------------------------------------------------------ */
const mockRouteService = {
  createRoute: jest.fn(),
  getPublicRoutes: jest.fn(),
  getMyRoutes: jest.fn(),
  updateRoute: jest.fn(),
  deleteRoute: jest.fn(),
  rateRoute: jest.fn(),
  getRouteRatings: jest.fn(),
  deleteRating: jest.fn(),
};
jest.unstable_mockModule("../../src/services/routeService.js", () => mockRouteService);

/* ------------------------------------------------------------------ */
/*  Build test app (after mocks registered)                            */
/* ------------------------------------------------------------------ */
const { default: routeRoutes } = await import("../../src/routes/routeRoutes.js");
const { errorHandler } = await import("../../src/middleware/errorHandler.js");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/routes", routeRoutes);
  app.use(errorHandler);
  return app;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */
describe("Route endpoints — /api/routes", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  /* ---------- GET /api/routes ---------- */
  it("GET /api/routes → 200 public list", async () => {
    const routes = [{ _id: "r1", startLocation: "A" }];
    mockRouteService.getPublicRoutes.mockResolvedValue(routes);

    const res = await request(app).get("/api/routes");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(routes);
    expect(mockRouteService.getPublicRoutes).toHaveBeenCalledTimes(1);
  });

  /* ---------- POST /api/routes — valid ---------- */
  it("POST /api/routes → 201 with valid body", async () => {
    const created = { _id: "r2", startLocation: "A", endLocation: "B" };
    mockRouteService.createRoute.mockResolvedValue(created);

    const res = await request(app)
      .post("/api/routes")
      .send({
        startLocation: "A",
        endLocation: "B",
        path: [{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }],
        distance: "5 km",
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(created);
    expect(mockRouteService.createRoute).toHaveBeenCalledWith(
      mockUser._id,
      expect.objectContaining({
        startLocation: "A",
        endLocation: "B",
        distance: "5 km",
      })
    );
  });

  /* ---------- POST /api/routes — missing path ---------- */
  it("POST /api/routes → 400 missing path (validation fails)", async () => {
    const res = await request(app)
      .post("/api/routes")
      .send({
        startLocation: "A",
        endLocation: "B",
        distance: "5 km",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(mockRouteService.createRoute).not.toHaveBeenCalled();
  });

  /* ---------- GET /api/routes/my-routes ---------- */
  it("GET /api/routes/my-routes → 200", async () => {
    const myRoutes = [{ _id: "r3", startLocation: "C" }];
    mockRouteService.getMyRoutes.mockResolvedValue(myRoutes);

    const res = await request(app).get("/api/routes/my-routes");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(myRoutes);
    expect(mockRouteService.getMyRoutes).toHaveBeenCalledWith(mockUser._id);
  });

  /* ---------- PATCH /api/routes/:id ---------- */
  it("PATCH /api/routes/:id → 200", async () => {
    const updated = { _id: "r1", startLocation: "X" };
    mockRouteService.updateRoute.mockResolvedValue(updated);

    const res = await request(app)
      .patch("/api/routes/r1")
      .send({ startLocation: "X" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(updated);
    expect(mockRouteService.updateRoute).toHaveBeenCalledWith(
      "r1",
      mockUser._id,
      expect.objectContaining({ startLocation: "X" })
    );
  });

  /* ---------- DELETE /api/routes/:id ---------- */
  it("DELETE /api/routes/:id → 200", async () => {
    const result = { message: "Route deleted" };
    mockRouteService.deleteRoute.mockResolvedValue(result);

    const res = await request(app).delete("/api/routes/r1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(result);
    expect(mockRouteService.deleteRoute).toHaveBeenCalledWith("r1", mockUser._id);
  });

  /* ---------- POST /api/routes/:id/rate — valid ---------- */
  it("POST /api/routes/:id/rate → 200 with valid rating", async () => {
    const rated = { message: "Route rated", averageRating: 4 };
    mockRouteService.rateRoute.mockResolvedValue(rated);

    const res = await request(app)
      .post("/api/routes/r1/rate")
      .send({ rating: 4 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(rated);
    expect(mockRouteService.rateRoute).toHaveBeenCalledWith(
      mockUser._id,
      "r1",
      expect.objectContaining({ rating: 4 })
    );
  });

  /* ---------- POST /api/routes/:id/rate — invalid (0) ---------- */
  it("POST /api/routes/:id/rate → 400 with rating: 0 (fails validation)", async () => {
    const res = await request(app)
      .post("/api/routes/r1/rate")
      .send({ rating: 0 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(mockRouteService.rateRoute).not.toHaveBeenCalled();
  });

  /* ---------- GET /api/routes/:id/ratings ---------- */
  it("GET /api/routes/:id/ratings → 200", async () => {
    const ratings = [{ userId: "u1", rating: 5 }];
    mockRouteService.getRouteRatings.mockResolvedValue(ratings);

    const res = await request(app).get("/api/routes/r1/ratings");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(ratings);
    expect(mockRouteService.getRouteRatings).toHaveBeenCalledWith("r1");
  });

  /* ---------- DELETE /api/routes/:id/rating ---------- */
  it("DELETE /api/routes/:id/rating → 200", async () => {
    const result = { message: "Rating deleted" };
    mockRouteService.deleteRating.mockResolvedValue(result);

    const res = await request(app).delete("/api/routes/r1/rating");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(result);
    expect(mockRouteService.deleteRating).toHaveBeenCalledWith(mockUser._id, "r1");
  });
});
