import type { ReactNode } from "react";
import type { Issue, Status } from "../../lib/types";

const LABEL: Record<Status, string> = { ok: "OK", warn: "警告", ng: "NG" };

export function ResultSection({
  title,
  status,
  issues,
  tags,
  fallbacks,
  children,
}: {
  title: string;
  status: Status;
  issues: Issue[];
  tags: Record<string, string>;
  fallbacks?: string[];
  children: ReactNode;
}) {
  return (
    <section className={`result result-${status}`}>
      <h2>
        {title} <span className={`badge badge-${status}`}>{LABEL[status]}</span>
      </h2>
      <div className="preview">{children}</div>
      {issues.length > 0 && (
        <ul className="issues">
          {issues.map((i) => (
            <li key={i.code} className={`notice issue-${i.level}`}>
              <strong>{i.level === "ng" ? "NG" : "警告"}</strong> {i.message}
              {i.hint && <div className="hint">→ {i.hint}</div>}
            </li>
          ))}
        </ul>
      )}
      {fallbacks && fallbacks.length > 0 && (
        <p className="notice fallbacks">
          <strong>情報</strong>OGPで代用: {fallbacks.join(", ")}
        </p>
      )}
      <details>
        <summary>検出したタグ ({Object.keys(tags).length})</summary>
        <table className="tags">
          <tbody>
            {Object.entries(tags).map(([k, v]) => (
              <tr key={k}>
                <th>{k}</th>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
