"use client";

interface MatchDetail {
  baseline: { class: string; confidence: number };
  synthetic: { class: string; confidence: number };
  iou: number;
}

interface MissedDetail {
  class: string;
  confidence: number;
}

interface MetricsTableProps {
  matched: MatchDetail[];
  missed: MissedDetail[];
}

export default function MetricsTable({ matched, missed }: MetricsTableProps) {
  return (
    <div className="text-sm max-h-[300px] overflow-y-auto">
      <div className="grid grid-cols-5 gap-2 text-[var(--text-muted)] font-semibold text-xs mb-3 uppercase tracking-wider">
        <span>Object</span>
        <span>IoU</span>
        <span>Conf Drop</span>
        <span>Class</span>
        <span>Status</span>
      </div>
      {matched.map((m, i) => (
        <div
          key={`m-${i}`}
          className="grid grid-cols-5 gap-2 mb-1.5 py-1 rounded hover:bg-white/5 transition-colors"
        >
          <span className="font-medium">{m.baseline.class}</span>
          <span className="tabular-nums">{m.iou.toFixed(2)}</span>
          <span className="text-yellow-400 tabular-nums">
            -{(m.baseline.confidence - m.synthetic.confidence).toFixed(2)}
          </span>
          <span className={m.baseline.class !== m.synthetic.class ? "text-orange-400" : "text-[var(--text-muted)]"}>
            {m.baseline.class !== m.synthetic.class ? `-> ${m.synthetic.class}` : "OK"}
          </span>
          <span className="badge-success text-center">Detected</span>
        </div>
      ))}
      {missed.map((m, i) => (
        <div
          key={`f-${i}`}
          className="grid grid-cols-5 gap-2 mb-1.5 py-1 rounded hover:bg-white/5 transition-colors"
        >
          <span className="font-medium">{m.class}</span>
          <span className="text-[var(--text-muted)]">-</span>
          <span className="text-[var(--text-muted)]">-</span>
          <span className="text-[var(--text-muted)]">-</span>
          <span className="badge-danger text-center">MISSED</span>
        </div>
      ))}
    </div>
  );
}
