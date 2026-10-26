import { useState } from "react";
import { buildOgImagePrompt } from "../../lib/buildOgImagePrompt";
import type { CheckResponse } from "../../lib/types";
import { ClipboardPenIcon } from "./icons/ClipboardPenIcon";

export function OgImagePromptButton({ result }: { result: CheckResponse }) {
  const [label, setLabel] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(buildOgImagePrompt(result));
      setLabel("コピーしました");
    } catch {
      setLabel("コピーできません");
    }
    setTimeout(() => setLabel(null), 2000);
  }

  return (
    <button type="button" className="prompt-copy" onClick={copy}>
      <ClipboardPenIcon />
      <span aria-live="polite">{label ?? "og:image 設定プロンプトをコピー"}</span>
    </button>
  );
}
