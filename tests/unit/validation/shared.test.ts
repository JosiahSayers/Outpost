import {
  arrayQueryParam,
  booleanQueryParam,
  numberQueryParam,
} from "$/validation/shared";
import { describe, expect, it } from "bun:test";
import express from "express";
import validate from "express-zod-safe";
import request from "supertest";
import z from "zod";

describe("numberQueryParam", () => {
  const testValidator = numberQueryParam(3);

  it("returns the default when passed undefined", () => {
    expect(testValidator.parse(undefined)).toBe(3);
  });

  it("returns the default when passed an empty string", () => {
    expect(testValidator.parse("")).toBe(3);
  });

  it("returns the default when passed a string with only whitespace", () => {
    expect(testValidator.parse("   ")).toBe(3);
  });

  it("returns a number when passed a string containing a number", () => {
    expect(testValidator.parse("41")).toBe(41);
  });

  describe("with min/max bounds", () => {
    const boundedValidator = numberQueryParam(3, { min: 1, max: 10 });

    it("returns the value when within bounds", () => {
      expect(boundedValidator.parse("5")).toBe(5);
    });

    it("returns the default when passed undefined", () => {
      expect(boundedValidator.parse(undefined)).toBe(3);
    });

    it("throws when passed a value below the minimum", () => {
      expect(() => boundedValidator.parse("0")).toThrow();
    });

    it("throws when passed a value above the maximum", () => {
      expect(() => boundedValidator.parse("11")).toThrow();
    });

    it("accepts values on the boundary", () => {
      expect(boundedValidator.parse("1")).toBe(1);
      expect(boundedValidator.parse("10")).toBe(10);
    });
  });

  it("treats a min of 0 as a real bound", () => {
    const validator = numberQueryParam(3, { min: 0 });
    expect(() => validator.parse("-1")).toThrow();
    expect(validator.parse("0")).toBe(0);
  });
});

describe("booleanQueryParam", () => {
  const testValidator = booleanQueryParam();

  it("returns undefined when passed undefined", () => {
    expect(testValidator.parse(undefined)).toBeUndefined();
  });

  it("returns true for the string 'true'", () => {
    expect(testValidator.parse("true")).toBe(true);
  });

  it("returns false for the string 'false'", () => {
    expect(testValidator.parse("false")).toBe(false);
  });

  it("passes through actual booleans", () => {
    expect(testValidator.parse(true)).toBe(true);
    expect(testValidator.parse(false)).toBe(false);
  });

  it("throws for other strings, including truthy-looking ones", () => {
    expect(() => testValidator.parse("yes")).toThrow();
    expect(() => testValidator.parse("1")).toThrow();
    expect(() => testValidator.parse("")).toThrow();
  });
});

describe("arrayQueryParam", () => {
  const testValidator = arrayQueryParam(z.enum(["a", "b", "c"]), ["a", "b"]);

  it("returns the default when passed undefined", () => {
    expect(testValidator.parse(undefined)).toEqual(["a", "b"]);
  });

  it("wraps a single string value in an array", () => {
    expect(testValidator.parse("c")).toEqual(["c"]);
  });

  it("passes an array value through unchanged", () => {
    expect(testValidator.parse(["a", "c"])).toEqual(["a", "c"]);
  });

  it("throws when a value doesn't match the element schema", () => {
    expect(() => testValidator.parse("z")).toThrow();
    expect(() => testValidator.parse(["a", "z"])).toThrow();
  });

  it("throws on an empty string, since it isn't a valid enum member", () => {
    expect(() => testValidator.parse("")).toThrow();
  });

  // The preprocessor above only normalizes shape (string vs array); whether a
  // repeated query key actually arrives as an array, rather than the last
  // value winning or some other shape, is Express's own parsing behavior.
  // This confirms that assumption against a real Express request instead of
  // a hand-built object, so a future Express/query-parser change here would
  // surface as a test failure rather than a silent behavior change in prod.
  describe("against real Express query parsing", () => {
    const app = express();
    app.get(
      "/",
      validate({ query: z.strictObject({ status: testValidator }) }),
      (req, res) => {
        res.json({ status: req.query.status });
      },
    );

    it("parses a single repeated-key occurrence as a one-element array", async () => {
      const response = await request(app).get("/").query("status=c");
      expect(response.body).toEqual({ status: ["c"] });
    });

    it("parses multiple occurrences of the same key as an array", async () => {
      const response = await request(app)
        .get("/")
        .query("status=a&status=c");
      expect(response.body).toEqual({ status: ["a", "c"] });
    });

    it("falls back to the default when the key is omitted", async () => {
      const response = await request(app).get("/");
      expect(response.body).toEqual({ status: ["a", "b"] });
    });

    it("rejects an unknown status value with a 400", async () => {
      await request(app).get("/").query("status=z").expect(400);
    });
  });
});
