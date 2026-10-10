export type UrlError = "INVALID_URL" | "DOMAIN_NOT_ALLOWED";

export function parseHosts(csv: string | undefined): Set<string> {
  return new Set(
    (csv ?? "")
      .split(",")
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** 形式・プロトコル・IP直指定/localhost を検査。許可ドメイン外は DOMAIN_NOT_ALLOWED */
export function validateUrl(
  input: string,
  allowed: Set<string>,
): { ok: true; url: URL } | { ok: false; code: UrlError; message: string } {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, code: "INVALID_URL", message: "URLの形式が不正です" };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, code: "INVALID_URL", message: "http / https のみ対応しています" };
  }
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || isIpLiteral(host)) {
    return { ok: false, code: "INVALID_URL", message: "IPアドレスや localhost は指定できません" };
  }
  if (!allowed.has(host)) {
    return {
      ok: false,
      code: "DOMAIN_NOT_ALLOWED",
      message: `許可されていないドメインです: ${host}`,
    };
  }
  return { ok: true, url };
}

function isIpLiteral(host: string): boolean {
  // IPv6 は URL.hostname が "[::1]" の形で返す
  return host.startsWith("[") || /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}
