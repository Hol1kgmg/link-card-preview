import { USER_AGENT } from "./fetchHtml";

const TIMEOUT_MS = 5000;

export type OembedFetchResult =
  | { kind: "not_allowed" }
  | { kind: "timeout" }
  | { kind: "network"; message: string }
  | { kind: "http"; status: number }
  | { kind: "invalid_json" }
  | { kind: "ok"; data: Record<string, unknown> };

export async function fetchOembed(
  endpoint: string,
  allowed: Set<string>,
): Promise<OembedFetchResult> {
  let target: URL;
  try {
    target = new URL(endpoint);
  } catch {
    return { kind: "network", message: "エンドポイントのURLが不正です" };
  }
  if (!allowed.has(target.hostname.toLowerCase())) return { kind: "not_allowed" };

  let res: Response;
  try {
    res = await fetch(target, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") return { kind: "timeout" };
    return { kind: "network", message: String(e) };
  }
  if (res.status !== 200) return { kind: "http", status: res.status };
  try {
    const data = (await res.json()) as unknown;
    if (typeof data !== "object" || data === null || Array.isArray(data))
      return { kind: "invalid_json" };
    return { kind: "ok", data: data as Record<string, unknown> };
  } catch {
    return { kind: "invalid_json" };
  }
}
