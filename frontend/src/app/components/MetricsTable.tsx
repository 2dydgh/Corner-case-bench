"use client";

interface MatchDetail {
  baseline: { class: string; confidence: number; bbox: [number, number, number, number] };
  synthetic: { class: string; confidence: number; bbox: [number, number, number, number] };
  iou: number;
}

interface MissedDetail {
  class: string;
  confidence: number;
  bbox: [number, number, number, number];
}

interface MetricsTableProps {
  matched: MatchDetail[];
  missed: MissedDetail[];
}

export default function MetricsTable({ matched, missed }: MetricsTableProps) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <h3 className="sec-h" style={{ fontSize: 15 }}>
          Per-object detail
        </h3>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--meta)" }}>
          matched {matched.length} · missed {missed.length}
        </span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 11 }}>
        <thead>
          <tr>
            <th style={thStyle}>class</th>
            <th style={{ ...thStyle, textAlign: "right" }}>baseline</th>
            <th style={{ ...thStyle, textAlign: "right" }}>synthetic</th>
            <th style={{ ...thStyle, textAlign: "right" }}>iou</th>
          </tr>
        </thead>
        <tbody>
          {matched.map((m, i) => (
            <tr key={`m-${i}`}>
              <td style={tdStyle}>{m.baseline.class}{m.baseline.class !== m.synthetic.class ? ` → ${m.synthetic.class}` : ""}</td>
              <td style={{ ...tdStyle, textAlign: "right", color: "var(--ink)" }}>{(m.baseline.confidence * 100).toFixed(0)}%</td>
              <td style={{ ...tdStyle, textAlign: "right", color: "var(--ink)" }}>{(m.synthetic.confidence * 100).toFixed(0)}%</td>
              <td style={{ ...tdStyle, textAlign: "right" }}>{m.iou.toFixed(2)}</td>
            </tr>
          ))}
          {missed.map((m, i) => (
            <tr key={`x-${i}`}>
              <td style={{ ...tdStyle, color: "var(--signal)" }}>{m.class}</td>
              <td style={{ ...tdStyle, textAlign: "right", color: "var(--ink)" }}>{(m.confidence * 100).toFixed(0)}%</td>
              <td style={{ ...tdStyle, textAlign: "right", color: "var(--signal)" }}>missed</td>
              <td style={{ ...tdStyle, textAlign: "right", color: "var(--meta)" }}>—</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle = {
  textAlign: "left" as const,
  fontWeight: 500,
  padding: "8px 0 6px",
  borderBottom: "1px solid var(--ink)",
  color: "var(--meta)",
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};
const tdStyle = {
  padding: "7px 0",
  borderBottom: "1px solid var(--card-brd)",
  color: "var(--ink)",
  fontVariantNumeric: "tabular-nums" as const,
};
