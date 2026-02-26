import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// ── Mock: Reward model ──────────────────────────────────────────────
const mockReward = {
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
};
jest.unstable_mockModule("../../src/models/Reward.js", () => ({
  default: mockReward,
}));

// ── Dynamic import AFTER mocks ──────────────────────────────────────
const {
  createReward,
  getPartnerRewards,
  updateReward,
  deleteReward,
} = await import("../../src/services/rewardService.js");

// ── Helpers ─────────────────────────────────────────────────────────
const makeReward = (overrides = {}) => ({
  _id: "reward1",
  partnerId: { toString: () => "partner1" },
  title: "Free Coffee",
  description: "A free cup of coffee",
  tokenCost: 50,
  expiryDate: "2026-12-31",
  active: true,
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

// =====================================================================
// createReward
// =====================================================================
describe("createReward", () => {
  it("should create and return a reward", async () => {
    const reward = makeReward();
    mockReward.create.mockResolvedValue(reward);

    const result = await createReward("partner1", {
      title: "Free Coffee",
      description: "A free cup of coffee",
      tokenCost: 50,
      expiryDate: "2026-12-31",
    });

    expect(mockReward.create).toHaveBeenCalledWith({
      partnerId: "partner1",
      title: "Free Coffee",
      description: "A free cup of coffee",
      tokenCost: 50,
      expiryDate: "2026-12-31",
    });
    expect(result).toBe(reward);
  });
});

// =====================================================================
// getPartnerRewards
// =====================================================================
describe("getPartnerRewards", () => {
  it("should throw 403 when partnerId does not match targetPartnerId", async () => {
    try {
      await getPartnerRewards("partner1", "partner2");
      expect(true).toBe(false);
    } catch (err) {
      expect(err.message).toBe("You can only view your own rewards");
      expect(err.statusCode).toBe(403);
    }
  });

  it("should return rewards on success", async () => {
    const rewards = [makeReward(), makeReward({ _id: "reward2", title: "Discount" })];
    const mockLean = jest.fn().mockResolvedValue(rewards);
    const mockSort = jest.fn().mockReturnValue({ lean: mockLean });
    mockReward.find.mockReturnValue({ sort: mockSort });

    const result = await getPartnerRewards("partner1", "partner1");

    expect(mockReward.find).toHaveBeenCalledWith({
      partnerId: "partner1",
      active: true,
    });
    expect(result).toEqual(rewards);
  });
});

// =====================================================================
// updateReward
// =====================================================================
describe("updateReward", () => {
  it("should throw 404 when reward not found", async () => {
    mockReward.findById.mockResolvedValue(null);

    try {
      await updateReward("partner1", "badId", { title: "New" });
      expect(true).toBe(false);
    } catch (err) {
      expect(err.message).toBe("Reward not found");
      expect(err.statusCode).toBe(404);
    }
  });

  it("should throw 403 when partner does not own the reward", async () => {
    const reward = makeReward({ partnerId: { toString: () => "otherPartner" } });
    mockReward.findById.mockResolvedValue(reward);

    try {
      await updateReward("partner1", "reward1", { title: "New" });
      expect(true).toBe(false);
    } catch (err) {
      expect(err.message).toBe("You can only update your own rewards");
      expect(err.statusCode).toBe(403);
    }
  });

  it("should update fields and save on success", async () => {
    const reward = makeReward();
    mockReward.findById.mockResolvedValue(reward);

    const result = await updateReward("partner1", "reward1", {
      title: "Updated Coffee",
      tokenCost: 75,
    });

    expect(reward.title).toBe("Updated Coffee");
    expect(reward.tokenCost).toBe(75);
    expect(reward.save).toHaveBeenCalled();
    expect(result).toBe(reward);
  });
});

// =====================================================================
// deleteReward
// =====================================================================
describe("deleteReward", () => {
  it("should throw 404 when reward not found", async () => {
    mockReward.findById.mockResolvedValue(null);

    try {
      await deleteReward("partner1", "badId");
      expect(true).toBe(false);
    } catch (err) {
      expect(err.message).toBe("Reward not found");
      expect(err.statusCode).toBe(404);
    }
  });

  it("should throw 403 when partner does not own the reward", async () => {
    const reward = makeReward({ partnerId: { toString: () => "otherPartner" } });
    mockReward.findById.mockResolvedValue(reward);

    try {
      await deleteReward("partner1", "reward1");
      expect(true).toBe(false);
    } catch (err) {
      expect(err.message).toBe("You can only delete your own rewards");
      expect(err.statusCode).toBe(403);
    }
  });

  it("should set active to false and save on success", async () => {
    const reward = makeReward();
    mockReward.findById.mockResolvedValue(reward);

    const result = await deleteReward("partner1", "reward1");

    expect(reward.active).toBe(false);
    expect(reward.save).toHaveBeenCalled();
    expect(result).toEqual({ message: "Reward archived", _id: "reward1" });
  });
});
