// localhost を許すのはビューワー自身が手元で動いているときだけ。本番 Worker からは手元に届かないため
export function isLocalhost(host: string): boolean {
  const h = host.toLowerCase();
  return h === "localhost" || h === "127.0.0.1";
}

export function validateUrl(
  input: string,
  allowLocalhost: boolean,
): { ok: true; url: URL } | { ok: false; code: "INVALID_URL"; message: string } {
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
  if (isIpLiteral(host) || (isLocal && !allowLocalhost)) {
    return { ok: false, code: "INVALID_URL", message: "IPアドレスや localhost は指定できません" };
  }
  return { ok: true, url };
}

function isIpLiteral(host: string): boolean {
  // IPv6 は URL.hostname が "[::1]" の形で返す
  return host.startsWith("[") || /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}
