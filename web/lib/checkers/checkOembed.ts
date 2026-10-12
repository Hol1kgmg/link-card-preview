import type { OembedFetchResult } from "../fetchers/fetchOembed";
import type { CheckResponse, Issue } from "../types";
import { OEMBED } from "./rules";
import { summarize } from "./summarize";

export function checkOembed(
  endpoint: string | null,
  result: OembedFetchResult | null,
): CheckResponse["oembed"] {
  const issues: Issue[] = [];
  const ng = (code: string, message: string, hint?: string) =>
    issues.push({ level: "ng", code, message, hint });
  const warn = (code: string, message: string, hint?: string) =>
    issues.push({ level: "warn", code, message, hint });

  if (!endpoint || !result) {
    warn(
      "OEMBED_NOT_SUPPORTED",
      "oEmbed の discovery タグがありません（未対応）",
      '<link rel="alternate" type="application/json+oembed" href="..."> を追加',
    );
    return { status: summarize(issues), endpoint: null, data: null, issues };
  }

  let data: Record<string, unknown> | null = null;
  switch (result.kind) {
    case "not_allowed":
      ng(
        "OEMBED_HOST_NOT_ALLOWED",
        "エンドポイントのドメインが許可外です",
        "allowed-hosts.json の assetHosts に追加",
      );
      break;
    case "timeout":
      ng("OEMBED_TIMEOUT", "エンドポイントの取得がタイムアウトしました");
      break;
    case "network":
      ng("OEMBED_FETCH_FAILED", `エンドポイントを取得できません: ${result.message}`);
      break;
    case "http":
      ng(
        "OEMBED_HTTP_ERROR",
        `エンドポイントが ${result.status} を返しました`,
        "200 で JSON を返すようにする",
      );
      break;
    case "invalid_json":
      ng(
        "OEMBED_INVALID_JSON",
        "レスポンスを JSON として解析できません",
        "Content-Type と本文が JSON か確認",
      );
      break;
    case "ok":
      data = result.data;
      checkPayload(data, ng, warn);
      break;
  }
  return { status: summarize(issues), endpoint, data, issues };
}

function checkPayload(
  d: Record<string, unknown>,
  ng: (c: string, m: string, h?: string) => void,
  warn: (c: string, m: string, h?: string) => void,
) {
  if (String(d.version) !== OEMBED.VERSION)
    ng("OEMBED_VERSION", `version が "${OEMBED.VERSION}" ではありません`, 'version: "1.0" を返す');
  const type = typeof d.type === "string" ? d.type : null;
  if (!type) {
    ng("OEMBED_TYPE_MISSING", "type がありません", "photo / video / link / rich のいずれかを返す");
  } else {
    const required = OEMBED.REQUIRED_BY_TYPE[type];
    if (!required) {
      ng(
        "OEMBED_TYPE_INVALID",
        `type "${type}" は不正です`,
        "photo / video / link / rich のいずれかにする",
      );
    } else {
      const missing = required.filter((k) => d[k] == null || d[k] === "");
      if (missing.length)
        ng("OEMBED_REQUIRED_MISSING", `type "${type}" に必須の ${missing.join(", ")} がありません`);
    }
  }
  if (!d.title)
    warn("OEMBED_TITLE_MISSING", "title がありません", "ブログカードの見出しになるため設定推奨");
  if (!d.thumbnail_url)
    warn("OEMBED_THUMBNAIL_MISSING", "thumbnail_url がありません", "サムネイル画像の URL を返す");
}
