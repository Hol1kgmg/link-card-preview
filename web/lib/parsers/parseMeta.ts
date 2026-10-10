import type { ParsedMeta } from "../types";

/** HTMLRewriter で <head> 内の meta / link を収集する。最初に出現した値を優先 */
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

  // ハンドラは本文を消費したときに走るので、変換結果を読み切る
  await rewriter.transform(new Response(html)).text();
  return out;
}
