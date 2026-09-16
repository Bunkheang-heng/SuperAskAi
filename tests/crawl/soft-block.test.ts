/**
 * The 200-that-is-not-content detector (lib/crawl/soft-block.ts).
 *
 * vitest.config.ts excludes lib/crawl/** from coverage on the grounds that a
 * unit test of the crawler would assert the shape of a mock. That reasoning
 * holds for the fetch/orchestration layer and does not hold here: this module
 * is a pure function over a response body, and the bodies below are the actual
 * ones observed on www.service.gov.kh and services.misti.gov.kh in September
 * 2026. Getting a false positive wrong silently drops a ministry's content;
 * getting a false negative wrong puts a rejection page into the review queue
 * every week. Both are worth pinning.
 */

import { describe, it, expect } from "vitest";
import {
  detectSoftBlock,
  looksLikeRobotsTxt,
  isThin,
  MIN_REAL_TEXT,
} from "@/lib/crawl/soft-block";

/** Verbatim from https://www.service.gov.kh/, HTTP 200, 266 bytes. */
const F5_REJECTION =
  '<html><head><title>Request Rejected</title></head><body>The requested URL was ' +
  "rejected. Please consult with your administrator.<br/><br/>Your support ID is: " +
  '5ed2ef73-2e57-4994-96e3-ffdaa4975899<br/><br/><a href="javascript:history.back()">' +
  "[Go Back]</a></body></html>";

describe("detectSoftBlock — WAF interstitials", () => {
  it("recognises the F5 rejection page served with HTTP 200", () => {
    const hit = detectSoftBlock(F5_REJECTION, "text/html; charset=UTF-8");
    expect(hit?.kind).toBe("waf");
    expect(hit?.detail).toMatch(/F5 BIG-IP/);
  });

  it("recognises the same page whatever support ID it carries", () => {
    // The whole point: the support ID changes on every fetch, which is what
    // would otherwise raise a fresh "modified" signal every single run.
    const second = F5_REJECTION.replace(
      "5ed2ef73-2e57-4994-96e3-ffdaa4975899",
      "0000ffff-1111-2222-3333-444455556666",
    );
    expect(detectSoftBlock(second, "text/html")?.kind).toBe("waf");
    expect(second).not.toEqual(F5_REJECTION);
  });

  it.each([
    ["Cloudflare", "<title>Attention Required! | Cloudflare</title>"],
    ["Incapsula", "<html><body>Incapsula incident ID: 123-456</body></html>"],
    ["Sucuri", "<h1>Sucuri WebSite Firewall - Access Denied</h1>"],
  ])("recognises a %s block page", (_vendor, body) => {
    expect(detectSoftBlock(body, "text/html")?.kind).toBe("waf");
  });

  it("does not fire on a long ministry page that merely uses the word denied", () => {
    const paragraph =
      "<p>Applications may be denied where the applicant does not meet the conditions " +
      "set out in Prakas No. 123. An applicant whose request was denied may appeal " +
      "within 30 days.</p>";
    const page = `<html><body>${paragraph.repeat(60)}</body></html>`;
    expect(page.length).toBeGreaterThan(4096);
    expect(detectSoftBlock(page, "text/html")).toBeNull();
  });

  it("returns null for an ordinary page and for an empty body", () => {
    expect(detectSoftBlock("<html><body><h1>ក្រសួងមហាផ្ទៃ</h1></body></html>", "text/html")).toBeNull();
    expect(detectSoftBlock("", "text/html")).toBeNull();
  });
});

describe("detectSoftBlock — JSON failure envelopes", () => {
  /** Verbatim from services-api.misti.gov.kh/api/v1, HTTP 200. */
  const API_FAIL =
    '{"status":"fail","statusCode":400,"messageCode":403,"message":"Access Not Permitted.","error":""}';

  it("recognises a failure envelope returned with HTTP 200", () => {
    const hit = detectSoftBlock(API_FAIL, "application/json; charset=utf-8");
    expect(hit?.kind).toBe("api-error");
    expect(hit?.detail).toMatch(/Access Not Permitted/);
  });

  it("ignores a failure envelope that still carries data", () => {
    const partial = '{"status":"fail","message":"partial","data":[{"id":1}]}';
    expect(detectSoftBlock(partial, "application/json")).toBeNull();
  });

  it("ignores a healthy response whose payload happens to have a status field", () => {
    const ok = '{"status":"published","data":{"fee":"20000 KHR"}}';
    expect(detectSoftBlock(ok, "application/json")).toBeNull();
  });

  it("only inspects JSON when the content type says so", () => {
    expect(detectSoftBlock(API_FAIL, "text/html")).toBeNull();
  });

  it("survives a body that claims to be JSON and is not", () => {
    expect(detectSoftBlock("<html>not json</html>", "application/json")).toBeNull();
  });
});

describe("looksLikeRobotsTxt", () => {
  it("accepts a real robots.txt", () => {
    expect(looksLikeRobotsTxt("User-agent: *\nDisallow: /admin\nCrawl-delay: 5")).toBe(true);
  });

  it("accepts a sitemap-only robots.txt", () => {
    expect(looksLikeRobotsTxt("Sitemap: https://moi.gov.kh/sitemap.xml")).toBe(true);
  });

  it("rejects the SPA shell a catch-all host serves for /robots.txt", () => {
    // services.misti.gov.kh answers /robots.txt with its Vue shell, HTTP 200.
    expect(looksLikeRobotsTxt('<!DOCTYPE html><html><body><div id=app></div></body></html>')).toBe(false);
  });

  it("rejects a WAF page and a JSON body", () => {
    expect(looksLikeRobotsTxt(F5_REJECTION)).toBe(false);
    expect(looksLikeRobotsTxt('{"error":"nope"}')).toBe(false);
  });

  it("rejects an empty or directive-free body", () => {
    expect(looksLikeRobotsTxt("")).toBe(false);
    expect(looksLikeRobotsTxt("   \n\n ")).toBe(false);
    expect(looksLikeRobotsTxt("# nothing to declare here")).toBe(false);
  });
});

describe("isThin", () => {
  it("holds one threshold for the probe and the crawler", () => {
    expect(isThin("x".repeat(MIN_REAL_TEXT - 1))).toBe(true);
    expect(isThin("x".repeat(MIN_REAL_TEXT))).toBe(false);
  });
});
