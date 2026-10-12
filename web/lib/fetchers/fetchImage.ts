import { imageSize } from "image-size";
import { isAllowedHost } from "../security/validateUrl";
import type { ImageInfo } from "../types";
import { USER_AGENT } from "./fetchHtml";

const TIMEOUT_MS = 5000;
// ponytail: 画像ヘッダ判定に十分な先頭バイト数。SVG など末尾まで要る形式は width/height が取れないまま返す
const HEAD_BYTES = 64 * 1024;

export async function fetchImage(url: string, allowed: Set<string>): Promise<ImageInfo> {
  const info: ImageInfo = { url, reachable: false };
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return info;
  }
  if (!isAllowedHost(target.hostname, allowed)) return info;

  try {
    const res = await fetch(target, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return info;
    info.reachable = true;
    info.contentType = res.headers.get("content-type") ?? undefined;
    const len = res.headers.get("content-length");
    if (len) info.bytes = Number(len);

    const head = await readHead(res, HEAD_BYTES);
    try {
      const dim = imageSize(head);
      info.width = dim.width;
      info.height = dim.height;
    } catch {
      // 寸法が取れないだけ。reachable は true のまま
    }
  } catch {
    // タイムアウト・ネットワークエラーは reachable=false
  }
  return info;
}

async function readHead(res: Response, limit: number): Promise<Uint8Array> {
  const reader = res.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let read = 0;
  while (read < limit) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    read += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  const out = new Uint8Array(read);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}
