/**
 * Unit tests for src/services/partnerService.js
 * ESM + Jest 30 with jest.unstable_mockModule
 */
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

/* ------------------------------------------------------------------ */
/*  Mock all models and cloudinary BEFORE importing the service       */
/* ------------------------------------------------------------------ */

const User = {
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
};

const Payout = {
  find: jest.fn(),
};

const PayoutRequest = {
  find: jest.fn(),
  create: jest.fn(),
};

const Redemption = {
  find: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
};

const cloudinaryUploader = { upload: jest.fn() };
const cloudinaryConfig = jest.fn();

jest.unstable_mockModule("../../src/models/User.js", () => ({
  default: User,
}));

jest.unstable_mockModule("../../src/models/Payout.js", () => ({
  default: Payout,
  TOKEN_VALUE: 10,
}));

jest.unstable_mockModule("../../src/models/PayoutRequest.js", () => ({
  default: PayoutRequest,
}));

jest.unstable_mockModule("../../src/models/Redemption.js", () => ({
  default: Redemption,
}));

jest.unstable_mockModule("cloudinary", () => ({
  v2: {
    config: cloudinaryConfig,
    uploader: cloudinaryUploader,
  },
}));

/* ------------------------------------------------------------------ */
/*  Dynamic import after mocks are in place                           */
/* ------------------------------------------------------------------ */

const {
  getProfile,
  updateProfile,
  getBankDetails,
  updateBankDetails,
  clearBankDetails,
  createPayoutRequest,
  getCheckouts,
  getScanStats,
  getRecentRedemptions,
  getEarningsSummary,
} = await import("../../src/services/partnerService.js");

/* ------------------------------------------------------------------ */
/*  Reset mocks before each test                                      */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  jest.clearAllMocks();
});

/* ================================================================== */
/*  1. getProfile                                                     */
/* ================================================================== */
describe("getProfile", () => {
  it("should throw 404 when user is not found", async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(getProfile("nonexistent")).rejects.toMatchObject({
      message: "User not found",
      statusCode: 404,
    });
  });

  it("should return formatted profile on success", async () => {
    const mockUser = {
      _id: "p1",
      name: "Shop Owner",
      email: "shop@test.com",
      role: "partner",
      shopName: "My Shop",
      shopImage: "https://img.example.com/shop.jpg",
      description: "A great shop",
      location: "Colombo",
      address: "123 Main St",
      category: "Food",
      phoneNumber: "0771234567",
      partnerTotalRedemptions: 50,
      partnerAvailableBalance: 500,
      bankDetails: {
        bankName: "BOC",
        branchName: "Colombo",
        accountNo: "123456",
        accountHolderName: "Shop Owner",
      },
    };

    User.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      }),
    });

    const result = await getProfile("p1");

    expect(result._id).toBe("p1");
    expect(result.name).toBe("Shop Owner");
    expect(result.shopName).toBe("My Shop");
    expect(result.shopImageUrl).toBe("https://img.example.com/shop.jpg");
    expect(result.partnerTotalRedemptions).toBe(50);
    expect(result.partnerAvailableBalance).toBe(500);
    expect(result.bankDetails.bankName).toBe("BOC");
    expect(result.bankDetails.accountNo).toBe("123456");
  });
});

/* ================================================================== */
/*  2. updateProfile                                                  */
/* ================================================================== */
describe("updateProfile", () => {
  it("should throw 404 when user is not found", async () => {
    User.findById.mockResolvedValue(null);

    await expect(updateProfile("nonexistent", { shopName: "X" })).rejects.toMatchObject({
      message: "User not found",
      statusCode: 404,
    });
  });

  it("should update fields and return updated profile", async () => {
    const mockUser = {
      shopName: "",
      description: "",
      location: "",
      address: "",
      category: "",
      phoneNumber: "",
      shopImage: "",
      save: jest.fn().mockResolvedValue(true),
    };
    User.findById.mockResolvedValue(mockUser);

    const result = await updateProfile("p1", {
      shopName: "New Shop",
      description: "Updated description",
      location: "Kandy",
      address: "456 Elm St",
      category: "Bike Parts",
      phoneNumber: "0779999999",
      shopImageUrl: "https://img.example.com/new.jpg",
    });

    expect(mockUser.save).toHaveBeenCalled();
    expect(result.shopName).toBe("New Shop");
    expect(result.description).toBe("Updated description");
    expect(result.location).toBe("Kandy");
    expect(result.address).toBe("456 Elm St");
    expect(result.category).toBe("Bike Parts");
    expect(result.phoneNumber).toBe("0779999999");
    expect(result.shopImageUrl).toBe("https://img.example.com/new.jpg");
  });
});

/* ================================================================== */
/*  3. getBankDetails                                                 */
/* ================================================================== */
describe("getBankDetails", () => {
  it("should return bank details for existing user", async () => {
    const mockUser = {
      bankDetails: {
        bankName: "BOC",
        branchName: "Colombo",
        accountNo: "123456",
        accountHolderName: "Shop Owner",
      },
    };

    User.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      }),
    });

    const result = await getBankDetails("p1");

    expect(result.bankDetails.bankName).toBe("BOC");
    expect(result.bankDetails.branchName).toBe("Colombo");
    expect(result.bankDetails.accountNo).toBe("123456");
    expect(result.bankDetails.accountHolderName).toBe("Shop Owner");
  });

  it("should return empty strings when user has no bank details", async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ bankDetails: null }),
        }),
      }),
    });

    const result = await getBankDetails("p1");

    expect(result.bankDetails.bankName).toBe("");
    expect(result.bankDetails.branchName).toBe("");
    expect(result.bankDetails.accountNo).toBe("");
    expect(result.bankDetails.accountHolderName).toBe("");
  });
});

/* ================================================================== */
/*  4. updateBankDetails                                              */
/* ================================================================== */
describe("updateBankDetails", () => {
  it("should throw 404 when user is not found", async () => {
    User.findById.mockResolvedValue(null);

    await expect(
      updateBankDetails("nonexistent", { bankName: "BOC" })
    ).rejects.toMatchObject({
      message: "User not found",
      statusCode: 404,
    });
  });

  it("should update bank detail fields and return them", async () => {
    const mockUser = {
      bankDetails: {},
      save: jest.fn().mockResolvedValue(true),
    };
    User.findById.mockResolvedValue(mockUser);

    const result = await updateBankDetails("p1", {
      bankName: "HNB",
      branchName: "Kandy",
      accountNo: "9876543",
      accountHolderName: "Partner Name",
    });

    expect(mockUser.save).toHaveBeenCalled();
    expect(result.bankDetails.bankName).toBe("HNB");
    expect(result.bankDetails.branchName).toBe("Kandy");
    expect(result.bankDetails.accountNo).toBe("9876543");
    expect(result.bankDetails.accountHolderName).toBe("Partner Name");
  });
});

/* ================================================================== */
/*  5. clearBankDetails                                               */
/* ================================================================== */
describe("clearBankDetails", () => {
  it("should throw 404 when user is not found", async () => {
    User.findById.mockResolvedValue(null);

    await expect(clearBankDetails("nonexistent")).rejects.toMatchObject({
      message: "User not found",
      statusCode: 404,
    });
  });

  it("should clear all bank detail fields to empty strings", async () => {
    const mockUser = {
      bankDetails: {
        bankName: "BOC",
        branchName: "Colombo",
        accountNo: "123456",
        accountHolderName: "Owner",
      },
      save: jest.fn().mockResolvedValue(true),
    };
    User.findById.mockResolvedValue(mockUser);

    const result = await clearBankDetails("p1");

    expect(mockUser.save).toHaveBeenCalled();
    expect(result.bankDetails.bankName).toBe("");
    expect(result.bankDetails.branchName).toBe("");
    expect(result.bankDetails.accountNo).toBe("");
    expect(result.bankDetails.accountHolderName).toBe("");
  });
});

/* ================================================================== */
/*  6. createPayoutRequest                                            */
/* ================================================================== */
describe("createPayoutRequest", () => {
  it("should throw 404 when user is not found", async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    await expect(createPayoutRequest("nonexistent", 100)).rejects.toMatchObject({
      message: "User not found",
      statusCode: 404,
    });
  });

  it("should throw 400 when bank details are missing", async () => {
    const mockUser = {
      _id: "p1",
      partnerAvailableBalance: 1000,
      bankDetails: {
        bankName: "",
        branchName: "",
        accountNo: "",
        accountHolderName: "",
      },
    };
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    await expect(createPayoutRequest("p1", 100)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("should throw 400 when amount exceeds available balance", async () => {
    const mockUser = {
      _id: "p1",
      partnerAvailableBalance: 50,
      bankDetails: {
        bankName: "BOC",
        branchName: "Colombo",
        accountNo: "123456",
        accountHolderName: "Owner",
      },
    };
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    await expect(createPayoutRequest("p1", 100)).rejects.toMatchObject({
      message: "Amount exceeds available balance",
      statusCode: 400,
    });
  });

  it("should create a payout request on success", async () => {
    const mockUser = {
      _id: "p1",
      partnerAvailableBalance: 500,
      bankDetails: {
        bankName: "BOC",
        branchName: "Colombo",
        accountNo: "123456",
        accountHolderName: "Owner",
      },
    };
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    const createdDoc = { _id: "pr1", partnerId: "p1", amount: 200, status: "Pending" };
    PayoutRequest.create.mockResolvedValue(createdDoc);

    const result = await createPayoutRequest("p1", 200);

    expect(PayoutRequest.create).toHaveBeenCalledWith({
      partnerId: "p1",
      amount: 200,
      status: "Pending",
    });
    expect(result).toEqual(createdDoc);
  });
});

/* ================================================================== */
/*  7. getCheckouts                                                   */
/* ================================================================== */
describe("getCheckouts", () => {
  it("should return paginated checkouts", async () => {
    Redemption.countDocuments.mockResolvedValue(25);

    const mockCheckouts = [
      {
        _id: { toString: () => "r1" },
        transactionId: "txn1",
        cyclistId: { name: "John" },
        itemName: "Water Bottle",
        tokens: 5,
        createdAt: new Date("2025-06-01"),
      },
      {
        _id: { toString: () => "r2" },
        transactionId: "",
        cyclistId: null,
        itemName: null,
        tokens: 3,
        createdAt: new Date("2025-06-02"),
      },
    ];

    Redemption.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockCheckouts),
            }),
          }),
        }),
      }),
    });

    const result = await getCheckouts("p1", 1, 10);

    expect(result.total).toBe(25);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.totalPages).toBe(3);
    expect(result.checkouts).toHaveLength(2);
    expect(result.checkouts[0].transactionId).toBe("txn1");
    expect(result.checkouts[0].cyclistName).toBe("John");
    expect(result.checkouts[1].cyclistName).toBe("\u2014");
  });
});

/* ================================================================== */
/*  8. getScanStats                                                   */
/* ================================================================== */
describe("getScanStats", () => {
  it("should return scan stats with aggregation data", async () => {
    // countDocuments is called twice: once for today match, once for total
    Redemption.countDocuments
      .mockResolvedValueOnce(5)   // scansToday
      .mockResolvedValueOnce(42); // totalRedemptions

    Redemption.aggregate.mockReturnValue({
      then: (cb) => Promise.resolve(cb([{ _id: null, tokens: 120 }])),
    });

    const result = await getScanStats("p1");

    expect(result.scansToday).toBe(5);
    expect(result.tokensRedeemedToday).toBe(120);
    expect(result.successRate).toBe(100);
  });

  it("should return 0 tokens redeemed today when no aggregation results", async () => {
    Redemption.countDocuments
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    Redemption.aggregate.mockReturnValue({
      then: (cb) => Promise.resolve(cb([])),
    });

    const result = await getScanStats("p1");

    expect(result.scansToday).toBe(0);
    expect(result.tokensRedeemedToday).toBe(0);
  });
});

/* ================================================================== */
/*  9. getRecentRedemptions                                           */
/* ================================================================== */
describe("getRecentRedemptions", () => {
  it("should return recent redemptions list", async () => {
    const mockRedemptions = [
      {
        _id: { toString: () => "r1" },
        cyclistId: { name: "Alice" },
        createdAt: new Date("2025-06-01"),
        tokens: 10,
      },
      {
        _id: { toString: () => "r2" },
        cyclistId: null,
        createdAt: new Date("2025-06-02"),
        tokens: 5,
      },
    ];

    Redemption.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockRedemptions),
          }),
        }),
      }),
    });

    const result = await getRecentRedemptions("p1", 10);

    expect(result.redemptions).toHaveLength(2);
    expect(result.redemptions[0]._id).toBe("r1");
    expect(result.redemptions[0].cyclistName).toBe("Alice");
    expect(result.redemptions[0].tokens).toBe(10);
    expect(result.redemptions[1].cyclistName).toBe("\u2014");
  });
});

/* ================================================================== */
/*  10. getEarningsSummary                                            */
/* ================================================================== */
describe("getEarningsSummary", () => {
  it("should throw 404 when user is not found", async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    await expect(getEarningsSummary("nonexistent")).rejects.toMatchObject({
      message: "User not found",
      statusCode: 404,
    });
  });

  it("should return balance and payouts on success", async () => {
    // First call: initial check
    // Second call: after syncPartnerAvailableBalance
    const callCount = { n: 0 };
    User.findById.mockImplementation(() => ({
      select: jest.fn().mockImplementation(() => {
        callCount.n++;
        if (callCount.n === 1) {
          return Promise.resolve({ _id: "p1", partnerAvailableBalance: 500 });
        }
        // After sync, return updated balance
        return Promise.resolve({ _id: "p1", partnerAvailableBalance: 300 });
      }),
    }));

    // Mocks for syncPartnerAvailableBalance internals
    Redemption.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ tokens: 50 }]),
      }),
    });
    PayoutRequest.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ amount: 100 }]),
      }),
    });
    Payout.find.mockImplementation((query) => {
      // For syncPartnerAvailableBalance: Payout.find({partnerId, status:"Paid"}).select(...).lean()
      if (query && query.status === "Paid") {
        return {
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([{ totalAmount: 100, adjustmentAmount: 0 }]),
          }),
        };
      }
      // For getEarningsSummary: Payout.find({partnerId}).sort({month:-1}).lean()
      return {
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { _id: "pay1", month: "2025-06", totalTokens: 10, totalAmount: 100, status: "Paid" },
          ]),
        }),
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      };
    });

    User.findByIdAndUpdate.mockResolvedValue({});

    // PayoutRequest.find for getEarningsSummary: .sort({createdAt:-1}).lean()
    // We need to handle both the sync call and the earnings call.
    // Reset and re-mock to handle multiple call patterns:
    PayoutRequest.find.mockImplementation((query) => {
      if (query && query.status === "Paid") {
        return {
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        };
      }
      return {
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      };
    });

    const result = await getEarningsSummary("p1");

    expect(result).toHaveProperty("availableBalance");
    expect(result).toHaveProperty("payouts");
    expect(result).toHaveProperty("payoutRequests");
    expect(Array.isArray(result.payouts)).toBe(true);
  });
});
