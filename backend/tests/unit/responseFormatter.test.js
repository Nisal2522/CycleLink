import { describe, it, expect, jest } from "@jest/globals";
import { success, paginated, error } from "../../src/utils/responseFormatter.js";

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("success()", () => {
  it("defaults to status 200", () => {
    const res = mockRes();
    success(res, { id: 1 });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("accepts a custom status code", () => {
    const res = mockRes();
    success(res, { id: 1 }, "Created", 201);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("includes data and message in the response body", () => {
    const res = mockRes();
    success(res, { name: "Test" }, "All good");
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: "Test" },
        message: "All good",
      })
    );
  });

  it("sets success to true", () => {
    const res = mockRes();
    success(res, null, "OK");
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });
});

describe("paginated()", () => {
  it("calculates pagination correctly (total=25, page=2, limit=10)", () => {
    const res = mockRes();
    const items = Array.from({ length: 10 }, (_, i) => ({ id: i }));
    paginated(res, items, 25, 2, 10);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: items,
        pagination: {
          total: 25,
          page: 2,
          limit: 10,
          totalPages: 3,
        },
      })
    );
  });

  it("includes the data array in the response", () => {
    const res = mockRes();
    const items = [{ id: 1 }, { id: 2 }];
    paginated(res, items, 2, 1, 10);

    const body = res.json.mock.calls[0][0];
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(2);
  });
});

describe("error()", () => {
  it("sets the status code and error message", () => {
    const res = mockRes();
    error(res, "Not found", 404);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Not found" })
    );
  });

  it("sets success to false", () => {
    const res = mockRes();
    error(res, "Server error", 500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });
});
