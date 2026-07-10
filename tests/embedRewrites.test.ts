import { describe, it, expect } from "vitest";
import { rewriteDomain, EMBED_REWRITE_CHAINS } from "../src/lib/embedRewrites.js";

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
    expect(url.hostname).toBe("fxtwitter.com");
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

  it("all rewrite chains are valid", () => {
    for (const [from, chain] of Object.entries(EMBED_REWRITE_CHAINS)) {
      expect(from).toMatch(/^[a-z0-9.-]+$/);
      for (const to of chain) {
        expect(to).toMatch(/^[a-z0-9.-]+$/);
      }
    }
  });
});
