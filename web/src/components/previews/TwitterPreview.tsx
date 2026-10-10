import type { CheckResponse } from "../../../lib/types";
import { hostOf } from "./OgpPreview";

export function TwitterPreview({
  twitter,
  og,
  finalUrl,
}: {
  twitter: CheckResponse["twitter"];
  og: Record<string, string>;
  finalUrl: string;
}) {
  const t = twitter.tags;
  const title = t["twitter:title"] ?? og["og:title"] ?? "（タイトルなし）";
  const desc = t["twitter:description"] ?? og["og:description"] ?? "";
  const image = t["twitter:image"] ?? og["og:image"];
  const large = twitter.cardType === "summary_large_image";

  return (
    <div className={`card card-twitter ${large ? "card-large" : "card-summary"}`}>
      {image ? (
        <img src={image} alt="" className={large ? "card-image-wide" : "card-image-square"} />
      ) : (
        <div className={`${large ? "card-image-wide" : "card-image-square"} card-noimage`}>
          画像なし
        </div>
      )}
      <div className="card-body">
        <div className="card-domain">{hostOf(finalUrl)}</div>
        <div className="card-title">{title}</div>
        <div className="card-desc">{desc}</div>
      </div>
    </div>
  );
}
