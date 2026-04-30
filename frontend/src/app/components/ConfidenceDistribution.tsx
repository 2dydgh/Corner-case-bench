"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface MatchDetail {
  baseline: { class: string; confidence: number };
  synthetic: { class: string; confidence: number };
  iou: number;
}

interface ConfidenceDistributionProps {
  matched: MatchDetail[];
}

export default function ConfidenceDistribution({ matched }: ConfidenceDistributionProps) {
  const bins = Array.from({ length: 10 }, (_, i) => ({
    range: `${i * 10}-${(i + 1) * 10}%`,
    baseline: 0,
    synthetic: 0,
  }));

  matched.forEach((m) => {
    const bIdx = Math.min(9, Math.floor(m.baseline.confidence * 10));
    const sIdx = Math.min(9, Math.floor(m.synthetic.confidence * 10));
    bins[bIdx].baseline++;
    bins[sIdx].synthetic++;
  });

  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-semibold mb-1 text-[var(--text-secondary)]">
        Confidence Distribution
      </h3>
      <p className="text-xs text-[var(--text-muted)] mb-4">
        Baseline vs Synthetic detection confidence
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={bins}>
          <XAxis dataKey="range" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
          <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 12,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="baseline" fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.8} />
          <Bar dataKey="synthetic" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.8} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
