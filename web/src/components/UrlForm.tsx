import { useState } from "react";
import allowedHosts from "../../allowed-hosts.json";
import { isAllowedHost } from "../../lib/security/validateUrl";

const ALLOWED_HOSTS = new Set(allowedHosts.hosts.map((h) => h.toLowerCase()));

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
    run(value);
  }

  async function fromClipboard() {
    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      setError("クリップボードを読み取れません（ブラウザの許可が必要です）");
      return;
    }
    setValue(text.trim());
    run(text);
  }

  function run(raw: string) {
    let url: URL;
    try {
      url = new URL(raw.trim());
    } catch {
      setError("URLの形式が不正です");
      return;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      setError("http / https のみ対応しています");
      return;
    }
    // ここで弾くのは往復を省くためだけで、信頼はしない。最終判定はサーバ側
    if (!isAllowedHost(url.hostname, ALLOWED_HOSTS)) {
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
        placeholder="https://hol1kgmg.com/"
        required
        disabled={loading}
        aria-label="チェックするURL"
      />
      <button type="submit" disabled={loading}>
        {loading ? "チェック中…" : "チェック"}
      </button>
      <button
        type="button"
        onClick={fromClipboard}
        disabled={loading}
        title="クリップボードのURLでチェック"
      >
        📋 貼り付けてチェック
      </button>
      {error && (
        <p className="notice error" role="alert">
          <strong>エラー</strong>
          {error}
        </p>
      )}
    </form>
  );
}
