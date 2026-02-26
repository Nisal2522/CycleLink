import { describe, it, expect } from "@jest/globals";
import {
  rejectPayoutRequestSchema,
  updatePayoutAdjustmentSchema,
} from "../../src/validatons/payoutValidation.js";

describe("rejectPayoutRequestSchema", () => {
  it("accepts a valid rejection reason", () => {
    const { error } = rejectPayoutRequestSchema.validate({
      rejectionReason: "Insufficient documentation provided",
    });
    expect(error).toBeUndefined();
  });

  it("fails when rejectionReason is an empty string", () => {
    const { error } = rejectPayoutRequestSchema.validate({
      rejectionReason: "",
    });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("rejectionReason");
  });

  it("fails when rejectionReason exceeds 500 characters", () => {
    const { error } = rejectPayoutRequestSchema.validate({
      rejectionReason: "R".repeat(501),
    });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("rejectionReason");
  });

  it("fails when rejectionReason is missing", () => {
    const { error } = rejectPayoutRequestSchema.validate({});
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("rejectionReason");
  });
});

describe("updatePayoutAdjustmentSchema", () => {
  it("accepts a valid adjustment", () => {
    const { error } = updatePayoutAdjustmentSchema.validate({
      adjustmentAmount: 150,
      adjustmentNote: "Processing fee deduction",
    });
    expect(error).toBeUndefined();
  });

  it("requires adjustmentAmount", () => {
    const { error } = updatePayoutAdjustmentSchema.validate({
      adjustmentNote: "Some note",
    });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("adjustmentAmount");
  });

  it("accepts optional adjustmentNote", () => {
    const { error } = updatePayoutAdjustmentSchema.validate({
      adjustmentAmount: -50,
    });
    expect(error).toBeUndefined();
  });

  it("fails when adjustmentAmount is not a number", () => {
    const { error } = updatePayoutAdjustmentSchema.validate({
      adjustmentAmount: "not-a-number",
    });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("adjustmentAmount");
  });
});
