import { OGP, TWITTER } from "./checkers/rules";
import type { CheckResponse, Issue } from "./types";

const TAG_KEYS = [
  "og:image",
  "og:title",
  "og:description",
  "og:url",
  "og:type",
  "twitter:card",
  "twitter:image",
];

export function buildOgImagePrompt(r: CheckResponse): string {
  const issues: Issue[] = [...r.ogp.issues, ...r.twitter.issues];
  const tags: Record<string, string> = { ...r.ogp.tags, ...r.twitter.tags };
  const current = TAG_KEYS.filter((k) => tags[k]).map((k) => `- ${k}: ${tags[k]}`);

  return [
    "次のページで、用意済みの画像を og:image としてリンクカードに表示させたい。",
    `対象URL: ${r.finalUrl}`,
    "",
    "満たすべき要件:",
    "- og:image は https の絶対URLで、認証なしで公開取得できること",
    `- 画像は幅 ${OGP.MIN_WIDTH}px 以上、アスペクト比 ${OGP.ASPECT}:1（推奨 1200×630）`,
    `- X 用に twitter:card="summary_large_image" を指定し、画像は比率 ${TWITTER.LARGE_ASPECT}:1、${TWITTER.MAX_IMAGE_BYTES / 1024 / 1024}MB 以下`,
    "- og:image:width / og:image:height / og:image:alt を併記する",
    "- og:title / og:description / og:url / og:type を揃える",
    "- 画像URLを差し替えた場合は SNS 側のキャッシュ更新が必要",
    "",
    "現在の検出結果:",
    ...(issues.length
      ? issues.map(
          (i) =>
            `- [${i.level === "ng" ? "NG" : "警告"}] ${i.message}${i.hint ? ` → ${i.hint}` : ""}`,
        )
      : ["- 問題なし"]),
    "",
    "現在のタグ:",
    ...(current.length ? current : ["- なし"]),
    "",
    "上記を満たす <head> 内の meta タグと、このプロジェクトのフレームワークでの設定方法を示してください。",
  ].join("\n");
}
