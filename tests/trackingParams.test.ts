import { describe, it, expect } from "vitest";
import { isTrackingParam, stripTrackingParams } from "../src/lib/trackingParams.js";

describe("isTrackingParam", () => {
  it("matches exact tracking params", () => {
    expect(isTrackingParam("utm_source")).toBe(true);
    expect(isTrackingParam("fbclid")).toBe(true);
    expect(isTrackingParam("gclid")).toBe(true);
    expect(isTrackingParam("si")).toBe(true);
  });

  it("matches utm_* prefix", () => {
    expect(isTrackingParam("utm_custom")).toBe(true);
    expect(isTrackingParam("utm_whatever")).toBe(true);
  });

  it("rejects non-tracking params", () => {
    expect(isTrackingParam("v")).toBe(false);
    expect(isTrackingParam("id")).toBe(false);
    expect(isTrackingParam("page")).toBe(false);
  });

  it("case insensitive", () => {
    expect(isTrackingParam("UTM_SOURCE")).toBe(true);
    expect(isTrackingParam("Fbclid")).toBe(true);
  });
});

describe("stripTrackingParams", () => {
  it("removes tracking params", () => {
    const url = new URL("https://example.com/?v=1&utm_source=tw&utm_medium=social&id=5");
    stripTrackingParams(url);
    expect(url.searchParams.toString()).toBe("v=1&id=5");
  });

  it("preserves path", () => {
    const url = new URL("https://example.com/path/page?utm_source=fb");
    stripTrackingParams(url);
    expect(url.pathname).toBe("/path/page");
    expect(url.searchParams.toString()).toBe("");
  });

  it("handles no query params", () => {
    const url = new URL("https://example.com/path");
    stripTrackingParams(url);
    expect(url.searchParams.toString()).toBe("");
  });
});
