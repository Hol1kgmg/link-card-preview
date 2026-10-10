export function OembedPreview({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return <p className="card-noimage">oEmbed のデータがありません</p>;
  const str = (k: string) => (typeof data[k] === "string" ? (data[k] as string) : undefined);
  const thumb = str("thumbnail_url");
  return (
    <div className="card card-oembed">
      {thumb ? (
        <img src={thumb} alt="" className="card-image-square" />
      ) : (
        <div className="card-image-square card-noimage">画像なし</div>
      )}
      <div className="card-body">
        <div className="card-title">{str("title") ?? "（タイトルなし）"}</div>
        <div className="card-domain">
          {[str("author_name"), str("provider_name")].filter(Boolean).join(" · ")}
        </div>
      </div>
    </div>
  );
}
