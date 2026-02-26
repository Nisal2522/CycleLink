import { describe, it, expect } from "@jest/globals";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
} from "../../src/validatons/authValidation.js";

describe("registerSchema", () => {
  const validInput = {
    name: "John Doe",
    email: "john@example.com",
    password: "password123",
  };

  it("accepts valid input", () => {
    const { error } = registerSchema.validate(validInput);
    expect(error).toBeUndefined();
  });

  it("fails when name is missing", () => {
    const { error } = registerSchema.validate({
      email: "john@example.com",
      password: "password123",
    });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("name");
  });

  it("fails when name is too short (< 2 chars)", () => {
    const { error } = registerSchema.validate({ ...validInput, name: "J" });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("name");
  });

  it("fails when name is too long (> 50 chars)", () => {
    const { error } = registerSchema.validate({
      ...validInput,
      name: "A".repeat(51),
    });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("name");
  });

  it("fails with an invalid email", () => {
    const { error } = registerSchema.validate({
      ...validInput,
      email: "not-an-email",
    });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("email");
  });

  it("fails when password is too short (< 8 chars)", () => {
    const { error } = registerSchema.validate({
      ...validInput,
      password: "short",
    });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("password");
  });

  it("fails with an invalid role", () => {
    const { error } = registerSchema.validate({
      ...validInput,
      role: "superadmin",
    });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("role");
  });

  it("accepts optional shopName", () => {
    const { error } = registerSchema.validate({
      ...validInput,
      shopName: "My Bike Shop",
    });
    expect(error).toBeUndefined();
  });
});

describe("loginSchema", () => {
  const validLogin = {
    email: "john@example.com",
    password: "password123",
  };

  it("accepts valid credentials", () => {
    const { error } = loginSchema.validate(validLogin);
    expect(error).toBeUndefined();
  });

  it("fails when email is missing", () => {
    const { error } = loginSchema.validate({ password: "password123" });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("email");
  });

  it("fails when password is missing", () => {
    const { error } = loginSchema.validate({ email: "john@example.com" });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("password");
  });
});

describe("updateProfileSchema", () => {
  it("accepts valid update data", () => {
    const { error } = updateProfileSchema.validate({ name: "Jane Doe" });
    expect(error).toBeUndefined();
  });

  it("fails when name is too short (< 2 chars)", () => {
    const { error } = updateProfileSchema.validate({ name: "J" });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("name");
  });

  it("allows empty profileImage string", () => {
    const { error } = updateProfileSchema.validate({ profileImage: "" });
    expect(error).toBeUndefined();
  });
});
