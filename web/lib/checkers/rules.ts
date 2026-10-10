// 判定基準の定数。各サービスの仕様変更で変わるため、ここに集約する。
// 実装時に公式ドキュメントで確認すること。

export const OGP = {
  /** 推奨最小幅 (px)。これ未満は警告 */
  MIN_WIDTH: 600,
  /** 推奨比率 1.91:1 */
  ASPECT: 1.91,
  /** 比率のずれの許容幅（比率の絶対差） */
  ASPECT_TOLERANCE: 0.3,
} as const;

export const TWITTER = {
  VALID_CARDS: ["summary", "summary_large_image", "app", "player"] as const,
  /** summary_large_image の推奨比率 2:1 */
  LARGE_ASPECT: 2,
  LARGE_ASPECT_TOLERANCE: 0.3,
  /** 画像の容量上限 (bytes) */
  MAX_IMAGE_BYTES: 5 * 1024 * 1024,
} as const;

export const OEMBED = {
  VERSION: "1.0",
  REQUIRED_BY_TYPE: {
    rich: ["html", "width", "height"],
    video: ["html", "width", "height"],
    photo: ["url", "width", "height"],
    link: [],
  } as Record<string, string[]>,
} as const;
