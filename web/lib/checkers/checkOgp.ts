import type { CheckResponse, ImageInfo, Issue } from "../types";
import { OGP } from "./rules";
import { summarize } from "./summarize";

export function checkOgp(
  tags: Record<string, string>,
  image: ImageInfo | undefined,
  finalUrl: string,
): CheckResponse["ogp"] {
  const issues: Issue[] = [];
  const ng = (code: string, message: string, hint?: string) =>
    issues.push({ level: "ng", code, message, hint });
  const warn = (code: string, message: string, hint?: string) =>
    issues.push({ level: "warn", code, message, hint });

  if (!tags["og:title"])
    ng(
      "OG_TITLE_MISSING",
      "og:title がありません",
      '<meta property="og:title" content="..."> を追加',
    );

  const img = tags["og:image"];
  if (!img) {
    ng(
      "OG_IMAGE_MISSING",
      "og:image がありません",
      '<meta property="og:image" content="https://..."> を追加',
    );
  } else if (!/^https?:\/\//i.test(img)) {
    ng("OG_IMAGE_RELATIVE", "og:image が相対パスです", "https:// から始まる絶対URLにする");
  } else {
    if (img.startsWith("http://"))
      warn("OG_IMAGE_HTTP", "og:image が http:// です", "https:// に変更する");
    if (image && !image.reachable)
      ng(
        "OG_IMAGE_UNREACHABLE",
        "og:image を取得できません",
        "URLが正しいか、公開されているか確認",
      );
    if (image?.width != null && image.height != null) {
      if (image.width < OGP.MIN_WIDTH) {
        warn(
          "OG_IMAGE_SMALL",
          `画像の幅が ${image.width}px です（推奨 ${OGP.MIN_WIDTH}px 以上）`,
          "1200×630px 程度の画像を用意",
        );
      }
      const ratio = image.width / image.height;
      if (Math.abs(ratio - OGP.ASPECT) > OGP.ASPECT_TOLERANCE) {
        warn(
          "OG_IMAGE_ASPECT",
          `画像の比率が ${ratio.toFixed(2)}:1 です（推奨 ${OGP.ASPECT}:1）`,
          "1200×630px など 1.91:1 に近い比率にする",
        );
      }
    }
  }

  if (!tags["og:description"])
    warn(
      "OG_DESCRIPTION_MISSING",
      "og:description がありません",
      "ページの要約を 100 文字程度で追加",
    );

  const ogUrl = tags["og:url"];
  if (!ogUrl) {
    warn("OG_URL_MISSING", "og:url がありません", "正規URLを og:url に設定");
  } else if (normalize(ogUrl) !== normalize(finalUrl)) {
    warn(
      "OG_URL_MISMATCH",
      `og:url (${ogUrl}) が実際のURL (${finalUrl}) と一致しません`,
      "リダイレクト後の正規URLに合わせる",
    );
  }
  if (!tags["og:type"])
    warn("OG_TYPE_MISSING", "og:type がありません", '"website" や "article" を設定');
  if (!tags["og:site_name"])
    warn("OG_SITE_NAME_MISSING", "og:site_name がありません", "サイト名を設定");

  return { status: summarize(issues), tags, image, issues };
}

function normalize(u: string): string {
  try {
    const url = new URL(u);
    url.hash = "";
    return url.href.replace(/\/$/, "");
  } catch {
    return u;
  }
}
