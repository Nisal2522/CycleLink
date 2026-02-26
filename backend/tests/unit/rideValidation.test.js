import { describe, it, expect } from "@jest/globals";
import {
  startRideSchema,
  endRideSchema,
} from "../../src/validatons/rideValidation.js";

describe("startRideSchema", () => {
  it("accepts a valid (empty) body since all fields are optional", () => {
    const { error } = startRideSchema.validate({});
    expect(error).toBeUndefined();
  });

  it("accepts optional routeId", () => {
    const { error } = startRideSchema.validate({ routeId: "abc123" });
    expect(error).toBeUndefined();
  });

  it("accepts optional startLocation", () => {
    const { error } = startRideSchema.validate({
      startLocation: "Colombo Fort",
    });
    expect(error).toBeUndefined();
  });
});

describe("endRideSchema", () => {
  const validEnd = { distance: 12.5 };

  it("accepts valid input", () => {
    const { error } = endRideSchema.validate(validEnd);
    expect(error).toBeUndefined();
  });

  it("requires distance", () => {
    const { error } = endRideSchema.validate({});
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("distance");
  });

  it("fails when distance is negative", () => {
    const { error } = endRideSchema.validate({ distance: -1 });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("distance");
  });

  it("fails when distance exceeds 500", () => {
    const { error } = endRideSchema.validate({ distance: 501 });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("distance");
  });

  it("fails when distance is missing", () => {
    const { error } = endRideSchema.validate({ endLocation: "Galle" });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("distance");
  });
});
