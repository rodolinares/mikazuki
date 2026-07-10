import { describe, it, expect } from "vitest";
import { rewriteDomain, EMBED_REWRITES } from "../src/lib/embedRewrites.js";

describe("rewriteDomain", () => {
  it("rewrites known domains", () => {
    const url = new URL("https://instagram.com/p/123");
    expect(rewriteDomain(url)).toBe(true);
    expect(url.hostname).toBe("ddinstagram.com");
    expect(url.pathname).toBe("/p/123");
  });

  it("preserves query params", () => {
    const url = new URL("https://x.com/user/status/123?si=abc");
    rewriteDomain(url);
    expect(url.hostname).toBe("fixupx.com");
    expect(url.searchParams.get("si")).toBe("abc");
  });

  it("returns false for unknown domains", () => {
    const url = new URL("https://example.com");
    expect(rewriteDomain(url)).toBe(false);
  });

  it("handles www prefix", () => {
    const url = new URL("https://www.instagram.com/stories/user");
    rewriteDomain(url);
    expect(url.hostname).toBe("ddinstagram.com");
  });

  it("all rewrite targets are valid hostnames", () => {
    for (const [from, to] of Object.entries(EMBED_REWRITES)) {
      expect(to).toMatch(/^[a-z0-9.-]+$/);
      expect(from).toMatch(/^[a-z0-9.-]+$/);
    }
  });
});
