/**
 * tests/unit/transactionService.test.js
 * --------------------------------------------------
 * Unit tests for transactionService (ESM + Jest 30 unstable_mockModule).
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// --------------- mocks (before dynamic imports) ---------------

const mockUser = {
  findById: jest.fn(),
};

const mockRedemption = {
  create: jest.fn(),
  findOne: jest.fn(),
};

jest.unstable_mockModule("../../src/models/User.js", () => ({
  default: mockUser,
}));

jest.unstable_mockModule("../../src/models/Redemption.js", () => ({
  default: mockRedemption,
}));

jest.unstable_mockModule("../../src/models/Payout.js", () => ({
  TOKEN_VALUE: 10,
}));

const mockNotifyRewardClaimed = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule("../../src/services/notificationService.js", () => ({
  notifyRewardClaimed: mockNotifyRewardClaimed,
}));

// --------------- dynamic imports ---------------

const { redeemTokens, confirmRedeem } = await import(
  "../../src/services/transactionService.js"
);

// --------------- helpers ---------------

function makeCyclistDoc(overrides = {}) {
  const base = {
    _id: "cyclist1",
    name: "Alice",
    role: "cyclist",
    tokens: 100,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return base;
}

function makePartnerDoc(overrides = {}) {
  const base = {
    _id: "partner1",
    name: "Bob's Shop",
    shopName: "Bob's Cafe",
    role: "partner",
    partnerTotalRedemptions: 5,
    partnerAvailableBalance: 500,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return base;
}

// --------------- suite ---------------

describe("transactionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ======================== redeemTokens ========================

  describe("redeemTokens", () => {
    it("throws 404 when cyclist is not found", async () => {
      mockUser.findById.mockResolvedValue(null);

      await expect(redeemTokens("partner1", "badId", 10)).rejects.toMatchObject(
        { message: "Cyclist not found", statusCode: 404 }
      );
    });

    it("throws 404 when user exists but role is not cyclist", async () => {
      mockUser.findById.mockResolvedValue({
        _id: "u1",
        role: "partner",
        tokens: 100,
      });

      await expect(redeemTokens("partner1", "u1", 10)).rejects.toMatchObject({
        message: "Cyclist not found",
        statusCode: 404,
      });
    });

    it("throws 400 when cyclist has insufficient tokens", async () => {
      const cyclist = makeCyclistDoc({ tokens: 5 });
      mockUser.findById.mockResolvedValueOnce(cyclist);

      await expect(redeemTokens("partner1", "cyclist1", 10)).rejects.toMatchObject(
        { message: "Cyclist does not have enough tokens", statusCode: 400 }
      );
    });

    it("deducts tokens, updates partner, creates redemption on success", async () => {
      const cyclist = makeCyclistDoc({ tokens: 50 });
      const partner = makePartnerDoc({
        partnerTotalRedemptions: 2,
        partnerAvailableBalance: 100,
      });

      // First findById call returns cyclist, second returns partner
      mockUser.findById
        .mockResolvedValueOnce(cyclist)
        .mockResolvedValueOnce(partner);
      mockRedemption.create.mockResolvedValue({});

      const result = await redeemTokens("partner1", "cyclist1", 10);

      // Cyclist tokens deducted
      expect(cyclist.tokens).toBe(40);
      expect(cyclist.save).toHaveBeenCalled();

      // Partner updated
      expect(partner.partnerTotalRedemptions).toBe(3);
      expect(partner.partnerAvailableBalance).toBe(200); // 100 + 10 * 10
      expect(partner.save).toHaveBeenCalled();

      // Redemption created
      expect(mockRedemption.create).toHaveBeenCalledWith(
        expect.objectContaining({
          partnerId: "partner1",
          cyclistId: "cyclist1",
          tokens: 10,
        })
      );

      // Notification sent
      expect(mockNotifyRewardClaimed).toHaveBeenCalledWith(
        expect.objectContaining({
          cyclistId: "cyclist1",
          partnerId: "partner1",
          tokens: 10,
          type: "manual",
        })
      );

      // Return shape
      expect(result.message).toBe("Tokens redeemed successfully");
      expect(result.redeemedTokens).toBe(10);
      expect(result.cyclist.tokens).toBe(40);
    });
  });

  // ======================== confirmRedeem ========================

  describe("confirmRedeem", () => {
    it("throws 400 when tokenAmount is NaN", async () => {
      await expect(
        confirmRedeem("partner1", {
          transactionId: "tx1",
          tokenAmount: "not-a-number",
          cyclistId: "cyclist1",
        })
      ).rejects.toMatchObject({
        message: "tokenAmount must be a positive number",
        statusCode: 400,
      });
    });

    it("throws 400 when tokenAmount is 0", async () => {
      await expect(
        confirmRedeem("partner1", {
          transactionId: "tx1",
          tokenAmount: 0,
          cyclistId: "cyclist1",
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("throws 400 when tokenAmount is negative", async () => {
      await expect(
        confirmRedeem("partner1", {
          transactionId: "tx1",
          tokenAmount: -5,
          cyclistId: "cyclist1",
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("throws 400 for duplicate QR (transactionId already used)", async () => {
      mockRedemption.findOne.mockResolvedValue({ _id: "existing" });

      await expect(
        confirmRedeem("partner1", {
          transactionId: "tx-dup",
          tokenAmount: 10,
          cyclistId: "cyclist1",
        })
      ).rejects.toMatchObject({
        message: "This QR code has already been used",
        statusCode: 400,
      });
    });

    it("throws 400 when QR code has expired", async () => {
      mockRedemption.findOne.mockResolvedValue(null);

      const pastDate = new Date(Date.now() - 60000).toISOString();

      await expect(
        confirmRedeem("partner1", {
          transactionId: "tx1",
          tokenAmount: 10,
          cyclistId: "cyclist1",
          expiryTime: pastDate,
        })
      ).rejects.toMatchObject({
        message: "This QR code has expired",
        statusCode: 400,
      });
    });

    it("throws 404 when cyclist is not found", async () => {
      mockRedemption.findOne.mockResolvedValue(null);
      mockUser.findById.mockResolvedValue(null);

      await expect(
        confirmRedeem("partner1", {
          transactionId: "tx1",
          tokenAmount: 10,
          cyclistId: "badId",
        })
      ).rejects.toMatchObject({
        message: "Cyclist not found",
        statusCode: 404,
      });
    });

    it("throws 400 when cyclist has insufficient tokens", async () => {
      mockRedemption.findOne.mockResolvedValue(null);
      const cyclist = makeCyclistDoc({ tokens: 3 });
      mockUser.findById.mockResolvedValueOnce(cyclist);

      await expect(
        confirmRedeem("partner1", {
          transactionId: "tx1",
          tokenAmount: 10,
          cyclistId: "cyclist1",
        })
      ).rejects.toMatchObject({
        message: "Cyclist does not have enough tokens",
        statusCode: 400,
      });
    });

    it("deducts tokens, updates partner, creates redemption with transactionId on success", async () => {
      mockRedemption.findOne.mockResolvedValue(null);

      const cyclist = makeCyclistDoc({ tokens: 50 });
      const partner = makePartnerDoc({
        partnerTotalRedemptions: 0,
        partnerAvailableBalance: 0,
      });

      mockUser.findById
        .mockResolvedValueOnce(cyclist)
        .mockResolvedValueOnce(partner);
      mockRedemption.create.mockResolvedValue({});

      const futureDate = new Date(Date.now() + 600000).toISOString();

      const result = await confirmRedeem("partner1", {
        transactionId: "tx-abc",
        mealName: "Pasta",
        tokenAmount: 15,
        cyclistId: "cyclist1",
        cyclistName: "Alice",
        expiryTime: futureDate,
      });

      // Cyclist tokens deducted
      expect(cyclist.tokens).toBe(35);
      expect(cyclist.save).toHaveBeenCalled();

      // Partner updated
      expect(partner.partnerTotalRedemptions).toBe(1);
      expect(partner.partnerAvailableBalance).toBe(150); // 15 * 10
      expect(partner.save).toHaveBeenCalled();

      // Redemption created with transactionId and itemName
      expect(mockRedemption.create).toHaveBeenCalledWith(
        expect.objectContaining({
          partnerId: "partner1",
          cyclistId: "cyclist1",
          tokens: 15,
          transactionId: "tx-abc",
          itemName: "Pasta",
        })
      );

      // Notification sent with type "qr"
      expect(mockNotifyRewardClaimed).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: 15,
          transactionId: "tx-abc",
          itemName: "Pasta",
          type: "qr",
        })
      );

      // Return shape
      expect(result.message).toBe("Checkout completed");
      expect(result.status).toBe("Completed");
      expect(result.transactionId).toBe("tx-abc");
      expect(result.redeemedTokens).toBe(15);
      expect(result.cyclist.tokens).toBe(35);
    });
  });
});
