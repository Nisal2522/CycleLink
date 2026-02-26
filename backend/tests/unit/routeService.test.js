/**
 * tests/unit/routeService.test.js
 * --------------------------------------------------
 * Unit tests for routeService (ESM + Jest 30 unstable_mockModule).
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// --------------- mocks (before dynamic imports) ---------------

const mockRoute = {
  create: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
};

jest.unstable_mockModule("../../src/models/Route.js", () => ({
  default: mockRoute,
}));

jest.unstable_mockModule("mongoose", () => ({
  default: {
    Types: {
      ObjectId: jest.fn((val) => val),
    },
  },
}));

jest.unstable_mockModule("../../src/constants.js", () => ({
  ROUTE_STATUS: { PENDING: "pending", APPROVED: "approved", REJECTED: "rejected" },
  LIMITS: { ROUTES_PUBLIC: 100 },
}));

// --------------- dynamic imports ---------------

const {
  createRoute,
  getPublicRoutes,
  getMyRoutes,
  updateRoute,
  deleteRoute,
  rateRoute,
  getRouteRatings,
  deleteRating,
} = await import("../../src/services/routeService.js");

// --------------- helpers ---------------

/** Build a chainable query mock (populate, select, sort, lean, limit). */
function buildChain(resolvedValue) {
  const chain = {
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(resolvedValue),
    // Also allow awaiting without .limit() at the end
    then: (resolve) => resolve(resolvedValue),
  };
  return chain;
}

function buildFindByIdChain(resolvedValue) {
  const chain = {
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolvedValue),
    then: (resolve) => resolve(resolvedValue),
  };
  return chain;
}

function makeRouteDoc(overrides = {}) {
  const base = {
    _id: "route1",
    creatorId: { toString: () => overrides.creatorId ?? "creator1" },
    startLocation: "A",
    endLocation: "B",
    path: [{ lat: 6.9, lng: 79.8 }, { lat: 7.0, lng: 79.9 }],
    distance: "5 km",
    duration: "20 min",
    weatherCondition: "sunny",
    ratings: [],
    averageRating: 0,
    ratingCount: 0,
    save: jest.fn().mockResolvedValue(undefined),
    populate: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return base;
}

// --------------- suite ---------------

describe("routeService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ======================== createRoute ========================

  describe("createRoute", () => {
    it("creates a route and returns the populated result", async () => {
      const createdDoc = { _id: "newRoute1" };
      mockRoute.create.mockResolvedValue(createdDoc);

      const populatedDoc = { _id: "newRoute1", creatorId: { name: "Alice" } };
      const chain = buildFindByIdChain(populatedDoc);
      mockRoute.findById.mockReturnValue(chain);

      const body = {
        startLocation: "  A  ",
        endLocation: "  B  ",
        path: [{ lat: 6.9, lng: 79.8 }, { lat: 7.0, lng: 79.9 }],
        distance: " 5 km ",
        duration: "20 min",
        weatherCondition: "sunny",
      };
      const result = await createRoute("creator1", body);

      expect(mockRoute.create).toHaveBeenCalledWith(
        expect.objectContaining({
          startLocation: "A",
          endLocation: "B",
          distance: "5 km",
        })
      );
      expect(mockRoute.findById).toHaveBeenCalledWith("newRoute1");
      expect(result).toBe(populatedDoc);
    });
  });

  // ======================== getPublicRoutes ========================

  describe("getPublicRoutes", () => {
    it("returns approved routes", async () => {
      const routes = [{ _id: "r1" }, { _id: "r2" }];
      const chain = buildChain(routes);
      mockRoute.find.mockReturnValue(chain);

      const result = await getPublicRoutes();

      expect(mockRoute.find).toHaveBeenCalled();
      expect(result).toBe(routes);
    });
  });

  // ======================== getMyRoutes ========================

  describe("getMyRoutes", () => {
    it("returns routes belonging to the user", async () => {
      const routes = [{ _id: "r1" }];
      // getMyRoutes uses .find().populate().sort().lean()
      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(routes),
      };
      mockRoute.find.mockReturnValue(chain);

      const result = await getMyRoutes("creator1");

      expect(mockRoute.find).toHaveBeenCalledWith({ creatorId: "creator1" });
      expect(result).toBe(routes);
    });
  });

  // ======================== updateRoute ========================

  describe("updateRoute", () => {
    it("throws 404 when route not found", async () => {
      mockRoute.findById.mockResolvedValue(null);

      await expect(
        updateRoute("r1", "user1", {
          startLocation: "A",
          endLocation: "B",
          path: [{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }],
          distance: "5",
        })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("throws 403 when user is not the creator", async () => {
      const doc = makeRouteDoc({ creatorId: "owner1" });
      mockRoute.findById.mockResolvedValue(doc);

      await expect(
        updateRoute("r1", "otherUser", {
          startLocation: "A",
          endLocation: "B",
          path: [{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }],
          distance: "5",
        })
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("updates and returns the route on success", async () => {
      const doc = makeRouteDoc({ creatorId: "user1" });
      mockRoute.findById.mockResolvedValue(doc);

      const updatedDoc = { _id: "r1", startLocation: "X" };
      const chain = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(updatedDoc),
      };
      mockRoute.findByIdAndUpdate.mockReturnValue(chain);

      const result = await updateRoute("r1", "user1", {
        startLocation: "X",
        endLocation: "Y",
        path: [{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }],
        distance: "10",
        duration: null,
        weatherCondition: null,
      });

      expect(mockRoute.findByIdAndUpdate).toHaveBeenCalledWith(
        "r1",
        expect.objectContaining({ startLocation: "X" }),
        { new: true, runValidators: true }
      );
      expect(result).toBe(updatedDoc);
    });
  });

  // ======================== deleteRoute ========================

  describe("deleteRoute", () => {
    it("throws 404 when route not found", async () => {
      mockRoute.findById.mockResolvedValue(null);

      await expect(deleteRoute("r1", "user1")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("throws 403 when user is not the creator", async () => {
      const doc = makeRouteDoc({ creatorId: "owner1" });
      mockRoute.findById.mockResolvedValue(doc);

      await expect(deleteRoute("r1", "otherUser")).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it("deletes and returns success message", async () => {
      const doc = makeRouteDoc({ creatorId: "user1" });
      mockRoute.findById.mockResolvedValue(doc);
      mockRoute.findByIdAndDelete.mockResolvedValue(undefined);

      const result = await deleteRoute("r1", "user1");

      expect(mockRoute.findByIdAndDelete).toHaveBeenCalledWith("r1");
      expect(result).toEqual({ message: "Route deleted successfully" });
    });
  });

  // ======================== rateRoute ========================

  describe("rateRoute", () => {
    it("throws 404 when route not found", async () => {
      mockRoute.findById.mockResolvedValue(null);

      await expect(
        rateRoute("user1", "r1", { rating: 5 })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("adds a new rating and recalculates average", async () => {
      const doc = makeRouteDoc({
        creatorId: "creator1",
        ratings: [],
        averageRating: 0,
        ratingCount: 0,
      });
      mockRoute.findById.mockResolvedValue(doc);

      const result = await rateRoute("user1", "r1", {
        rating: 4,
        comment: "Nice route",
      });

      expect(doc.ratings).toHaveLength(1);
      expect(doc.ratings[0].userId).toBe("user1");
      expect(doc.ratings[0].rating).toBe(4);
      expect(doc.averageRating).toBe(4);
      expect(doc.ratingCount).toBe(1);
      expect(doc.save).toHaveBeenCalled();
      expect(doc.populate).toHaveBeenCalledWith("ratings.userId", "name");
    });

    it("updates an existing rating instead of adding a duplicate", async () => {
      const doc = makeRouteDoc({
        creatorId: "creator1",
        ratings: [
          {
            userId: { toString: () => "user1" },
            rating: 3,
            comment: "OK",
            createdAt: new Date(),
          },
        ],
        averageRating: 3,
        ratingCount: 1,
      });
      mockRoute.findById.mockResolvedValue(doc);

      await rateRoute("user1", "r1", { rating: 5, comment: "Great!" });

      expect(doc.ratings).toHaveLength(1);
      expect(doc.ratings[0].rating).toBe(5);
      expect(doc.ratings[0].comment).toBe("Great!");
      expect(doc.averageRating).toBe(5);
    });

    it("recalculates average correctly with multiple ratings", async () => {
      const doc = makeRouteDoc({
        creatorId: "creator1",
        ratings: [
          {
            userId: { toString: () => "user1" },
            rating: 4,
            comment: "",
            createdAt: new Date(),
          },
        ],
        averageRating: 4,
        ratingCount: 1,
      });
      mockRoute.findById.mockResolvedValue(doc);

      await rateRoute("user2", "r1", { rating: 2, comment: "" });

      expect(doc.ratings).toHaveLength(2);
      expect(doc.averageRating).toBe(3); // (4+2)/2
      expect(doc.ratingCount).toBe(2);
    });
  });

  // ======================== getRouteRatings ========================

  describe("getRouteRatings", () => {
    it("throws 404 when route not found", async () => {
      const chain = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(null),
      };
      mockRoute.findById.mockReturnValue(chain);

      await expect(getRouteRatings("r1")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("returns ratings with averageRating on success", async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 100000);
      const routeDoc = {
        averageRating: 4.5,
        ratingCount: 2,
        ratings: [
          { userId: { name: "Alice" }, rating: 5, comment: "Great", createdAt: earlier },
          { userId: { name: "Bob" }, rating: 4, comment: "Good", createdAt: now },
        ],
      };
      // ratings needs a .sort method since it's used by the service
      routeDoc.ratings.sort = jest.fn((fn) => [...routeDoc.ratings].sort(fn));

      const chain = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(routeDoc),
      };
      mockRoute.findById.mockReturnValue(chain);

      const result = await getRouteRatings("r1");

      expect(result.averageRating).toBe(4.5);
      expect(result.ratingCount).toBe(2);
      expect(result.ratings).toHaveLength(2);
    });
  });

  // ======================== deleteRating ========================

  describe("deleteRating", () => {
    it("throws 404 when route not found", async () => {
      mockRoute.findById.mockResolvedValue(null);

      await expect(deleteRating("user1", "r1")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("throws 404 when user has no rating on the route", async () => {
      const doc = makeRouteDoc({
        creatorId: "creator1",
        ratings: [
          {
            userId: { toString: () => "someoneElse" },
            rating: 3,
            comment: "",
            createdAt: new Date(),
          },
        ],
      });
      mockRoute.findById.mockResolvedValue(doc);

      await expect(deleteRating("user1", "r1")).rejects.toMatchObject({
        message: "Rating not found",
        statusCode: 404,
      });
    });

    it("removes the rating and recalculates average", async () => {
      const doc = makeRouteDoc({
        creatorId: "creator1",
        ratings: [
          {
            userId: { toString: () => "user1" },
            rating: 5,
            comment: "",
            createdAt: new Date(),
          },
          {
            userId: { toString: () => "user2" },
            rating: 3,
            comment: "",
            createdAt: new Date(),
          },
        ],
        averageRating: 4,
        ratingCount: 2,
      });
      mockRoute.findById.mockResolvedValue(doc);

      const result = await deleteRating("user1", "r1");

      expect(doc.ratings).toHaveLength(1);
      expect(doc.averageRating).toBe(3);
      expect(doc.ratingCount).toBe(1);
      expect(doc.save).toHaveBeenCalled();
      expect(result).toEqual({ message: "Rating deleted" });
    });

    it("sets averageRating to 0 when the last rating is deleted", async () => {
      const doc = makeRouteDoc({
        creatorId: "creator1",
        ratings: [
          {
            userId: { toString: () => "user1" },
            rating: 4,
            comment: "",
            createdAt: new Date(),
          },
        ],
        averageRating: 4,
        ratingCount: 1,
      });
      mockRoute.findById.mockResolvedValue(doc);

      const result = await deleteRating("user1", "r1");

      expect(doc.ratings).toHaveLength(0);
      expect(doc.averageRating).toBe(0);
      expect(doc.ratingCount).toBe(0);
      expect(doc.save).toHaveBeenCalled();
      expect(result).toEqual({ message: "Rating deleted" });
    });
  });
});
