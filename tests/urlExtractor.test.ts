import { describe, it, expect } from "vitest";
import { extractUrls } from "../src/lib/urlExtractor.js";

describe("extractUrls", () => {
  it("finds URLs in text", () => {
    const urls = extractUrls("Check https://example.com/path?q=1");
    expect(urls).toHaveLength(1);
    expect(urls[0].href).toBe("https://example.com/path?q=1");
  });

  it("finds multiple URLs", () => {
    const urls = extractUrls("https://a.com and https://b.com/x");
    expect(urls).toHaveLength(2);
  });

  it("returns empty for no URLs", () => {
    expect(extractUrls("hello world")).toHaveLength(0);
  });

  it("skips invalid URLs", () => {
    const urls = extractUrls("not a url https://valid.com also-not-url");
    expect(urls).toHaveLength(1);
  });
});
