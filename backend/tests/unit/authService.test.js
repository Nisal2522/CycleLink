import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// ── Mock: User model ────────────────────────────────────────────────
const mockUser = {
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
};
jest.unstable_mockModule("../../src/models/User.js", () => ({
  default: mockUser,
}));

// ── Mock: generateToken ─────────────────────────────────────────────
const mockGenerateToken = jest.fn().mockReturnValue("mock-jwt-token");
jest.unstable_mockModule("../../src/utils/generateToken.js", () => ({
  default: mockGenerateToken,
}));

// ── Mock: google-auth-library ───────────────────────────────────────
const mockVerifyIdToken = jest.fn();
jest.unstable_mockModule("google-auth-library", () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

// ── Mock: cloudinary (not exercised directly, but imported by service)
jest.unstable_mockModule("cloudinary", () => ({
  v2: {
    config: jest.fn(),
    uploader: { upload: jest.fn() },
  },
}));

// ── Dynamic import AFTER mocks are registered ───────────────────────
const {
  register,
  login,
  googleLogin,
  getProfile,
  updateProfile,
  getPublicStats,
} = await import("../../src/services/authService.js");

// ── Helpers ─────────────────────────────────────────────────────────
const makeUser = (overrides = {}) => ({
  _id: "user123",
  name: "Test User",
  email: "test@example.com",
  role: "cyclist",
  shopName: "",
  shopImage: "",
  profileImage: "",
  partnerTotalRedemptions: 0,
  isBlocked: false,
  matchPassword: jest.fn().mockResolvedValue(true),
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

// =====================================================================
// register
// =====================================================================
describe("register", () => {
  it("should throw 409 when email already exists", async () => {
    mockUser.findOne.mockResolvedValue(makeUser());

    try {
      await register({ name: "A", email: "test@example.com", password: "pw" });
      expect(true).toBe(false); // should not reach
    } catch (err) {
      expect(err.message).toBe("An account with this email already exists");
      expect(err.statusCode).toBe(409);
    }
  });

  it("should create a user and return user data with token", async () => {
    mockUser.findOne.mockResolvedValue(null);
    const created = makeUser();
    mockUser.create.mockResolvedValue(created);

    const result = await register({
      name: "  Test User  ",
      email: "  TEST@Example.COM  ",
      password: "securePass",
    });

    expect(mockUser.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(mockUser.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Test User",
        email: "test@example.com",
        password: "securePass",
        role: "cyclist",
      })
    );
    expect(result).toMatchObject({
      _id: "user123",
      name: "Test User",
      email: "test@example.com",
      role: "cyclist",
      token: "mock-jwt-token",
    });
    expect(mockGenerateToken).toHaveBeenCalledWith("user123");
  });

  it("should sanitize email (trim and lowercase)", async () => {
    mockUser.findOne.mockResolvedValue(null);
    mockUser.create.mockResolvedValue(makeUser({ email: "hello@world.com" }));

    await register({
      name: "User",
      email: "  HELLO@World.COM  ",
      password: "pw",
    });

    expect(mockUser.findOne).toHaveBeenCalledWith({ email: "hello@world.com" });
    expect(mockUser.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: "hello@world.com" })
    );
  });
});

// =====================================================================
// login
// =====================================================================
describe("login", () => {
  it("should throw 401 when user not found", async () => {
    mockUser.findOne.mockResolvedValue(null);

    try {
      await login("no@user.com", "pw");
      expect(true).toBe(false);
    } catch (err) {
      expect(err.message).toBe("Invalid email or password");
      expect(err.statusCode).toBe(401);
    }
  });

  it("should throw 401 when password does not match", async () => {
    const user = makeUser({ matchPassword: jest.fn().mockResolvedValue(false) });
    mockUser.findOne.mockResolvedValue(user);

    try {
      await login("test@example.com", "wrongpw");
      expect(true).toBe(false);
    } catch (err) {
      expect(err.message).toBe("Invalid email or password");
      expect(err.statusCode).toBe(401);
    }
  });

  it("should throw 403 when user is blocked", async () => {
    const user = makeUser({ isBlocked: true });
    mockUser.findOne.mockResolvedValue(user);

    try {
      await login("test@example.com", "pw");
      expect(true).toBe(false);
    } catch (err) {
      expect(err.message).toBe("Account is blocked. Contact support.");
      expect(err.statusCode).toBe(403);
    }
  });

  it("should return user data with token on success", async () => {
    const user = makeUser();
    mockUser.findOne.mockResolvedValue(user);

    const result = await login("  TEST@Example.COM  ", "pw");

    expect(mockUser.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(user.matchPassword).toHaveBeenCalledWith("pw");
    expect(result).toMatchObject({
      _id: "user123",
      name: "Test User",
      email: "test@example.com",
      role: "cyclist",
      token: "mock-jwt-token",
    });
  });
});

// =====================================================================
// googleLogin
// =====================================================================
describe("googleLogin", () => {
  it("should throw 401 when Google token is invalid", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("bad token"));

    try {
      await googleLogin("bad-credential", "client-id");
      expect(true).toBe(false);
    } catch (err) {
      expect(err.message).toBe("Invalid or expired Google token. Please try again.");
      expect(err.statusCode).toBe(401);
    }
  });

  it("should create a new user when not found", async () => {
    const payload = { email: "new@google.com", name: "Google User" };
    mockVerifyIdToken.mockResolvedValue({ getPayload: () => payload });
    mockUser.findOne.mockResolvedValue(null);
    const created = makeUser({ email: "new@google.com", name: "Google User" });
    mockUser.create.mockResolvedValue(created);

    const result = await googleLogin("valid-cred", "client-id");

    expect(mockUser.findOne).toHaveBeenCalledWith({ email: "new@google.com" });
    expect(mockUser.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Google User",
        email: "new@google.com",
        role: "cyclist",
      })
    );
    expect(result.token).toBe("mock-jwt-token");
  });

  it("should return existing user when found", async () => {
    const payload = { email: "existing@google.com", name: "Existing" };
    mockVerifyIdToken.mockResolvedValue({ getPayload: () => payload });
    const existing = makeUser({ email: "existing@google.com", name: "Existing" });
    mockUser.findOne.mockResolvedValue(existing);

    const result = await googleLogin("valid-cred", "client-id");

    expect(mockUser.create).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      email: "existing@google.com",
      name: "Existing",
      token: "mock-jwt-token",
    });
  });
});

// =====================================================================
// getProfile
// =====================================================================
describe("getProfile", () => {
  it("should throw 404 when user not found", async () => {
    mockUser.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    try {
      await getProfile("nonexistent");
      expect(true).toBe(false);
    } catch (err) {
      expect(err.message).toBe("User not found");
      expect(err.statusCode).toBe(404);
    }
  });

  it("should return profile data on success", async () => {
    const user = makeUser({ createdAt: "2025-01-01T00:00:00Z" });
    mockUser.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(user),
    });

    const result = await getProfile("user123");

    expect(mockUser.findById).toHaveBeenCalledWith("user123");
    expect(result).toMatchObject({
      _id: "user123",
      name: "Test User",
      email: "test@example.com",
      role: "cyclist",
      createdAt: "2025-01-01T00:00:00Z",
    });
  });
});

// =====================================================================
// updateProfile
// =====================================================================
describe("updateProfile", () => {
  it("should throw 404 when user not found", async () => {
    mockUser.findById.mockResolvedValue(null);

    try {
      await updateProfile("nonexistent", { name: "New" });
      expect(true).toBe(false);
    } catch (err) {
      expect(err.message).toBe("User not found");
      expect(err.statusCode).toBe(404);
    }
  });

  it("should trim name, save and return updated profile", async () => {
    const user = makeUser();
    mockUser.findById.mockResolvedValue(user);

    const result = await updateProfile("user123", { name: "  Updated Name  " });

    expect(user.name).toBe("Updated Name");
    expect(user.save).toHaveBeenCalled();
    expect(result).toMatchObject({ _id: "user123", name: "Updated Name" });
  });
});

// =====================================================================
// getPublicStats
// =====================================================================
describe("getPublicStats", () => {
  it("should return totalUsers count", async () => {
    mockUser.countDocuments.mockResolvedValue(42);

    const result = await getPublicStats();

    expect(result).toEqual({ totalUsers: 42 });
    expect(mockUser.countDocuments).toHaveBeenCalled();
  });
});
