import { checkOembed } from "../lib/checkers/checkOembed";
import { checkOgp } from "../lib/checkers/checkOgp";
import { checkTwitter, resolveTwitter } from "../lib/checkers/checkTwitter";
import { fetchHtml, UpstreamError } from "../lib/fetchers/fetchHtml";
import { fetchImage } from "../lib/fetchers/fetchImage";
import { fetchOembed } from "../lib/fetchers/fetchOembed";
import { parseMeta } from "../lib/parsers/parseMeta";
import { isLocalhost, validateUrl } from "../lib/security/validateUrl";
import type { CheckResponse, ErrorResponse } from "../lib/types";

const STATUS_BY_CODE: Record<string, number> = {
  INVALID_URL: 400,
  UPSTREAM_ERROR: 502,
  UPSTREAM_TIMEOUT: 504,
};

function error(code: string, message: string): Response {
  const body: ErrorResponse = { error: { code, message } };
  return Response.json(body, { status: STATUS_BY_CODE[code] ?? 500 });
}

type Env = { ASSETS: Fetcher };

// Worker が自分の Custom Domain を fetch すると Cloudflare がオリジン直行扱いにして 522 になる
export function selfAwareFetch(req: Request, env: Env): typeof fetch {
  const self = new URL(req.url).host;
  return (input, init) => {
    const host = new URL(input instanceof Request ? input.url : String(input)).host;
    return host === self ? env.ASSETS.fetch(input, init) : fetch(input, init);
  };
}

export async function handleCheck(req: Request, fetchFn: typeof fetch = fetch): Promise<Response> {
  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return error("INVALID_URL", "リクエスト本文が JSON ではありません");
  }
  const raw =
    typeof input === "object" && input !== null ? (input as { url?: unknown }).url : undefined;
  if (typeof raw !== "string") return error("INVALID_URL", "url が指定されていません");

  const allowLocalhost = isLocalhost(new URL(req.url).hostname);
  const v = validateUrl(raw, allowLocalhost);
  if (!v.ok) return error(v.code, v.message);

  let html: string;
  let finalUrl: string;
  try {
    ({ html, finalUrl } = await fetchHtml(v.url, allowLocalhost, fetchFn));
  } catch (e) {
    if (e instanceof UpstreamError) return error(e.code, e.message);
    throw e;
  }

  const meta = await parseMeta(html, finalUrl);
  const tw = resolveTwitter(meta.twitter, meta.og);
  const ogImageUrl = meta.og["og:image"];
  const twImageUrl = tw.image;

  const [ogImage, twImage, oembedResult] = await Promise.all([
    ogImageUrl && /^https?:\/\//i.test(ogImageUrl)
      ? fetchImage(ogImageUrl, allowLocalhost, fetchFn)
      : undefined,
    twImageUrl && twImageUrl !== ogImageUrl && /^https?:\/\//i.test(twImageUrl)
      ? fetchImage(twImageUrl, allowLocalhost, fetchFn)
      : undefined,
    meta.oembedEndpoint ? fetchOembed(meta.oembedEndpoint, allowLocalhost, fetchFn) : null,
  ]);

  const body: CheckResponse = {
    requestedUrl: raw,
    finalUrl,
    fetchedAt: new Date().toISOString(),
    ogp: checkOgp(meta.og, ogImage, finalUrl),
    twitter: checkTwitter(
      meta.twitter,
      meta.og,
      twImage ?? (twImageUrl === ogImageUrl ? ogImage : undefined),
    ),
    oembed: checkOembed(meta.oembedEndpoint, oembedResult),
  };
  return Response.json(body);
}

export default {
  async fetch(req, env) {
    const { pathname } = new URL(req.url);
    if (pathname === "/api/check") {
      if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
      return handleCheck(req, selfAwareFetch(req, env));
    }
    // Access のログインは /api/* を開いたときにしか出ないため、ログイン用の入口をここに置く
    if (pathname === "/api/login") return Response.redirect(new URL("/", req.url), 302);
    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
