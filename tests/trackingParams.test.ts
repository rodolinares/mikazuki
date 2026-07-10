import { describe, it, expect } from "vitest";
import { stripTrackingParams } from "../src/lib/trackingParams.js";

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
