import type { Issue, Status } from "../types";

export function summarize(issues: Issue[]): Status {
  if (issues.some((i) => i.level === "ng")) return "ng";
  if (issues.length > 0) return "warn";
  return "ok";
}
