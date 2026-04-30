"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ConditionData {
  condition: string;
  avg_confidence_drop: number;
  avg_false_negative_rate: number;
}

export default function ConditionChart({ conditions }: { conditions: ConditionData[] }) {
  const sorted = [...conditions].sort((a, b) => b.avg_confidence_drop - a.avg_confidence_drop);

  const chartData = sorted.map((c) => ({
    name: c.condition.replace(/_/g, " "),
    confDrop: Math.round(c.avg_confidence_drop * 100),
    fnRate: Math.round(c.avg_false_negative_rate * 100),
  }));

  const getColor = (drop: number) => {
    if (drop >= 40) return "#ef4444";
    if (drop >= 25) return "#f59e0b";
    return "#22c55e";
  };

  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-semibold mb-1 text-[var(--text-secondary)]">
        Performance Degradation by Condition
      </h3>
      <p className="text-xs text-[var(--text-muted)] mb-4">
        Confidence drop % under each adverse condition
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
            width={80}
          />
          <Tooltip
            contentStyle={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 12,
              fontSize: 12,
            }}
            formatter={(value) => [`${value}%`]}
          />
          <Bar dataKey="confDrop" name="confDrop" radius={[0, 6, 6, 0]} barSize={18}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={getColor(entry.confDrop)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
