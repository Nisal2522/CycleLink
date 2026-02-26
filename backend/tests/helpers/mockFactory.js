/**
 * tests/helpers/mockFactory.js — Factory functions for consistent test data.
 */

let counter = 0;

export function mockObjectId() {
  counter += 1;
  return "6650a" + String(counter).padStart(19, "0");
}

export function createMockUser(overrides = {}) {
  const id = overrides._id || mockObjectId();
  return {
    _id: id,
    name: "Test User",
    email: "test@example.com",
    role: "cyclist",
    shopName: "",
    shopImage: "",
    profileImage: "",
    tokens: 100,
    totalDistance: 50,
    co2Saved: 10.5,
    totalRides: 5,
    safetyScore: 100,
    isVerified: false,
    isBlocked: false,
    partnerTotalRedemptions: 0,
    partnerAvailableBalance: 0,
    bankDetails: {
      bankName: "",
      branchName: "",
      accountNo: "",
      accountHolderName: "",
    },
    createdAt: new Date("2025-01-01"),
    ...overrides,
  };
}

export function createMockRide(overrides = {}) {
  return {
    _id: overrides._id || mockObjectId(),
    cyclistId: overrides.cyclistId || mockObjectId(),
    routeId: null,
    startLocation: "Start Point",
    endLocation: "End Point",
    distance: 5.2,
    durationMinutes: null,
    durationText: "25 min",
    tokensEarned: 52,
    co2Saved: 1.09,
    status: "completed",
    startedAt: new Date("2025-01-01T08:00:00Z"),
    endedAt: new Date("2025-01-01T08:25:00Z"),
    createdAt: new Date("2025-01-01"),
    ...overrides,
  };
}

export function createMockReward(overrides = {}) {
  return {
    _id: overrides._id || mockObjectId(),
    partnerId: overrides.partnerId || mockObjectId(),
    title: "Free Coffee",
    description: "Get a free coffee with 50 tokens",
    tokenCost: 50,
    expiryDate: null,
    active: true,
    createdAt: new Date("2025-01-01"),
    ...overrides,
  };
}

export function createMockHazard(overrides = {}) {
  return {
    _id: overrides._id || mockObjectId(),
    lat: 6.9271,
    lng: 79.8612,
    type: "pothole",
    description: "Large pothole on main road",
    reportedBy: overrides.reportedBy || mockObjectId(),
    active: true,
    status: "reported",
    verifications: [],
    existsCount: 0,
    resolvedCount: 0,
    spamCount: 0,
    createdAt: new Date("2025-01-01"),
    ...overrides,
  };
}

export function createMockRoute(overrides = {}) {
  return {
    _id: overrides._id || mockObjectId(),
    creatorId: overrides.creatorId || mockObjectId(),
    startLocation: "Colombo Fort",
    endLocation: "Galle Face",
    path: [
      { lat: 6.9344, lng: 79.8428 },
      { lat: 6.9271, lng: 79.8612 },
    ],
    distance: "3.5 km",
    duration: "15 min",
    weatherCondition: "Sunny",
    status: "approved",
    ratings: [],
    averageRating: 0,
    ratingCount: 0,
    createdAt: new Date("2025-01-01"),
    ...overrides,
  };
}

export function createMockRedemption(overrides = {}) {
  return {
    _id: overrides._id || mockObjectId(),
    partnerId: overrides.partnerId || mockObjectId(),
    cyclistId: overrides.cyclistId || mockObjectId(),
    tokens: 50,
    transactionId: null,
    itemName: null,
    createdAt: new Date("2025-01-01"),
    ...overrides,
  };
}

export function createMockPayout(overrides = {}) {
  return {
    _id: overrides._id || mockObjectId(),
    partnerId: overrides.partnerId || mockObjectId(),
    month: "2025-01",
    totalTokens: 100,
    totalAmount: 1000,
    status: "Pending",
    transactionId: "",
    adjustmentAmount: 0,
    adjustmentNote: "",
    createdAt: new Date("2025-01-01"),
    ...overrides,
  };
}

export function createMockPayoutRequest(overrides = {}) {
  return {
    _id: overrides._id || mockObjectId(),
    partnerId: overrides.partnerId || mockObjectId(),
    amount: 500,
    status: "Pending",
    transactionId: "",
    rejectionReason: "",
    createdAt: new Date("2025-01-01"),
    ...overrides,
  };
}
