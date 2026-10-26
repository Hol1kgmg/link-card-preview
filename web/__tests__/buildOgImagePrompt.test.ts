import { describe, expect, it } from "vitest";
import { buildOgImagePrompt } from "../lib/buildOgImagePrompt";
import type { CheckResponse } from "../lib/types";

const base: CheckResponse = {
  requestedUrl: "https://example.com/",
  finalUrl: "https://example.com/post/1",
  fetchedAt: "2026-01-01T00:00:00.000Z",
  ogp: { status: "ok", tags: { "og:title": "Title" }, issues: [] },
  twitter: { status: "ok", cardType: "summary", tags: {}, fallbacks: [], issues: [] },
  oembed: { status: "ok", endpoint: null, data: null, issues: [] },
};

describe("buildOgImagePrompt", () => {
  it("対象URL・rules.ts 由来の数値・現在のタグを含む", () => {
    const p = buildOgImagePrompt(base);
    expect(p).toContain("対象URL: https://example.com/post/1");
    expect(p).toContain("幅 600px 以上、アスペクト比 1.91:1");
    expect(p).toContain("比率 2:1、5MB 以下");
    expect(p).toContain("- og:title: Title");
    expect(p).toContain("- 問題なし");
  });

  it("OGP とXカードの issues をレベル付きで列挙する", () => {
    const p = buildOgImagePrompt({
      ...base,
      ogp: {
        ...base.ogp,
        issues: [{ level: "ng", code: "A", message: "画像なし", hint: "追加する" }],
      },
      twitter: { ...base.twitter, issues: [{ level: "warn", code: "B", message: "比率違い" }] },
    });
    expect(p).toContain("- [NG] 画像なし → 追加する");
    expect(p).toContain("- [警告] 比率違い");
    expect(p).not.toContain("問題なし");
  });
});
