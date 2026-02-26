import { describe, it, expect, jest } from "@jest/globals";
import Joi from "joi";
import { validate } from "../../src/middleware/validate.js";

const testSchema = Joi.object({
  name: Joi.string().required(),
  age: Joi.number().integer().min(0),
});

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("validate() middleware", () => {
  it("calls next() with no error when body is valid", () => {
    const req = { body: { name: "Alice", age: 25 } };
    const res = mockRes();
    const next = jest.fn();

    validate(testSchema)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 400 with joined error messages for invalid body", () => {
    const req = { body: { age: -5 } };
    const res = mockRes();
    const next = jest.fn();

    validate(testSchema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);

    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(typeof body.message).toBe("string");
    // Should contain error messages for both "name" (required) and "age" (min 0)
    expect(body.message).toContain("name");
    expect(body.message).toContain("age");
  });

  it("replaces req.body with sanitized value (Joi strips unknown fields)", () => {
    const strictSchema = Joi.object({
      name: Joi.string().required(),
    }).options({ stripUnknown: true });

    const req = { body: { name: "Bob", unknownField: "should be stripped" } };
    const res = mockRes();
    const next = jest.fn();

    validate(strictSchema)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ name: "Bob" });
    expect(req.body).not.toHaveProperty("unknownField");
  });
});
