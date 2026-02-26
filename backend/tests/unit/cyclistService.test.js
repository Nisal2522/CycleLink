import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// ── Mock: User model ────────────────────────────────────────────────
const mockUser = {
  findById: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
};
jest.unstable_mockModule("../../src/models/User.js", () => ({
  default: mockUser,
}));

// ── Mock: Reward model ──────────────────────────────────────────────
const mockReward = {
  find: jest.fn(),
};
jest.unstable_mockModule("../../src/models/Reward.js", () => ({
  default: mockReward,
}));

// ── Mock: Ride model ────────────────────────────────────────────────
const mockRide = {
  findOne: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
};
jest.unstable_mockModule("../../src/models/Ride.js", () => ({
  default: mockRide,
}));

// ── Mock: Route model ───────────────────────────────────────────────
const mockRoute = {
  findById: jest.fn(),
};
jest.unstable_mockModule("../../src/models/Route.js", () => ({
  default: mockRoute,
}));

// ── Dynamic import AFTER mocks ──────────────────────────────────────
const {
  getStats,
  startRide,
  endRide,
  cancelRide,
  getRides,
  getLeaderboard,
  getPartnerCount,
  getPartnerShops,
  getShopRewards,
} = await import("../../src/services/cyclistService.js");

// ── Helpers ─────────────────────────────────────────────────────────
const makeUserObj = (overrides = {}) => ({
  _id: "cyclist1",
  name: "Cyclist",
  email: "cyclist@test.com",
  tokens: 100,
  totalDistance: 50.123,
  co2Saved: 10.526,
  totalRides: 5,
  safetyScore: 90,
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

const makeRideObj = (overrides = {}) => ({
  _id: "ride1",
  cyclistId: { toString: () => "cyclist1" },
  status: "active",
  distance: 0,
  tokensEarned: 0,
  co2Saved: 0,
  save: jest.fn().mockResolvedValue(true),
  populate: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

// =====================================================================
// getStats
// =====================================================================
describe("getStats", () => {
  it("should throw 404 when user not found", async () => {
    mockUser.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    try {
      await getStats("nonexistent");
      expect(true).toBe(false);
    } catch (err) {
      expect(err.message).toBe("User not found");
      expect(err.statusCode).toBe(404);
    }
  });

  it("should return formatted stats on success", async () => {
    const user = makeUserObj();
    mockUser.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

    const result = await getStats("cyclist1");

    expect(mockUser.findById).toHaveBeenCalledWith("cyclist1");
    expect(result).toMatchObject({
      _id: "cyclist1",
      name: "Cyclist",
      tokens: 100,
      totalDistance: 50.12,
      co2Saved: 10.53,
      totalRides: 5,
      safetyScore: 90,
    });
  });
});

// =====================================================================
// startRide
// =====================================================================
describe("startRide", () => {
  it("should throw 400 if an active ride exists", async () => {
    mockRide.findOne.mockResolvedValue(makeRideObj());

    try {
      await startRide("cyclist1", {});
      expect(true).toBe(false);
    } catch (err) {
      expect(err.message).toBe("You already have an active ride. Please end it first.");
      expect(err.statusCode).toBe(400);
    }
  });

  it("should throw 404 if routeId is invalid", async () => {
    mockRide.findOne.mockResolvedValue(null);
    mockRoute.findById.mockResolvedValue(null);

    try {
      await startRide("cyclist1", { routeId: "badRoute" });
      expect(true).toBe(false);
    } catch (err) {
      expect(err.message).toBe("Route not found");
      expect(err.statusCode).toBe(404);
    }
  });

  it("should create a ride on success", async () => {
    mockRide.findOne.mockResolvedValue(null);
    const createdRide = makeRideObj();
    mockRide.create.mockResolvedValue(createdRide);

    const result = await startRide("cyclist1", { startLocation: "Park" });

    expect(mockRide.create).toHaveBeenCalledWith(
      expect.objectContaining({
        cyclistId: "cyclist1",
        startLocation: "Park",
        status: "active",
        distance: 0,
      })
    );
    expect(createdRide.populate).toHaveBeenCalledWith(
      "routeId",
      "startLocation endLocation distance"
    );
    expect(result).toBe(createdRide);
  });
});

// =====================================================================
// endRide
// =====================================================================
describe("endRide", () => {
  it("should throw 404 when ride not found", async () => {
    mockRide.findById.mockResolvedValue(null);

    try {
      await endRide("cyclist1", "badRide", { distance: 5 });
      expect(true).toBe(false);
    } catch (err) {
      expect(err.message).toBe("Ride not found");
      expect(err.statusCode).toBe(404);
    }
  });

  it("should throw 403 when user is not the ride owner", async () => {
    const ride = makeRideObj({ cyclistId: { toString: () => "otherUser" } });
    mockRide.findById.mockResolvedValue(ride);

    try {
      await endRide("cyclist1", "ride1", { distance: 5 });
      expect(true).toBe(false);
    } catch (err) {
      expect(err.message).toBe("You can only end your own rides");
      expect(err.statusCode).toBe(403);
    }
  });

  it("should throw 400 when ride is already ended", async () => {
    const ride = makeRideObj({ status: "completed" });
    mockRide.findById.mockResolvedValue(ride);

    try {
      await endRide("cyclist1", "ride1", { distance: 5 });
      expect(true).toBe(false);
    } catch (err) {
      expect(err.message).toBe("Ride already ended");
      expect(err.statusCode).toBe(400);
    }
  });

  it("should update ride and user stats on success", async () => {
    const ride = makeRideObj();
    mockRide.findById.mockResolvedValue(ride);
    const user = makeUserObj({ tokens: 100, totalDistance: 50, co2Saved: 10, totalRides: 5 });
    mockUser.findById.mockResolvedValue(user);

    const result = await endRide("cyclist1", "ride1", {
      distance: 10,
      endLocation: "Downtown",
      duration: "30 min",
    });

    // Ride should be updated
    expect(ride.status).toBe("completed");
    expect(ride.distance).toBe(10);
    expect(ride.endLocation).toBe("Downtown");
    expect(ride.tokensEarned).toBe(100); // 10 * TOKENS_PER_KM (10)
    expect(ride.co2Saved).toBe(2.1); // 10 * CO2_PER_KM (0.21)
    expect(ride.save).toHaveBeenCalled();

    // User stats should be updated
    expect(user.tokens).toBe(200); // 100 + 100
    expect(user.totalRides).toBe(6);
    expect(user.save).toHaveBeenCalled();

    expect(result).toHaveProperty("ride");
    expect(result).toHaveProperty("rewards");
    expect(result).toHaveProperty("totals");
    expect(result.rewards.tokensEarned).toBe(100);
  });
});

// =====================================================================
// cancelRide
// =====================================================================
describe("cancelRide", () => {
  it("should throw 404 when ride not found", async () => {
    mockRide.findById.mockResolvedValue(null);

    try {
      await cancelRide("cyclist1", "badRide");
      expect(true).toBe(false);
    } catch (err) {
      expect(err.message).toBe("Ride not found");
      expect(err.statusCode).toBe(404);
    }
  });

  it("should throw 403 when user is not the ride owner", async () => {
    const ride = makeRideObj({ cyclistId: { toString: () => "otherUser" } });
    mockRide.findById.mockResolvedValue(ride);

    try {
      await cancelRide("cyclist1", "ride1");
      expect(true).toBe(false);
    } catch (err) {
      expect(err.message).toBe("You can only cancel your own rides");
      expect(err.statusCode).toBe(403);
    }
  });

  it("should throw 400 when ride is already ended", async () => {
    const ride = makeRideObj({ status: "cancelled" });
    mockRide.findById.mockResolvedValue(ride);

    try {
      await cancelRide("cyclist1", "ride1");
      expect(true).toBe(false);
    } catch (err) {
      expect(err.message).toBe("Ride already ended");
      expect(err.statusCode).toBe(400);
    }
  });

  it("should cancel ride on success", async () => {
    const ride = makeRideObj();
    mockRide.findById.mockResolvedValue(ride);

    const result = await cancelRide("cyclist1", "ride1");

    expect(ride.status).toBe("cancelled");
    expect(ride.save).toHaveBeenCalled();
    expect(result).toEqual({ message: "Ride cancelled" });
  });
});

// =====================================================================
// getRides
// =====================================================================
describe("getRides", () => {
  it("should return rides with summary", async () => {
    const rides = [
      {
        _id: "r1",
        startLocation: "A",
        endLocation: "B",
        distance: 5,
        durationText: "10 min",
        durationMinutes: 10,
        tokensEarned: 50,
        co2Saved: 1.05,
        createdAt: "2025-06-01T00:00:00Z",
      },
      {
        _id: "r2",
        startLocation: "C",
        endLocation: "D",
        distance: 3,
        durationText: "7 min",
        durationMinutes: 7,
        tokensEarned: 30,
        co2Saved: 0.63,
        createdAt: "2025-06-02T00:00:00Z",
      },
    ];
    const mockLean = jest.fn().mockResolvedValue(rides);
    const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
    const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
    mockRide.find.mockReturnValue({ sort: mockSort });

    const result = await getRides("cyclist1", undefined, undefined);

    expect(mockRide.find).toHaveBeenCalledWith({ cyclistId: "cyclist1" });
    expect(result.summary).toEqual({
      totalDistance: 8,
      totalRides: 2,
      totalTokens: 80,
      totalCo2: 1.68,
    });
    expect(result.rides).toHaveLength(2);
    expect(result.rides[0]).toMatchObject({ _id: "r1", startLocation: "A" });
  });
});

// =====================================================================
// getLeaderboard
// =====================================================================
describe("getLeaderboard", () => {
  it("should return sorted leaderboard", async () => {
    const leaders = [
      { _id: "u1", name: "Alice", totalDistance: 100.456, co2Saved: 21.1, tokens: 1000, totalRides: 10 },
      { _id: "u2", name: "Bob", totalDistance: 80.321, co2Saved: 16.87, tokens: 800, totalRides: 8 },
    ];
    const mockSelect = jest.fn().mockResolvedValue(leaders);
    const mockLimit = jest.fn().mockReturnValue({ select: mockSelect });
    const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
    mockUser.find.mockReturnValue({ sort: mockSort });

    const result = await getLeaderboard();

    expect(mockUser.find).toHaveBeenCalledWith({ role: "cyclist" });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ rank: 1, name: "Alice", totalDistance: 100.46 });
    expect(result[1]).toMatchObject({ rank: 2, name: "Bob", totalDistance: 80.32 });
  });
});

// =====================================================================
// getPartnerCount
// =====================================================================
describe("getPartnerCount", () => {
  it("should return partner count", async () => {
    mockUser.countDocuments.mockResolvedValue(7);

    const result = await getPartnerCount();

    expect(mockUser.countDocuments).toHaveBeenCalledWith({ role: "partner" });
    expect(result).toEqual({ count: 7 });
  });
});

// =====================================================================
// getPartnerShops
// =====================================================================
describe("getPartnerShops", () => {
  it("should return partners with reward preview", async () => {
    const partners = [
      { _id: "p1", shopName: "Shop A", shopImage: "", toString: () => "p1" },
    ];
    // Partners: User.find chain → .select().lean()
    const mockPartnersLean = jest.fn().mockResolvedValue(partners);
    const mockPartnersSelect = jest.fn().mockReturnValue({ lean: mockPartnersLean });
    mockUser.find.mockReturnValueOnce({ select: mockPartnersSelect });

    // Rewards: Reward.find chain → .select().sort().lean()
    const rewards = [
      { partnerId: { toString: () => "p1" }, title: "Free Coffee", tokenCost: 50 },
      { partnerId: { toString: () => "p1" }, title: "Discount", tokenCost: 30 },
      { partnerId: { toString: () => "p1" }, title: "Extra", tokenCost: 20 },
    ];
    const mockRewardsLean = jest.fn().mockResolvedValue(rewards);
    const mockRewardsSort = jest.fn().mockReturnValue({ lean: mockRewardsLean });
    const mockRewardsSelect = jest.fn().mockReturnValue({ sort: mockRewardsSort });
    mockReward.find.mockReturnValue({ select: mockRewardsSelect });

    const result = await getPartnerShops();

    expect(result).toHaveLength(1);
    expect(result[0].shopName).toBe("Shop A");
    expect(result[0].rewardPreview).toHaveLength(2); // sliced to 2
    expect(result[0].totalRewards).toBe(3);
  });
});

// =====================================================================
// getShopRewards
// =====================================================================
describe("getShopRewards", () => {
  it("should throw 404 when partner not found", async () => {
    const mockLean = jest.fn().mockResolvedValue(null);
    const mockSelect = jest.fn().mockReturnValue({ lean: mockLean });
    mockUser.findById.mockReturnValue({ select: mockSelect });

    try {
      await getShopRewards("badId");
      expect(true).toBe(false);
    } catch (err) {
      expect(err.message).toBe("Partner shop not found");
      expect(err.statusCode).toBe(404);
    }
  });

  it("should return partner and rewards on success", async () => {
    const partner = { _id: "p1", shopName: "Shop A", shopImage: "" };
    const mockPartnerLean = jest.fn().mockResolvedValue(partner);
    const mockPartnerSelect = jest.fn().mockReturnValue({ lean: mockPartnerLean });
    mockUser.findById.mockReturnValue({ select: mockPartnerSelect });

    const rewards = [{ _id: "rw1", title: "Free Coffee", tokenCost: 50 }];
    const mockRewardsLean = jest.fn().mockResolvedValue(rewards);
    const mockRewardsSort = jest.fn().mockReturnValue({ lean: mockRewardsLean });
    const mockRewardsSelect = jest.fn().mockReturnValue({ sort: mockRewardsSort });
    mockReward.find.mockReturnValue({ select: mockRewardsSelect });

    const result = await getShopRewards("p1");

    expect(result.partner).toEqual(partner);
    expect(result.rewards).toEqual(rewards);
  });
});
