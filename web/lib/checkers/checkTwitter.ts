import type { CheckResponse, ImageInfo, Issue } from "../types";
import { TWITTER } from "./rules";
import { summarize } from "./summarize";

/** twitter:* → og:* のフォールバック対応表 */
const FALLBACK: Record<string, string> = {
  "twitter:title": "og:title",
  "twitter:description": "og:description",
  "twitter:image": "og:image",
};

/** Xカードが実際に使う値を解決する（twitter:* 優先、無ければ og:*） */
export function resolveTwitter(twitter: Record<string, string>, og: Record<string, string>) {
  const fallbacks: string[] = [];
  const get = (key: string): string | undefined => {
    if (twitter[key]) return twitter[key];
    const alt = FALLBACK[key];
    if (alt && og[alt]) {
      fallbacks.push(key);
      return og[alt];
    }
    return undefined;
  };
  const title = get("twitter:title");
  const description = get("twitter:description");
  const image = get("twitter:image");
  return { title, description, image, fallbacks, cardType: twitter["twitter:card"] ?? "" };
}

export function checkTwitter(
  twitter: Record<string, string>,
  og: Record<string, string>,
  image: ImageInfo | undefined,
): CheckResponse["twitter"] {
  const issues: Issue[] = [];
  const ng = (code: string, message: string, hint?: string) =>
    issues.push({ level: "ng", code, message, hint });
  const warn = (code: string, message: string, hint?: string) =>
    issues.push({ level: "warn", code, message, hint });

  const r = resolveTwitter(twitter, og);
  let cardType = r.cardType;
  if (!cardType) {
    warn(
      "TW_CARD_MISSING",
      "twitter:card がありません（summary として扱われます）",
      '<meta name="twitter:card" content="summary_large_image"> を追加',
    );
    cardType = "summary";
  } else if (!(TWITTER.VALID_CARDS as readonly string[]).includes(cardType)) {
    ng(
      "TW_CARD_INVALID",
      `twitter:card の値 "${cardType}" は不正です`,
      `${TWITTER.VALID_CARDS.join(" / ")} のいずれかにする`,
    );
  }

  if (!r.title)
    ng(
      "TW_TITLE_MISSING",
      "twitter:title と og:title のどちらもありません",
      "og:title を追加すれば代用されます",
    );

  const isLarge = cardType === "summary_large_image";
  if (isLarge && (!r.image || (image && !image.reachable))) {
    ng(
      "TW_IMAGE_MISSING",
      "summary_large_image なのに画像がない、または取得できません",
      "twitter:image か og:image に到達可能な画像URLを設定",
    );
  }
  if (image?.reachable) {
    if (isLarge && image.width != null && image.height != null) {
      const ratio = image.width / image.height;
      if (Math.abs(ratio - TWITTER.LARGE_ASPECT) > TWITTER.LARGE_ASPECT_TOLERANCE) {
        warn(
          "TW_IMAGE_ASPECT",
          `画像の比率が ${ratio.toFixed(2)}:1 です（推奨 ${TWITTER.LARGE_ASPECT}:1）`,
          "1200×600px など 2:1 に近い比率にする",
        );
      }
    }
    if (image.bytes != null && image.bytes > TWITTER.MAX_IMAGE_BYTES) {
      ng(
        "TW_IMAGE_TOO_LARGE",
        `画像の容量が ${(image.bytes / 1024 / 1024).toFixed(1)}MB です（上限 5MB）`,
        "画像を圧縮する",
      );
    }
  }

  return {
    status: summarize(issues),
    cardType,
    tags: twitter,
    fallbacks: r.fallbacks,
    image,
    issues,
  };
}
