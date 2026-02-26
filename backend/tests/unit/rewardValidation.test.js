import { describe, it, expect } from "@jest/globals";
import {
  createRewardSchema,
  updateRewardSchema,
} from "../../src/validatons/rewardValidation.js";

describe("createRewardSchema", () => {
  const validReward = {
    title: "Free Coffee",
    tokenCost: 50,
  };

  it("accepts valid input", () => {
    const { error } = createRewardSchema.validate(validReward);
    expect(error).toBeUndefined();
  });

  it("fails when title is missing", () => {
    const { error } = createRewardSchema.validate({ tokenCost: 50 });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("title");
  });

  it("fails when title exceeds 80 characters", () => {
    const { error } = createRewardSchema.validate({
      ...validReward,
      title: "T".repeat(81),
    });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("title");
  });

  it("fails when tokenCost is less than 1", () => {
    const { error } = createRewardSchema.validate({
      ...validReward,
      tokenCost: 0,
    });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("tokenCost");
  });

  it("fails when tokenCost is not an integer", () => {
    const { error } = createRewardSchema.validate({
      ...validReward,
      tokenCost: 10.5,
    });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("tokenCost");
  });

  it("accepts optional expiryDate", () => {
    const { error } = createRewardSchema.validate({
      ...validReward,
      expiryDate: "2026-12-31",
    });
    expect(error).toBeUndefined();
  });
});

describe("updateRewardSchema", () => {
  it("accepts a valid partial update", () => {
    const { error } = updateRewardSchema.validate({ title: "Updated Title" });
    expect(error).toBeUndefined();
  });

  it("fails when tokenCost is less than 1", () => {
    const { error } = updateRewardSchema.validate({ tokenCost: 0 });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("tokenCost");
  });
});
