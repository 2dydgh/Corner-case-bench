"use client";

import {
  Radar,
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface ConditionMetric {
  condition: string;
  avg_confidence_drop: number;
  avg_false_negative_rate: number;
  avg_iou: number;
  avg_class_flip_rate: number;
}

export default function RadarChart({ conditions }: { conditions: ConditionMetric[] }) {
  const data = conditions.map((c) => ({
    condition: c.condition.replace(/_/g, " "),
    "Conf Drop": Math.round(c.avg_confidence_drop * 100),
    "FN Rate": Math.round(c.avg_false_negative_rate * 100),
    "IoU Loss": Math.round((1 - c.avg_iou) * 100),
    "Class Flip": Math.round(c.avg_class_flip_rate * 100),
  }));

  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-semibold mb-4 text-[var(--text-secondary)]">
        Vulnerability Radar
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <RechartsRadar cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="var(--border-subtle)" />
          <PolarAngleAxis
            dataKey="condition"
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: "var(--text-muted)", fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 12,
              fontSize: 12,
            }}
          />
          <Radar
            name="Conf Drop"
            dataKey="Conf Drop"
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.15}
          />
          <Radar
            name="FN Rate"
            dataKey="FN Rate"
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.1}
          />
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  );
}
