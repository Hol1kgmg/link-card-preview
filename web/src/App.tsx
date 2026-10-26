import { type ReactNode, useState } from "react";
import type { CheckResponse, ErrorResponse } from "../lib/types";
import { OgImagePromptButton } from "./components/OgImagePromptButton";
import { OembedPreview } from "./components/previews/OembedPreview";
import { OgpPreview } from "./components/previews/OgpPreview";
import { TwitterPreview } from "./components/previews/TwitterPreview";
import { ResultSection } from "./components/ResultSection";
import { UrlForm } from "./components/UrlForm";

export default function App() {
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [error, setError] = useState<ReactNode>(null);
  const [loading, setLoading] = useState(false);

  async function check(url: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        // 未ログインだと Access が別オリジンのログイン画面へ飛ばし、追従すると CORS エラーで理由が分からなくなる
        redirect: "manual",
      });
      if (res.type === "opaqueredirect") {
        setError(
          <>
            チェックするには<a href="/api/login">ログイン</a>が必要です
          </>,
        );
        return;
      }
      const json = (await res.json()) as CheckResponse | ErrorResponse;
      if ("error" in json) setError(`${json.error.code}: ${json.error.message}`);
      else setResult(json);
    } catch (e) {
      setError(`通信エラー: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app">
      <h1>リンクカードプレビュー</h1>
      <p className="lead">
        入力した URL が SNS や Slack でどう表示されるか（OGP・Xカード・oEmbed）を確認します。
      </p>
      <UrlForm onSubmit={check} loading={loading} />
      {error && (
        <p className="notice error" role="alert">
          <strong>エラー</strong>
          {error}
        </p>
      )}
      {result && (
        <>
          <p className="meta">
            取得先: <a href={result.finalUrl}>{result.finalUrl}</a> /{" "}
            {new Date(result.fetchedAt).toLocaleString()}
          </p>
          <OgImagePromptButton result={result} />
          <ResultSection
            title="OGP"
            status={result.ogp.status}
            issues={result.ogp.issues}
            tags={result.ogp.tags}
          >
            <OgpPreview tags={result.ogp.tags} finalUrl={result.finalUrl} />
          </ResultSection>
          <ResultSection
            title="Xカード"
            status={result.twitter.status}
            issues={result.twitter.issues}
            tags={result.twitter.tags}
            fallbacks={result.twitter.fallbacks}
          >
            <TwitterPreview
              twitter={result.twitter}
              og={result.ogp.tags}
              finalUrl={result.finalUrl}
            />
          </ResultSection>
          <ResultSection
            title="oEmbed"
            status={result.oembed.status}
            issues={result.oembed.issues}
            tags={result.oembed.endpoint ? { endpoint: result.oembed.endpoint } : {}}
          >
            <OembedPreview data={result.oembed.data} />
          </ResultSection>
        </>
      )}
    </main>
  );
}
