import type { ParsedMeta } from "../types";

export async function parseMeta(html: string, baseUrl: string): Promise<ParsedMeta> {
  const out: ParsedMeta = { og: {}, twitter: {}, oembedEndpoint: null };

  const rewriter = new HTMLRewriter()
    .on("meta", {
      element(el) {
        const key = (el.getAttribute("property") ?? el.getAttribute("name"))?.trim().toLowerCase();
        const content = el.getAttribute("content");
        if (!key || content == null) return;
        if (key.startsWith("og:")) out.og[key] ??= content.trim();
        else if (key.startsWith("twitter:")) out.twitter[key] ??= content.trim();
      },
    })
    .on("link", {
      element(el) {
        if (out.oembedEndpoint) return;
        const type = el.getAttribute("type")?.trim().toLowerCase();
        const href = el.getAttribute("href");
        if (type === "application/json+oembed" && href) {
          try {
            out.oembedEndpoint = new URL(href, baseUrl).href;
          } catch {
            out.oembedEndpoint = href;
          }
        }
      },
    });

  // 戻り値は不要だが、本文を消費しないとハンドラが呼ばれない
  await rewriter.transform(new Response(html)).text();
  return out;
}
