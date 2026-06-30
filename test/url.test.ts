import { describe, expect, it } from "vitest";
import { joinUrl, normalizeBaseUrl } from "../src/lib/url.js";

describe("normalizeBaseUrl", () => {
  it("collapses all documented inputs to the /v3 root", () => {
    const expected = "https://public-api.textmine.com/v3";
    for (const input of [
      "https://public-api.textmine.com",
      "https://public-api.textmine.com/",
      "https://public-api.textmine.com/v3",
      "https://public-api.textmine.com/v3/",
    ]) {
      expect(normalizeBaseUrl(input)).toBe(expected);
    }
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeBaseUrl("  https://public-api.textmine.com  ")).toBe(
      "https://public-api.textmine.com/v3",
    );
  });

  it("preserves custom hosts, ports, and path prefixes", () => {
    expect(normalizeBaseUrl("http://localhost:8085")).toBe(
      "http://localhost:8085/v3",
    );
    expect(normalizeBaseUrl("https://staging-public-api.textmine.com/")).toBe(
      "https://staging-public-api.textmine.com/v3",
    );
  });

  it("only strips a single trailing version segment", () => {
    // one trailing /v3 is the version segment and is re-appended unchanged
    expect(normalizeBaseUrl("https://x.test/v3/v3")).toBe("https://x.test/v3/v3");
    expect(normalizeBaseUrl("https://x.test/api/v3")).toBe("https://x.test/api/v3");
    expect(normalizeBaseUrl("https://x.test/api")).toBe("https://x.test/api/v3");
  });

  it("strips query and hash", () => {
    expect(normalizeBaseUrl("https://x.test/v3?foo=1#bar")).toBe(
      "https://x.test/v3",
    );
  });

  it("rejects empty, non-URL, and non-http(s) inputs", () => {
    expect(() => normalizeBaseUrl("")).toThrow();
    expect(() => normalizeBaseUrl("not a url")).toThrow();
    expect(() => normalizeBaseUrl("ftp://x.test")).toThrow();
  });
});

describe("joinUrl", () => {
  it("joins paths with or without a leading slash", () => {
    const base = "https://public-api.textmine.com/v3";
    expect(joinUrl(base, "/vaults")).toBe(`${base}/vaults`);
    expect(joinUrl(base, "vaults")).toBe(`${base}/vaults`);
  });
});
