import { useState } from "react";
import type { CheckResponse, ErrorResponse } from "../lib/types";
import { OembedPreview } from "./components/previews/OembedPreview";
import { OgpPreview } from "./components/previews/OgpPreview";
import { TwitterPreview } from "./components/previews/TwitterPreview";
import { ResultSection } from "./components/ResultSection";
import { UrlForm } from "./components/UrlForm";

export default function App() {
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      });
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
      <h1>カードリンクチェッカー</h1>
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
