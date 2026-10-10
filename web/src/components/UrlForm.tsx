import { useState } from "react";

const ALLOWED_HOSTS = (import.meta.env.VITE_ALLOWED_HOSTS as string | undefined)
  ?.split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

export function UrlForm({
  onSubmit,
  loading,
}: {
  onSubmit: (url: string) => void;
  loading: boolean;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    let url: URL;
    try {
      url = new URL(value.trim());
    } catch {
      setError("URLの形式が不正です");
      return;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      setError("http / https のみ対応しています");
      return;
    }
    // VITE_ALLOWED_HOSTS が設定されていれば送信前にドメインを弾く。最終判定はサーバ側
    if (ALLOWED_HOSTS?.length && !ALLOWED_HOSTS.includes(url.hostname.toLowerCase())) {
      setError(`許可されていないドメインです: ${url.hostname}`);
      return;
    }
    setError(null);
    onSubmit(url.href);
  }

  return (
    <form className="url-form" onSubmit={submit}>
      <input
        type="url"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="https://example.com/post/1"
        required
        disabled={loading}
        aria-label="チェックするURL"
      />
      <button type="submit" disabled={loading}>
        {loading ? "チェック中…" : "チェック"}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
