/**
 * tests/unit/hazardService.test.js
 * --------------------------------------------------
 * Unit tests for hazardService (ESM + Jest 30 unstable_mockModule).
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// --------------- mocks (before dynamic imports) ---------------

const mockHazard = {
  find: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
};

jest.unstable_mockModule("../../src/models/Hazard.js", () => ({
  default: mockHazard,
}));

jest.unstable_mockModule("../../src/constants.js", () => ({
  HAZARD_TYPES: ["pothole", "construction", "accident", "flooding", "other"],
  LIMITS: { HAZARDS_LIST: 200 },
}));

// --------------- dynamic imports ---------------

const {
  reportHazard,
  updateHazard,
  deleteHazard,
  verifyHazard,
  getHazardVerifications,
  moderateHazard,
  forceDeleteHazard,
  cleanupStaleHazards,
} = await import("../../src/services/hazardService.js");

// --------------- helpers ---------------

function objectId(str = "aaa") {
  return str;
}

function makeHazardDoc(overrides = {}) {
  const base = {
    _id: objectId("hazard1"),
    lat: 6.9,
    lng: 79.8,
    type: "pothole",
    description: "Big hole",
    reportedBy: objectId("user1"),
    active: true,
    status: "reported",
    verifications: [],
    existsCount: 0,
    resolvedCount: 0,
    spamCount: 0,
    save: jest.fn().mockResolvedValue(undefined),
    populate: jest.fn().mockResolvedValue(undefined),
    deleteOne: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  // make reportedBy behave like an ObjectId with .toString()
  if (typeof base.reportedBy === "string") {
    const raw = base.reportedBy;
    base.reportedBy = { toString: () => raw, _raw: raw };
  }
  return base;
}

// --------------- suite ---------------

describe("hazardService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ======================== reportHazard ========================

  describe("reportHazard", () => {
    it("creates a hazard with a valid type", async () => {
      const created = makeHazardDoc({ type: "pothole" });
      mockHazard.create.mockResolvedValue(created);

      const result = await reportHazard("user1", {
        lat: 6.9,
        lng: 79.8,
        type: "pothole",
        description: "Big hole",
      });

      expect(mockHazard.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: "pothole", lat: 6.9, lng: 79.8 })
      );
      expect(created.populate).toHaveBeenCalledWith("reportedBy", "name");
      expect(result).toBe(created);
    });

    it("falls back to 'other' for an invalid hazard type", async () => {
      const created = makeHazardDoc({ type: "other" });
      mockHazard.create.mockResolvedValue(created);

      await reportHazard("user1", {
        lat: 6.9,
        lng: 79.8,
        type: "alien_invasion",
        description: "",
      });

      expect(mockHazard.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: "other" })
      );
    });

    it("falls back to 'other' when type is empty", async () => {
      const created = makeHazardDoc({ type: "other" });
      mockHazard.create.mockResolvedValue(created);

      await reportHazard("user1", { lat: 1, lng: 2, type: "" });

      expect(mockHazard.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: "other" })
      );
    });
  });

  // ======================== updateHazard ========================

  describe("updateHazard", () => {
    it("throws 404 when hazard not found", async () => {
      mockHazard.findById.mockResolvedValue(null);

      await expect(updateHazard("h1", "user1", {})).rejects.toMatchObject({
        message: "Hazard not found",
        statusCode: 404,
      });
    });

    it("throws 403 when user is not the owner", async () => {
      const doc = makeHazardDoc({ reportedBy: "owner123" });
      mockHazard.findById.mockResolvedValue(doc);

      await expect(
        updateHazard("h1", "differentUser", { type: "flooding" })
      ).rejects.toMatchObject({
        message: "You can only edit hazards you reported",
        statusCode: 403,
      });
    });

    it("updates fields and returns the hazard on success", async () => {
      const doc = makeHazardDoc({ reportedBy: "user1" });
      mockHazard.findById.mockResolvedValue(doc);

      const result = await updateHazard("h1", "user1", {
        type: "construction",
        description: "Updated desc",
      });

      expect(doc.type).toBe("construction");
      expect(doc.description).toBe("Updated desc");
      expect(doc.save).toHaveBeenCalled();
      expect(doc.populate).toHaveBeenCalledWith("reportedBy", "name");
      expect(result).toBe(doc);
    });
  });

  // ======================== deleteHazard ========================

  describe("deleteHazard", () => {
    it("throws 404 when hazard not found", async () => {
      mockHazard.findById.mockResolvedValue(null);

      await expect(deleteHazard("h1", "user1")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("throws 403 when user is not the owner", async () => {
      const doc = makeHazardDoc({ reportedBy: "owner1" });
      mockHazard.findById.mockResolvedValue(doc);

      await expect(deleteHazard("h1", "otherUser")).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it("calls deleteOne and returns confirmation on success", async () => {
      const doc = makeHazardDoc({ reportedBy: "user1" });
      mockHazard.findById.mockResolvedValue(doc);

      const result = await deleteHazard("h1", "user1");

      expect(doc.deleteOne).toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({ message: "Hazard deleted successfully", _id: "h1" })
      );
    });
  });

  // ======================== verifyHazard ========================

  describe("verifyHazard", () => {
    it("throws 404 when hazard not found", async () => {
      mockHazard.findById.mockResolvedValue(null);

      await expect(verifyHazard("h1", "user1", "exists")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("throws 403 when user tries to verify their own hazard", async () => {
      const doc = makeHazardDoc({ reportedBy: "user1" });
      mockHazard.findById.mockResolvedValue(doc);

      await expect(verifyHazard("h1", "user1", "exists")).rejects.toMatchObject({
        message: "You cannot verify your own hazard",
        statusCode: 403,
      });
    });

    it("adds a new verification entry", async () => {
      const doc = makeHazardDoc({ reportedBy: "reporter1" });
      mockHazard.findById.mockResolvedValue(doc);

      await verifyHazard("h1", "verifier1", "exists");

      expect(doc.verifications).toHaveLength(1);
      expect(doc.verifications[0].userId).toBe("verifier1");
      expect(doc.verifications[0].status).toBe("exists");
      expect(doc.existsCount).toBe(1);
      expect(doc.save).toHaveBeenCalled();
    });

    it("updates an existing verification instead of adding a duplicate", async () => {
      const doc = makeHazardDoc({
        reportedBy: "reporter1",
        verifications: [
          { userId: { toString: () => "verifier1" }, status: "exists", timestamp: new Date() },
        ],
      });
      mockHazard.findById.mockResolvedValue(doc);

      await verifyHazard("h1", "verifier1", "resolved");

      // should still be 1 entry, not 2
      expect(doc.verifications).toHaveLength(1);
      expect(doc.verifications[0].status).toBe("resolved");
      expect(doc.resolvedCount).toBe(1);
      expect(doc.existsCount).toBe(0);
    });

    it("auto-sets status to 'verified' when existsCount >= 2", async () => {
      const doc = makeHazardDoc({
        reportedBy: "reporter1",
        status: "reported",
        verifications: [
          { userId: { toString: () => "v1" }, status: "exists", timestamp: new Date() },
        ],
      });
      mockHazard.findById.mockResolvedValue(doc);

      await verifyHazard("h1", "v2", "exists");

      expect(doc.existsCount).toBe(2);
      expect(doc.status).toBe("verified");
    });

    it("auto-resolves when resolvedCount >= 3", async () => {
      const doc = makeHazardDoc({
        reportedBy: "reporter1",
        status: "verified",
        verifications: [
          { userId: { toString: () => "v1" }, status: "resolved", timestamp: new Date() },
          { userId: { toString: () => "v2" }, status: "resolved", timestamp: new Date() },
        ],
      });
      mockHazard.findById.mockResolvedValue(doc);

      await verifyHazard("h1", "v3", "resolved");

      expect(doc.resolvedCount).toBe(3);
      expect(doc.status).toBe("resolved");
      expect(doc.resolvedAt).toBeInstanceOf(Date);
      expect(doc.resolvedBy).toBe("v3");
    });

    it("auto-marks invalid when spamCount >= 3", async () => {
      const doc = makeHazardDoc({
        reportedBy: "reporter1",
        status: "reported",
        verifications: [
          { userId: { toString: () => "v1" }, status: "spam", timestamp: new Date() },
          { userId: { toString: () => "v2" }, status: "spam", timestamp: new Date() },
        ],
      });
      mockHazard.findById.mockResolvedValue(doc);

      await verifyHazard("h1", "v3", "spam");

      expect(doc.spamCount).toBe(3);
      expect(doc.status).toBe("invalid");
      expect(doc.active).toBe(false);
    });
  });

  // ======================== getHazardVerifications ========================

  describe("getHazardVerifications", () => {
    it("throws 404 when hazard not found", async () => {
      // findById returns a chain object; the chain must resolve to null
      const chain = { populate: jest.fn().mockReturnThis(), select: jest.fn().mockResolvedValue(null) };
      mockHazard.findById.mockReturnValue(chain);

      await expect(getHazardVerifications("h1")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("returns hazard with populated verifications on success", async () => {
      const hazardDoc = {
        verifications: [{ userId: { name: "Alice" }, status: "exists" }],
        existsCount: 1,
        resolvedCount: 0,
        spamCount: 0,
        status: "reported",
      };
      const chain = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(hazardDoc),
      };
      mockHazard.findById.mockReturnValue(chain);

      const result = await getHazardVerifications("h1");

      expect(chain.populate).toHaveBeenCalledWith("verifications.userId", "name");
      expect(result).toBe(hazardDoc);
    });
  });

  // ======================== moderateHazard ========================

  describe("moderateHazard", () => {
    it("throws 404 when hazard not found", async () => {
      mockHazard.findById.mockResolvedValue(null);

      await expect(
        moderateHazard("h1", "admin1", { status: "resolved" })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("updates status, active, and moderationNote on success", async () => {
      const doc = makeHazardDoc({ reportedBy: "reporter1" });
      mockHazard.findById.mockResolvedValue(doc);

      const result = await moderateHazard("h1", "admin1", {
        status: "resolved",
        active: false,
        moderationNote: "Cleaned up",
      });

      expect(doc.status).toBe("resolved");
      expect(doc.active).toBe(false);
      expect(doc.moderationNote).toBe("Cleaned up");
      expect(doc.moderatedBy).toBe("admin1");
      expect(doc.save).toHaveBeenCalled();
      expect(doc.populate).toHaveBeenCalledWith("reportedBy", "name");
      expect(result).toBe(doc);
    });
  });

  // ======================== forceDeleteHazard ========================

  describe("forceDeleteHazard", () => {
    it("throws 404 when hazard not found", async () => {
      mockHazard.findById.mockResolvedValue(null);

      await expect(forceDeleteHazard("h1", "admin1")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("deletes the hazard and returns confirmation", async () => {
      const doc = makeHazardDoc({ reportedBy: "reporter1" });
      mockHazard.findById.mockResolvedValue(doc);

      const result = await forceDeleteHazard("h1", "admin1");

      expect(doc.deleteOne).toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({ message: "Hazard deleted by admin", _id: "h1" })
      );
    });
  });

  // ======================== cleanupStaleHazards ========================

  describe("cleanupStaleHazards", () => {
    it("returns the count of stale hazards processed", async () => {
      const staleDoc1 = makeHazardDoc();
      const staleDoc2 = makeHazardDoc();
      const chain = {
        // Hazard.find returns array-like directly since no chaining in this call path
      };
      mockHazard.find.mockResolvedValue([staleDoc1, staleDoc2]);

      const result = await cleanupStaleHazards();

      expect(result.count).toBe(2);
      expect(result.message).toContain("2");
      expect(staleDoc1.active).toBe(false);
      expect(staleDoc1.save).toHaveBeenCalled();
      expect(staleDoc2.active).toBe(false);
      expect(staleDoc2.save).toHaveBeenCalled();
    });

    it("returns count 0 when no stale hazards exist", async () => {
      mockHazard.find.mockResolvedValue([]);

      const result = await cleanupStaleHazards();

      expect(result.count).toBe(0);
    });
  });
});
