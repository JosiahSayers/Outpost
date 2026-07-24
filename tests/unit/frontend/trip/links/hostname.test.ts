import { hostnameOf } from "$/frontend/trip/links/hostname";
import { describe, expect, it } from "bun:test";

describe("hostnameOf", () => {
  it("returns the hostname of a url", () => {
    expect(hostnameOf("https://example.com/trail/guide")).toBe("example.com");
  });

  it("strips a leading www.", () => {
    expect(hostnameOf("https://www.nps.gov/mora")).toBe("nps.gov");
  });

  it("only strips a leading www., not one appearing elsewhere in the host", () => {
    expect(hostnameOf("https://wwwexample.com")).toBe("wwwexample.com");
  });

  it("returns the original string when the url can't be parsed", () => {
    expect(hostnameOf("not a url")).toBe("not a url");
  });
});
