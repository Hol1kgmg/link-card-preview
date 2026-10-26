import { validateUrl } from "../security/validateUrl";

export const USER_AGENT = "CardLinkChecker/1.0";
const TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;

export class UpstreamError extends Error {
  constructor(
    public code: "UPSTREAM_ERROR" | "UPSTREAM_TIMEOUT",
    message: string,
  ) {
    super(message);
  }
}

// redirect: "follow" にしないのは、移動先ごとに IP 直指定や localhost を検査するため（SSRF 対策）
export async function fetchHtml(
  start: URL,
  allowLocalhost: boolean,
  fetchFn: typeof fetch = fetch,
): Promise<{ html: string; finalUrl: string }> {
  let url = start;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    let res: Response;
    try {
      res = await fetchFn(url, {
        redirect: "manual",
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      if (e instanceof Error && e.name === "TimeoutError") {
        throw new UpstreamError("UPSTREAM_TIMEOUT", "対象ページの取得がタイムアウトしました");
      }
      throw new UpstreamError("UPSTREAM_ERROR", `対象ページを取得できませんでした: ${String(e)}`);
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new UpstreamError("UPSTREAM_ERROR", "Location ヘッダのないリダイレクトです");
      const next = new URL(loc, url);
      const v = validateUrl(next.href, allowLocalhost);
      if (!v.ok)
        throw new UpstreamError("UPSTREAM_ERROR", `リダイレクト先を取得できません: ${v.message}`);
      url = v.url;
      continue;
    }
    if (res.status !== 200) {
      throw new UpstreamError("UPSTREAM_ERROR", `対象ページが ${res.status} を返しました`);
    }
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html")) {
      throw new UpstreamError(
        "UPSTREAM_ERROR",
        `HTML ではありません (content-type: ${ct || "なし"})`,
      );
    }
    return { html: await readLimited(res, MAX_HTML_BYTES), finalUrl: url.href };
  }
  throw new UpstreamError("UPSTREAM_ERROR", `リダイレクトが ${MAX_REDIRECTS} 回を超えました`);
}

async function readLimited(res: Response, limit: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let out = "";
  let read = 0;
  while (read < limit) {
    const { done, value } = await reader.read();
    if (done) break;
    read += value.byteLength;
    out += decoder.decode(value, { stream: true });
  }
  await reader.cancel().catch(() => {});
  return out + decoder.decode();
}
