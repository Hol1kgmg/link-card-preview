import { describe, expect, it } from "vitest";
import { checkOembed } from "../../lib/checkers/checkOembed";
import { checkOgp } from "../../lib/checkers/checkOgp";
import { checkTwitter } from "../../lib/checkers/checkTwitter";
import { summarize } from "../../lib/checkers/summarize";
import { parseMeta } from "../../lib/parsers/parseMeta";
import { validateUrl, withLocalhost } from "../../lib/security/validateUrl";
import full from "../fixtures/full.html?raw";

const codes = (r: { issues: { code: string }[] }) => r.issues.map((i) => i.code);
const FINAL = "https://example.com/post/1";
const goodImage = {
  url: "https://cdn.example.com/og.png",
  reachable: true,
  width: 1200,
  height: 630,
  bytes: 100_000,
};

describe("summarize", () => {
  it("ng > warn > ok", () => {
    expect(summarize([])).toBe("ok");
    expect(summarize([{ level: "warn", code: "A", message: "" }])).toBe("warn");
    expect(
      summarize([
        { level: "warn", code: "A", message: "" },
        { level: "ng", code: "B", message: "" },
      ]),
    ).toBe("ng");
  });
});

describe("parseMeta (HTMLRewriter)", () => {
  it("collects og/twitter/oembed and resolves relative endpoint", async () => {
    const m = await parseMeta(full, FINAL);
    expect(m.og["og:title"]).toBe("Full Title");
    expect(m.twitter["twitter:card"]).toBe("summary_large_image");
    expect(m.oembedEndpoint).toBe(
      "https://example.com/oembed?url=https%3A%2F%2Fexample.com%2Fpost%2F1",
    );
  });
});

describe("checkOgp", () => {
  it("full page is ok", async () => {
    const m = await parseMeta(full, FINAL);
    const r = checkOgp(m.og, goodImage, FINAL);
    expect(r.status).toBe("ok");
  });
  it("missing title/image → ng, relative image → ng, small/odd image → warn", () => {
    expect(codes(checkOgp({}, undefined, FINAL))).toEqual(
      expect.arrayContaining(["OG_TITLE_MISSING", "OG_IMAGE_MISSING"]),
    );
    expect(codes(checkOgp({ "og:title": "t", "og:image": "/a.png" }, undefined, FINAL))).toContain(
      "OG_IMAGE_RELATIVE",
    );
    const r = checkOgp(
      { "og:title": "t", "og:image": "http://cdn.example.com/a.png" },
      { url: "", reachable: true, width: 400, height: 400 },
      FINAL,
    );
    expect(codes(r)).toEqual(
      expect.arrayContaining(["OG_IMAGE_HTTP", "OG_IMAGE_SMALL", "OG_IMAGE_ASPECT"]),
    );
    expect(r.status).toBe("warn");
  });
  it("og:url mismatch → warn", () => {
    const r = checkOgp(
      { "og:title": "t", "og:image": "https://x/a.png", "og:url": "https://example.com/other" },
      goodImage,
      FINAL,
    );
    expect(codes(r)).toContain("OG_URL_MISMATCH");
  });
});

describe("checkTwitter", () => {
  it("falls back to og:* without issues", () => {
    const r = checkTwitter(
      { "twitter:card": "summary" },
      { "og:title": "T", "og:image": "https://x/a.png" },
      goodImage,
    );
    expect(r.status).toBe("ok");
    expect(r.fallbacks).toEqual(["twitter:title", "twitter:image"]);
  });
  it("missing card → warn as summary; invalid card → ng", () => {
    const a = checkTwitter({}, { "og:title": "T" }, undefined);
    expect(a.cardType).toBe("summary");
    expect(codes(a)).toContain("TW_CARD_MISSING");
    expect(
      codes(checkTwitter({ "twitter:card": "huge" }, { "og:title": "T" }, undefined)),
    ).toContain("TW_CARD_INVALID");
  });
  it("large card without image → ng; >5MB → ng; 1:1 → aspect warn", () => {
    expect(
      codes(
        checkTwitter({ "twitter:card": "summary_large_image" }, { "og:title": "T" }, undefined),
      ),
    ).toContain("TW_IMAGE_MISSING");
    const big = checkTwitter(
      { "twitter:card": "summary_large_image", "twitter:image": "https://x/a.png" },
      { "og:title": "T" },
      { url: "", reachable: true, width: 600, height: 600, bytes: 6 * 1024 * 1024 },
    );
    expect(codes(big)).toEqual(expect.arrayContaining(["TW_IMAGE_TOO_LARGE", "TW_IMAGE_ASPECT"]));
    expect(big.status).toBe("ng");
  });
  it("no title anywhere → ng", () => {
    expect(codes(checkTwitter({ "twitter:card": "summary" }, {}, undefined))).toContain(
      "TW_TITLE_MISSING",
    );
  });
});

describe("checkOembed", () => {
  const ep = "https://example.com/oembed";
  it("no discovery → warn only", () => {
    const r = checkOembed(null, null);
    expect(r.status).toBe("warn");
    expect(codes(r)).toEqual(["OEMBED_NOT_SUPPORTED"]);
  });
  it("http error / invalid json → ng", () => {
    expect(codes(checkOembed(ep, { kind: "http", status: 404 }))).toContain("OEMBED_HTTP_ERROR");
    expect(codes(checkOembed(ep, { kind: "invalid_json" }))).toContain("OEMBED_INVALID_JSON");
  });
  it("validates version/type/required fields", () => {
    expect(
      codes(
        checkOembed(ep, {
          kind: "ok",
          data: { version: "2.0", type: "rich", html: "<b/>", width: 1, height: 1 },
        }),
      ),
    ).toContain("OEMBED_VERSION");
    expect(codes(checkOembed(ep, { kind: "ok", data: { version: "1.0" } }))).toContain(
      "OEMBED_TYPE_MISSING",
    );
    expect(
      codes(checkOembed(ep, { kind: "ok", data: { version: "1.0", type: "photo", url: "u" } })),
    ).toContain("OEMBED_REQUIRED_MISSING");
    const ok = checkOembed(ep, {
      kind: "ok",
      data: {
        version: "1.0",
        type: "rich",
        html: "<b/>",
        width: 1,
        height: 1,
        title: "t",
        thumbnail_url: "u",
      },
    });
    expect(ok.status).toBe("ok");
    const warn = checkOembed(ep, { kind: "ok", data: { version: "1.0", type: "link" } });
    expect(warn.status).toBe("warn");
    expect(codes(warn)).toEqual(["OEMBED_TITLE_MISSING", "OEMBED_THUMBNAIL_MISSING"]);
  });
});

describe("validateUrl", () => {
  const allowed = new Set(["example.com"]);
  it("rejects bad input, ip, localhost, foreign host", () => {
    expect(validateUrl("not a url", allowed)).toMatchObject({ ok: false, code: "INVALID_URL" });
    expect(validateUrl("ftp://example.com", allowed)).toMatchObject({
      ok: false,
      code: "INVALID_URL",
    });
    expect(validateUrl("http://127.0.0.1/", allowed)).toMatchObject({
      ok: false,
      code: "INVALID_URL",
    });
    expect(validateUrl("http://[::1]/", allowed)).toMatchObject({ ok: false, code: "INVALID_URL" });
    expect(validateUrl("http://localhost/", allowed)).toMatchObject({
      ok: false,
      code: "INVALID_URL",
    });
    expect(
      validateUrl("http://localhost:3000/", withLocalhost(allowed, "localhost")),
    ).toMatchObject({ ok: true });
    expect(validateUrl("http://127.0.0.1/", withLocalhost(allowed, "localhost"))).toMatchObject({
      ok: false,
    });
    expect(withLocalhost(allowed, "example.com").has("localhost")).toBe(false);
    expect(validateUrl("https://evil.com/", allowed)).toMatchObject({
      ok: false,
      code: "DOMAIN_NOT_ALLOWED",
    });
    expect(validateUrl("https://EXAMPLE.com/x", allowed)).toMatchObject({ ok: true });
    expect(validateUrl("https://blog.example.com/x", allowed)).toMatchObject({ ok: true });
    expect(validateUrl("https://notexample.com/x", allowed)).toMatchObject({
      ok: false,
      code: "DOMAIN_NOT_ALLOWED",
    });
  });
});
