import { describe, it, expect } from "vitest";
import { EMBED_REWRITE_CHAINS } from "../src/lib/embedRewrites.js";

describe("EMBED_REWRITE_CHAINS", () => {
  it("all rewrite chains are valid", () => {
    for (const [from, chain] of Object.entries(EMBED_REWRITE_CHAINS)) {
      expect(from).toMatch(/^[a-z0-9.-]+$/);
      for (const to of chain) {
        expect(to).toMatch(/^[a-z0-9.-]+$/);
      }
    }
  });
});
