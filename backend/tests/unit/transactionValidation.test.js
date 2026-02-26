import { describe, it, expect } from "@jest/globals";
import {
  redeemTokensSchema,
  confirmRedeemSchema,
} from "../../src/validatons/transactionValidation.js";

describe("redeemTokensSchema", () => {
  const validRedeem = {
    cyclistId: "cyclist123",
    tokens: 10,
  };

  it("accepts valid input", () => {
    const { error } = redeemTokensSchema.validate(validRedeem);
    expect(error).toBeUndefined();
  });

  it("fails when cyclistId is missing", () => {
    const { error } = redeemTokensSchema.validate({ tokens: 10 });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("cyclistId");
  });

  it("fails when tokens is less than 1", () => {
    const { error } = redeemTokensSchema.validate({
      ...validRedeem,
      tokens: 0,
    });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("tokens");
  });

  it("fails when tokens is not an integer", () => {
    const { error } = redeemTokensSchema.validate({
      ...validRedeem,
      tokens: 5.5,
    });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("tokens");
  });
});

describe("confirmRedeemSchema", () => {
  const validConfirm = {
    transactionId: "txn456",
    tokenAmount: 25,
    cyclistId: "cyclist123",
  };

  it("accepts valid input", () => {
    const { error } = confirmRedeemSchema.validate(validConfirm);
    expect(error).toBeUndefined();
  });

  it("fails when transactionId is missing", () => {
    const { error } = confirmRedeemSchema.validate({
      tokenAmount: 25,
      cyclistId: "cyclist123",
    });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("transactionId");
  });

  it("fails when tokenAmount is zero or negative", () => {
    const { error } = confirmRedeemSchema.validate({
      ...validConfirm,
      tokenAmount: 0,
    });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("tokenAmount");
  });

  it("fails when cyclistId is missing", () => {
    const { error } = confirmRedeemSchema.validate({
      transactionId: "txn456",
      tokenAmount: 25,
    });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("cyclistId");
  });
});
