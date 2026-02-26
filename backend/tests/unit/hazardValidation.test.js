import { describe, it, expect } from "@jest/globals";
import {
  reportHazardSchema,
  updateHazardSchema,
  verifyHazardSchema,
} from "../../src/validatons/hazardValidation.js";

describe("reportHazardSchema", () => {
  const validHazard = {
    lat: 6.9271,
    lng: 79.8612,
    type: "pothole",
    description: "Large pothole on main road",
  };

  it("accepts valid input", () => {
    const { error } = reportHazardSchema.validate(validHazard);
    expect(error).toBeUndefined();
  });

  it("fails when lat < -90", () => {
    const { error } = reportHazardSchema.validate({ ...validHazard, lat: -91 });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("lat");
  });

  it("fails when lat > 90", () => {
    const { error } = reportHazardSchema.validate({ ...validHazard, lat: 91 });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("lat");
  });

  it("fails when lng < -180", () => {
    const { error } = reportHazardSchema.validate({ ...validHazard, lng: -181 });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("lng");
  });

  it("fails when lng > 180", () => {
    const { error } = reportHazardSchema.validate({ ...validHazard, lng: 181 });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("lng");
  });

  it("fails with an invalid hazard type", () => {
    const { error } = reportHazardSchema.validate({
      ...validHazard,
      type: "earthquake",
    });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("type");
  });

  it("fails when description exceeds 200 characters", () => {
    const { error } = reportHazardSchema.validate({
      ...validHazard,
      description: "X".repeat(201),
    });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("description");
  });
});

describe("updateHazardSchema", () => {
  it("accepts valid partial update", () => {
    const { error } = updateHazardSchema.validate({ type: "construction" });
    expect(error).toBeUndefined();
  });

  it("fails when body is empty (.min(1))", () => {
    const { error } = updateHazardSchema.validate({});
    expect(error).toBeDefined();
  });

  it("fails with an invalid hazard type", () => {
    const { error } = updateHazardSchema.validate({ type: "tornado" });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("type");
  });
});

describe("verifyHazardSchema", () => {
  it('accepts "exists" status', () => {
    const { error } = verifyHazardSchema.validate({ status: "exists" });
    expect(error).toBeUndefined();
  });

  it('accepts "resolved" status', () => {
    const { error } = verifyHazardSchema.validate({ status: "resolved" });
    expect(error).toBeUndefined();
  });

  it('accepts "spam" status', () => {
    const { error } = verifyHazardSchema.validate({ status: "spam" });
    expect(error).toBeUndefined();
  });

  it("fails with an invalid status", () => {
    const { error } = verifyHazardSchema.validate({ status: "unknown" });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("status");
  });

  it("fails when status is missing", () => {
    const { error } = verifyHazardSchema.validate({});
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("status");
  });
});
