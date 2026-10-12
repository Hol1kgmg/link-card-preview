// 各サービスの仕様変更で値が変わるため、判定ロジックに埋め込まずここに集約する。

// 出典: https://developers.facebook.com/docs/sharing/webmasters/images/
export const OGP = {
  MIN_WIDTH: 600,
  ASPECT: 1.91,
  // 許容幅は公式に数値がないため経験値。厳しくすると正方形気味の画像が全部警告になる
  ASPECT_TOLERANCE: 0.3,
} as const;

// 出典: https://developer.x.com/en/docs/x-for-websites/cards/overview/markup
export const TWITTER = {
  VALID_CARDS: ["summary", "summary_large_image", "app", "player"] as const,
  LARGE_ASPECT: 2,
  LARGE_ASPECT_TOLERANCE: 0.3,
  MAX_IMAGE_BYTES: 5 * 1024 * 1024,
} as const;

// 出典: https://oembed.com/#section2.3
export const OEMBED = {
  VERSION: "1.0",
  REQUIRED_BY_TYPE: {
    rich: ["html", "width", "height"],
    video: ["html", "width", "height"],
    photo: ["url", "width", "height"],
    link: [],
  } as Record<string, string[]>,
} as const;
