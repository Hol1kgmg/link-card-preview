export type UrlError = "INVALID_URL" | "DOMAIN_NOT_ALLOWED";

export function isAllowedHost(host: string, allowed: Set<string>): boolean {
  const h = host.toLowerCase();
  for (const a of allowed) {
    if (h === a || h.endsWith(`.${a}`)) return true;
  }
  return false;
}

// localhost を許すのはビューワー自身が手元で動いているときだけ。本番 Worker からは手元に届かないため
export function withLocalhost(allowed: Set<string>, selfHost: string): Set<string> {
  const h = selfHost.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" ? new Set([...allowed, "localhost"]) : allowed;
}

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
  const isLocal = host === "localhost" || host.endsWith(".localhost");
  if (isIpLiteral(host) || (isLocal && !allowed.has("localhost"))) {
    return { ok: false, code: "INVALID_URL", message: "IPアドレスや localhost は指定できません" };
  }
  if (!isAllowedHost(host, allowed)) {
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
