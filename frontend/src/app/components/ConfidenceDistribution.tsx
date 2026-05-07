"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartTheme } from "../lib/chart-theme";

interface MatchDetail {
  baseline: { confidence: number };
  synthetic: { confidence: number };
}

interface Props {
  matched: MatchDetail[];
}

const BUCKETS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

function bucketize(values: number[]): { range: string; count: number }[] {
  return BUCKETS.map((upper, i) => {
    const lower = i === 0 ? 0 : BUCKETS[i - 1];
    const count = values.filter((v) => v > lower && v <= upper).length;
    return { range: `${(upper * 100).toFixed(0)}`, count };
  });
}

export default function ConfidenceDistribution({ matched }: Props) {
  const baseBuckets = bucketize(matched.map((m) => m.baseline.confidence));
  const synthBuckets = bucketize(matched.map((m) => m.synthetic.confidence));
  const data = baseBuckets.map((b, i) => ({
    range: b.range,
    baseline: b.count,
    synthetic: synthBuckets[i].count,
  }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <h3 className="sec-h" style={{ fontSize: 15 }}>
          Confidence distribution
        </h3>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--meta)" }}>
          baseline → synthetic
        </span>
      </div>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 12, right: 8, bottom: 8, left: -12 }}>
            <CartesianGrid stroke={chartTheme.gridLine.stroke} strokeDasharray={chartTheme.gridLine.strokeDasharray} vertical={false} />
            <XAxis
              dataKey="range"
              stroke={chartTheme.axisLine.stroke}
              tick={chartTheme.tickStyle}
              tickLine={false}
            />
            <YAxis
              stroke={chartTheme.axisLine.stroke}
              tick={chartTheme.tickStyle}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={chartTheme.tooltipStyle}
              cursor={{ fill: "rgba(24,24,27,0.04)" }}
            />
            <Legend
              wrapperStyle={{ fontFamily: chartTheme.tickStyle.fontFamily, fontSize: 10, color: chartTheme.tickStyle.fill }}
            />
            <Bar dataKey="baseline" fill={chartTheme.series.baseline} />
            <Bar dataKey="synthetic" fill={chartTheme.series.synthetic} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
