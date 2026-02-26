process.env.JWT_SECRET = "test-secret-key-for-jwt";

import { describe, it, expect } from "@jest/globals";
import generateToken from "../../src/utils/generateToken.js";
import jwt from "jsonwebtoken";

describe("generateToken()", () => {
  const userId = "user_abc123";

  it("returns a string", () => {
    const token = generateToken(userId);
    expect(typeof token).toBe("string");
  });

  it("decodes to contain the user id", () => {
    const token = generateToken(userId);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.id).toBe(userId);
  });

  it("has an expiration claim (exp)", () => {
    const token = generateToken(userId);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded).toHaveProperty("exp");
    expect(typeof decoded.exp).toBe("number");
  });
});
