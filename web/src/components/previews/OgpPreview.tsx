export function OgpPreview({ tags, finalUrl }: { tags: Record<string, string>; finalUrl: string }) {
  const image = tags["og:image"];
  return (
    <div className="card card-ogp">
      {image ? (
        <img src={image} alt="" className="card-image-wide" />
      ) : (
        <div className="card-image-wide card-noimage">画像なし</div>
      )}
      <div className="card-body">
        <div className="card-domain">{hostOf(tags["og:url"] ?? finalUrl)}</div>
        <div className="card-title">{tags["og:title"] ?? "（タイトルなし）"}</div>
        <div className="card-desc">{tags["og:description"] ?? ""}</div>
      </div>
    </div>
  );
}

export function hostOf(u: string): string {
  try {
    return new URL(u).hostname;
  } catch {
    return u;
  }
}
