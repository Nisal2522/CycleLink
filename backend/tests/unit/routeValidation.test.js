import { describe, it, expect } from "@jest/globals";
import {
  createRouteSchema,
  updateRouteSchema,
  rateRouteSchema,
} from "../../src/validatons/routeValidation.js";

describe("createRouteSchema", () => {
  const validRoute = {
    startLocation: "Colombo Fort",
    endLocation: "Galle Face",
    path: [
      { lat: 6.9271, lng: 79.8612 },
      { lat: 6.9344, lng: 79.8428 },
    ],
    distance: "5.2 km",
  };

  it("accepts valid input", () => {
    const { error } = createRouteSchema.validate(validRoute);
    expect(error).toBeUndefined();
  });

  it("fails when path has fewer than 2 points", () => {
    const { error } = createRouteSchema.validate({
      ...validRoute,
      path: [{ lat: 6.9271, lng: 79.8612 }],
    });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("path");
  });

  it("fails when startLocation is missing", () => {
    const { startLocation, ...rest } = validRoute;
    const { error } = createRouteSchema.validate(rest);
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("startLocation");
  });

  it("fails when distance is missing", () => {
    const { distance, ...rest } = validRoute;
    const { error } = createRouteSchema.validate(rest);
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("distance");
  });
});

describe("updateRouteSchema", () => {
  it("accepts a valid partial update", () => {
    const { error } = updateRouteSchema.validate({
      startLocation: "New Start",
    });
    expect(error).toBeUndefined();
  });

  it("fails when body is empty (.min(1))", () => {
    const { error } = updateRouteSchema.validate({});
    expect(error).toBeDefined();
  });
});

describe("rateRouteSchema", () => {
  it("accepts a valid rating", () => {
    const { error } = rateRouteSchema.validate({ rating: 4 });
    expect(error).toBeUndefined();
  });

  it("fails when rating is less than 1", () => {
    const { error } = rateRouteSchema.validate({ rating: 0 });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("rating");
  });

  it("fails when rating is greater than 5", () => {
    const { error } = rateRouteSchema.validate({ rating: 6 });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("rating");
  });

  it("fails when rating is not an integer", () => {
    const { error } = rateRouteSchema.validate({ rating: 3.5 });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("rating");
  });

  it("fails when comment exceeds 500 characters", () => {
    const { error } = rateRouteSchema.validate({
      rating: 5,
      comment: "C".repeat(501),
    });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("comment");
  });
});
