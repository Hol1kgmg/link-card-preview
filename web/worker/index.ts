import { checkOembed } from "../lib/checkers/checkOembed";
import { checkOgp } from "../lib/checkers/checkOgp";
import { checkTwitter, resolveTwitter } from "../lib/checkers/checkTwitter";
import { fetchHtml, UpstreamError } from "../lib/fetchers/fetchHtml";
import { fetchImage } from "../lib/fetchers/fetchImage";
import { fetchOembed } from "../lib/fetchers/fetchOembed";
import { parseMeta } from "../lib/parsers/parseMeta";
import { parseHosts, validateUrl } from "../lib/security/validateUrl";
import type { CheckResponse, ErrorResponse } from "../lib/types";

export interface Env {
  ALLOWED_HOSTS: string;
  ALLOWED_ASSET_HOSTS: string;
  ASSETS?: Fetcher;
}

const STATUS_BY_CODE: Record<string, number> = {
  INVALID_URL: 400,
  DOMAIN_NOT_ALLOWED: 403,
  UPSTREAM_ERROR: 502,
  UPSTREAM_TIMEOUT: 504,
};

function error(code: string, message: string): Response {
  const body: ErrorResponse = { error: { code, message } };
  return Response.json(body, { status: STATUS_BY_CODE[code] ?? 500 });
}

export async function handleCheck(req: Request, env: Env): Promise<Response> {
  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return error("INVALID_URL", "リクエスト本文が JSON ではありません");
  }
  const raw =
    typeof input === "object" && input !== null ? (input as { url?: unknown }).url : undefined;
  if (typeof raw !== "string") return error("INVALID_URL", "url が指定されていません");

  const pageHosts = parseHosts(env.ALLOWED_HOSTS);
  const assetHosts = new Set([...pageHosts, ...parseHosts(env.ALLOWED_ASSET_HOSTS)]);

  const v = validateUrl(raw, pageHosts);
  if (!v.ok) return error(v.code, v.message);

  let html: string;
  let finalUrl: string;
  try {
    ({ html, finalUrl } = await fetchHtml(v.url, pageHosts));
  } catch (e) {
    if (e instanceof UpstreamError) return error(e.code, e.message);
    throw e;
  }

  const meta = await parseMeta(html, finalUrl);
  const tw = resolveTwitter(meta.twitter, meta.og);
  const ogImageUrl = meta.og["og:image"];
  const twImageUrl = tw.image;

  // 画像と oEmbed は並列。画像URLが同じなら1回で済ます
  const [ogImage, twImage, oembedResult] = await Promise.all([
    ogImageUrl && /^https?:\/\//i.test(ogImageUrl) ? fetchImage(ogImageUrl, assetHosts) : undefined,
    twImageUrl && twImageUrl !== ogImageUrl && /^https?:\/\//i.test(twImageUrl)
      ? fetchImage(twImageUrl, assetHosts)
      : undefined,
    meta.oembedEndpoint ? fetchOembed(meta.oembedEndpoint, assetHosts) : null,
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
      return handleCheck(req, env);
    }
    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
