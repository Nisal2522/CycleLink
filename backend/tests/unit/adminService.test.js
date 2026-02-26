/**
 * Unit tests for src/services/adminService.js
 * ESM + Jest 30 with jest.unstable_mockModule
 */
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

/* ------------------------------------------------------------------ */
/*  Mock all models BEFORE importing the service                      */
/* ------------------------------------------------------------------ */

const User = {
  countDocuments: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
  aggregate: jest.fn(),
  collection: { name: "users" },
};

const Route = {
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
};

const Hazard = {
  countDocuments: jest.fn(),
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
};

const Payment = {
  find: jest.fn(),
};

jest.unstable_mockModule("../../src/models/User.js", () => ({
  default: User,
}));

jest.unstable_mockModule("../../src/models/Route.js", () => ({
  default: Route,
}));

jest.unstable_mockModule("../../src/models/Hazard.js", () => ({
  default: Hazard,
}));

jest.unstable_mockModule("../../src/models/Payment.js", () => ({
  default: Payment,
}));

jest.unstable_mockModule("../../src/constants.js", () => ({
  LIMITS: { ROUTES_ADMIN: 500, ROUTES_PUBLIC: 100, HAZARDS_LIST: 200 },
  MONTH_NAMES: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  USER_GROWTH_PERIODS: { THIS_MONTH: "thismonth", THIS_YEAR: "thisyear" },
  ROLES: ["cyclist", "partner", "admin"],
}));

/* ------------------------------------------------------------------ */
/*  Dynamic import after mocks are in place                           */
/* ------------------------------------------------------------------ */

const {
  getStats,
  getUsers,
  verifyUser,
  blockUser,
  deleteUser,
  approveRoute,
  rejectRoute,
  deleteRoute,
  getAdminHazards,
  resolveAdminHazard,
  deleteAdminHazard,
  getPayments,
} = await import("../../src/services/adminService.js");

/* ------------------------------------------------------------------ */
/*  Reset mocks before each test                                      */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  jest.clearAllMocks();
});

/* ================================================================== */
/*  1. getStats                                                       */
/* ================================================================== */
describe("getStats", () => {
  it("should return aggregated counts", async () => {
    // First three calls via Promise.all: cyclist, partner, Route, Hazard
    // Then one more call for admin
    User.countDocuments
      .mockResolvedValueOnce(100) // cyclists
      .mockResolvedValueOnce(20)  // partners
      .mockResolvedValueOnce(5);  // admins
    Route.countDocuments.mockResolvedValue(50);
    Hazard.countDocuments.mockResolvedValue(30);

    const result = await getStats();

    expect(result.totalUsers).toBe(125); // 100 + 20 + 5
    expect(result.totalCyclists).toBe(100);
    expect(result.totalPartners).toBe(20);
    expect(result.totalRoutes).toBe(50);
    expect(result.totalHazards).toBe(30);
  });
});

/* ================================================================== */
/*  2. getUsers                                                       */
/* ================================================================== */
describe("getUsers", () => {
  it("should return formatted user list with status field", async () => {
    const mockUsers = [
      {
        _id: "u1",
        name: "Alice",
        email: "alice@test.com",
        role: "cyclist",
        shopName: null,
        isVerified: true,
        isBlocked: false,
        partnerTotalRedemptions: 0,
        createdAt: new Date("2025-01-01"),
      },
      {
        _id: "u2",
        name: "Bob Shop",
        email: "bob@test.com",
        role: "partner",
        shopName: "Bob's Bikes",
        isVerified: false,
        isBlocked: false,
        partnerTotalRedemptions: 10,
        createdAt: new Date("2025-02-01"),
      },
      {
        _id: "u3",
        name: "Charlie",
        email: "charlie@test.com",
        role: "cyclist",
        shopName: null,
        isVerified: true,
        isBlocked: true,
        partnerTotalRedemptions: 0,
        createdAt: new Date("2025-03-01"),
      },
    ];

    User.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUsers),
        }),
      }),
    });

    const result = await getUsers();

    expect(result).toHaveLength(3);
    expect(result[0].status).toBe("Active");         // cyclist, not blocked
    expect(result[1].status).toBe("Pending");         // partner, not verified
    expect(result[2].status).toBe("Blocked");         // blocked user
    expect(result[1].shopName).toBe("Bob's Bikes");
    expect(result[0].partnerTotalRedemptions).toBe(0);
  });
});

/* ================================================================== */
/*  3. verifyUser                                                     */
/* ================================================================== */
describe("verifyUser", () => {
  it("should throw 404 when user is not found", async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    await expect(verifyUser("nonexistent")).rejects.toMatchObject({
      message: "User not found",
      statusCode: 404,
    });
  });

  it("should set isVerified to true on success", async () => {
    const mockUser = {
      _id: "u1",
      isVerified: false,
      save: jest.fn().mockResolvedValue(true),
    };
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    const result = await verifyUser("u1");

    expect(mockUser.isVerified).toBe(true);
    expect(mockUser.save).toHaveBeenCalled();
    expect(result.isVerified).toBe(true);
    expect(result.message).toBe("User verified");
  });
});

/* ================================================================== */
/*  4. blockUser                                                      */
/* ================================================================== */
describe("blockUser", () => {
  it("should throw 404 when user is not found", async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    await expect(blockUser("nonexistent", true)).rejects.toMatchObject({
      message: "User not found",
      statusCode: 404,
    });
  });

  it("should throw 403 when trying to block an admin", async () => {
    const mockUser = {
      _id: "admin1",
      role: "admin",
      save: jest.fn(),
    };
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    await expect(blockUser("admin1", true)).rejects.toMatchObject({
      message: "Cannot block an admin",
      statusCode: 403,
    });
  });

  it("should toggle isBlocked to true on success", async () => {
    const mockUser = {
      _id: "u1",
      role: "cyclist",
      isBlocked: false,
      save: jest.fn().mockResolvedValue(true),
    };
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    const result = await blockUser("u1", true);

    expect(mockUser.isBlocked).toBe(true);
    expect(mockUser.save).toHaveBeenCalled();
    expect(result.isBlocked).toBe(true);
    expect(result.message).toBe("User blocked");
  });

  it("should unblock user when block is false", async () => {
    const mockUser = {
      _id: "u1",
      role: "cyclist",
      isBlocked: true,
      save: jest.fn().mockResolvedValue(true),
    };
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    const result = await blockUser("u1", false);

    expect(mockUser.isBlocked).toBe(false);
    expect(result.isBlocked).toBe(false);
    expect(result.message).toBe("User unblocked");
  });
});

/* ================================================================== */
/*  5. deleteUser                                                     */
/* ================================================================== */
describe("deleteUser", () => {
  it("should throw 404 when user is not found", async () => {
    User.findById.mockResolvedValue(null);

    await expect(deleteUser("nonexistent")).rejects.toMatchObject({
      message: "User not found",
      statusCode: 404,
    });
  });

  it("should throw 403 when trying to delete an admin", async () => {
    User.findById.mockResolvedValue({ _id: "admin1", role: "admin" });

    await expect(deleteUser("admin1")).rejects.toMatchObject({
      message: "Cannot delete an admin",
      statusCode: 403,
    });
  });

  it("should delete user on success", async () => {
    User.findById.mockResolvedValue({ _id: "u1", role: "cyclist" });
    User.findByIdAndDelete.mockResolvedValue({ _id: "u1" });

    const result = await deleteUser("u1");

    expect(User.findByIdAndDelete).toHaveBeenCalledWith("u1");
    expect(result.message).toBe("User deleted");
  });
});

/* ================================================================== */
/*  6. approveRoute                                                   */
/* ================================================================== */
describe("approveRoute", () => {
  it("should throw 404 when route is not found", async () => {
    Route.findByIdAndUpdate.mockResolvedValue(null);

    await expect(approveRoute("nonexistent")).rejects.toMatchObject({
      message: "Route not found",
      statusCode: 404,
    });
  });

  it("should set status to approved on success", async () => {
    Route.findByIdAndUpdate.mockResolvedValue({ _id: "rt1", status: "approved" });

    const result = await approveRoute("rt1");

    expect(Route.findByIdAndUpdate).toHaveBeenCalledWith(
      "rt1",
      { status: "approved" },
      { new: true, runValidators: true }
    );
    expect(result.status).toBe("approved");
    expect(result.message).toBe("Route approved");
  });
});

/* ================================================================== */
/*  7. rejectRoute                                                    */
/* ================================================================== */
describe("rejectRoute", () => {
  it("should throw 404 when route is not found", async () => {
    Route.findByIdAndUpdate.mockResolvedValue(null);

    await expect(rejectRoute("nonexistent")).rejects.toMatchObject({
      message: "Route not found",
      statusCode: 404,
    });
  });

  it("should set status to rejected on success", async () => {
    Route.findByIdAndUpdate.mockResolvedValue({ _id: "rt1", status: "rejected" });

    const result = await rejectRoute("rt1");

    expect(Route.findByIdAndUpdate).toHaveBeenCalledWith(
      "rt1",
      { status: "rejected" },
      { new: true, runValidators: true }
    );
    expect(result.status).toBe("rejected");
    expect(result.message).toBe("Route rejected");
  });
});

/* ================================================================== */
/*  8. deleteRoute                                                    */
/* ================================================================== */
describe("deleteRoute", () => {
  it("should throw 404 when route is not found", async () => {
    Route.findByIdAndDelete.mockResolvedValue(null);

    await expect(deleteRoute("nonexistent")).rejects.toMatchObject({
      message: "Route not found",
      statusCode: 404,
    });
  });

  it("should delete route on success", async () => {
    Route.findByIdAndDelete.mockResolvedValue({ _id: "rt1" });

    const result = await deleteRoute("rt1");

    expect(Route.findByIdAndDelete).toHaveBeenCalledWith("rt1");
    expect(result.message).toBe("Route deleted");
  });
});

/* ================================================================== */
/*  9. getAdminHazards                                                */
/* ================================================================== */
describe("getAdminHazards", () => {
  it("should return formatted hazard list", async () => {
    const mockHazards = [
      {
        _id: "h1",
        lat: 6.9271,
        lng: 79.8612,
        type: "pothole",
        description: "Large pothole on road",
        reportedBy: { _id: "u1", name: "Alice", email: "alice@test.com" },
        createdAt: new Date("2025-06-01"),
      },
      {
        _id: "h2",
        lat: 7.2906,
        lng: 80.6337,
        type: null,
        description: null,
        reportedBy: null,
        createdAt: new Date("2025-06-02"),
      },
    ];

    Hazard.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockHazards),
            }),
          }),
        }),
      }),
    });

    const result = await getAdminHazards();

    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("pothole");
    expect(result[0].description).toBe("Large pothole on road");
    expect(result[0].reportedBy.name).toBe("Alice");
    expect(result[1].type).toBe("other");
    expect(result[1].description).toBe("");
    expect(result[1].reportedBy).toBeNull();
  });
});

/* ================================================================== */
/*  10. resolveAdminHazard                                            */
/* ================================================================== */
describe("resolveAdminHazard", () => {
  it("should throw 404 when hazard is not found", async () => {
    Hazard.findByIdAndUpdate.mockResolvedValue(null);

    await expect(resolveAdminHazard("nonexistent")).rejects.toMatchObject({
      message: "Hazard not found",
      statusCode: 404,
    });
  });

  it("should set active to false on success", async () => {
    Hazard.findByIdAndUpdate.mockResolvedValue({ _id: "h1", active: false });

    const result = await resolveAdminHazard("h1");

    expect(Hazard.findByIdAndUpdate).toHaveBeenCalledWith(
      "h1",
      { active: false },
      { new: true, runValidators: true }
    );
    expect(result.active).toBe(false);
    expect(result.message).toBe("Hazard marked as resolved");
  });
});

/* ================================================================== */
/*  11. deleteAdminHazard                                             */
/* ================================================================== */
describe("deleteAdminHazard", () => {
  it("should throw 404 when hazard is not found", async () => {
    Hazard.findByIdAndDelete.mockResolvedValue(null);

    await expect(deleteAdminHazard("nonexistent")).rejects.toMatchObject({
      message: "Hazard not found",
      statusCode: 404,
    });
  });

  it("should delete hazard on success", async () => {
    Hazard.findByIdAndDelete.mockResolvedValue({ _id: "h1" });

    const result = await deleteAdminHazard("h1");

    expect(Hazard.findByIdAndDelete).toHaveBeenCalledWith("h1");
    expect(result.message).toBe("Hazard deleted");
    expect(result._id).toBe("h1");
  });
});

/* ================================================================== */
/*  12. getPayments                                                   */
/* ================================================================== */
describe("getPayments", () => {
  it("should return payment list", async () => {
    const mockPayments = [
      {
        _id: "pay1",
        userId: { name: "Alice", email: "alice@test.com" },
        amount: 500,
        status: "completed",
        createdAt: new Date("2025-06-01"),
      },
      {
        _id: "pay2",
        userId: { name: "Bob", email: "bob@test.com" },
        amount: 1000,
        status: "pending",
        createdAt: new Date("2025-06-02"),
      },
    ];

    Payment.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockPayments),
        }),
      }),
    });

    const result = await getPayments();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0]._id).toBe("pay1");
    expect(result[0].userId.name).toBe("Alice");
    expect(result[1].amount).toBe(1000);
  });

  it("should return empty array when no payments exist", async () => {
    Payment.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }),
    });

    const result = await getPayments();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});
