import { afterEach, describe, expect, it, vi } from "vitest";
import type { CheckResponse, ErrorResponse } from "../lib/types";
import { handleCheck, type HostConfig } from "../worker";
import full from "./fixtures/full.html?raw";

// テストは allowed-hosts.json の実ドメインに依存しないよう許可リストを固定する
const cfg: HostConfig = { hosts: ["example.com"], assetHosts: [] };

const PNG_1x1 = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
);

// vitest-pool-workers 0.22 で fetchMock が廃止されたため、グローバル fetch を直接差し替える
function mockFetch(routes: Record<string, () => Response>) {
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const url = input instanceof Request ? input.url : String(input);
    calls.push(url);
    const hit = Object.entries(routes).find(([k]) => url.startsWith(k));
    if (!hit) throw new Error(`unexpected fetch: ${url}`);
    return hit[1]();
  });
  return calls;
}
afterEach(() => vi.unstubAllGlobals());

const post = (url: unknown) =>
  handleCheck(
    new Request("https://app.local/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }),
    cfg,
  );

const html = (body: string) =>
  new Response(body, { headers: { "content-type": "text/html; charset=utf-8" } });

describe("POST /api/check", () => {
  it("rejects invalid / disallowed urls before any fetch", async () => {
    const calls = mockFetch({});
    expect((await post("nope")).status).toBe(400);
    const r = await post("https://evil.com/");
    expect(r.status).toBe(403);
    expect(((await r.json()) as ErrorResponse).error.code).toBe("DOMAIN_NOT_ALLOWED");
    expect(calls).toEqual([]);
  });

  it("follows redirect within allowed hosts and checks all three cards", async () => {
    const calls = mockFetch({
      "https://example.com/old": () =>
        new Response(null, { status: 301, headers: { location: "/post/1" } }),
      "https://example.com/post/1": () => html(full),
      "https://example.com/oembed": () =>
        Response.json({ version: "1.0", type: "link", title: "T" }),
      "https://cdn.example.com/og.png": () => new Response(null, { status: 404 }),
    });
    const res = await post("https://example.com/old");
    expect(res.status).toBe(200);
    const body = (await res.json()) as CheckResponse;
    expect(body.finalUrl).toBe("https://example.com/post/1");
    expect(body.ogp.tags["og:title"]).toBe("Full Title");
    expect(body.twitter.cardType).toBe("summary_large_image");
    expect(body.twitter.fallbacks).toContain("twitter:image");
    expect(body.oembed.status).toBe("warn");
    expect(body.oembed.issues.map((i) => i.code)).toEqual(["OEMBED_THUMBNAIL_MISSING"]);
    expect(calls).toContain("https://cdn.example.com/og.png");
    expect(body.ogp.issues.map((i) => i.code)).toContain("OG_IMAGE_UNREACHABLE");
  });

  it("blocks redirect to a disallowed host", async () => {
    mockFetch({
      "https://example.com/r": () =>
        new Response(null, { status: 302, headers: { location: "https://evil.com/" } }),
    });
    const r = await post("https://example.com/r");
    expect(r.status).toBe(403);
  });

  it("returns 502 for non-html upstream", async () => {
    mockFetch({ "https://example.com/json": () => Response.json({}) });
    expect((await post("https://example.com/json")).status).toBe(502);
  });

  it("reads image size from allowed host", async () => {
    mockFetch({
      "https://example.com/p": () =>
        html(
          `<html><head><meta property="og:title" content="t"><meta property="og:image" content="https://example.com/i.png"></head></html>`,
        ),
      "https://example.com/i.png": () =>
        new Response(PNG_1x1, {
          headers: { "content-type": "image/png", "content-length": String(PNG_1x1.byteLength) },
        }),
    });
    const body = (await (await post("https://example.com/p")).json()) as CheckResponse;
    expect(body.ogp.image).toMatchObject({
      reachable: true,
      width: 1,
      height: 1,
      bytes: PNG_1x1.byteLength,
    });
    expect(body.ogp.issues.map((i) => i.code)).toContain("OG_IMAGE_SMALL");
  });
});
