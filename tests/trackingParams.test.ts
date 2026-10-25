import { describe, it, expect, vi } from "vitest";
import { stripTrackingParams } from "../src/lib/processMessage.js";

vi.mock('../src/config.js', () => ({
  config: { token: 'mock-token' }
}))

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

  it("removes expanded tracking params", () => {
    const url = new URL(
      "https://example.com/?ttclid=1&msclkid=2&mc_cid=3&mc_eid=4&_hsenc=5&_hsmi=6&gbraid=7&wbraid=8&yclid=9&oly_enc_id=a&oly_anon_id=b&mkt_tok=c&rb_clickid=d&vero_id=e&_openstat=f&dclid=g&cjevent=h&spm=i&scm=j&ref_src=k&ref_url=l&twclid=m&bpctr=n&ucat=o&keep=1"
    );
    stripTrackingParams(url);
    expect(url.searchParams.toString()).toBe("keep=1");
  });

  it("strips `s` on x.com", () => {
    const url = new URL("https://x.com/user/status/1?s=20");
    stripTrackingParams(url, "x.com");
    expect(url.searchParams.toString()).toBe("");
  });

  it("removes mibextid (Meta share)", () => {
    const url = new URL("https://www.facebook.com/share/r/1D1EeBCt5W/?mibextid=wwXIfr");
    stripTrackingParams(url);
    expect(url.searchParams.toString()).toBe("");
  });

  it("removes igsi (Instagram share)", () => {
    const url = new URL("https://www.instagram.com/p/abc123/?igsi=x&igsh=y&utm_source=ig");
    stripTrackingParams(url);
    expect(url.searchParams.toString()).toBe("");
  });

  it("removes dlrf and obrf (Instagram share)", () => {
    const url = new URL("https://www.instagram.com/reel/abc123/?dlrf=x&obrf=y&keep=1");
    stripTrackingParams(url);
    expect(url.searchParams.toString()).toBe("keep=1");
  });

  it("keeps `s` on non-X domains (WordPress search)", () => {
    const url = new URL("https://wordpress.example/?s=query");
    stripTrackingParams(url);
    expect(url.searchParams.toString()).toBe("s=query");
  });

  it("keeps functional YouTube params", () => {
    const url = new URL("https://youtube.com/watch?v=abc&list=pl123&t=30&si=xyz");
    stripTrackingParams(url, "youtube.com");
    expect(url.searchParams.toString()).toBe("v=abc&list=pl123&t=30");
  });
});
