"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import SummaryCards from "./components/SummaryCards";
import ConditionChart from "./components/ConditionChart";
import SafetyGauge from "./components/SafetyGauge";
import RadarChart from "./components/RadarChart";
import ClassVulnerability from "./components/ClassVulnerability";

interface ConditionSummary {
  condition: string;
  num_images: number;
  avg_iou: number;
  avg_confidence_drop: number;
  avg_false_negative_rate: number;
  avg_class_flip_rate: number;
}

interface ClassStat {
  className: string;
  totalBaseline: number;
  totalMissed: number;
  avgConfDrop: number;
}

interface SummaryResponse {
  total_images: number;
  worst_condition: string | null;
  worst_conf_drop: number;
  conditions: ConditionSummary[];
  class_stats: ClassStat[];
}

export default function OverviewPage() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/summary")
      .then((res) => res.json())
      .then(setSummary)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-400 p-8">Error: {error}</p>;
  if (!summary) return <p className="text-[var(--text-muted)] p-8">Loading...</p>;

  const avgDrop =
    summary.conditions.length > 0
      ? summary.conditions.reduce((s, c) => s + c.avg_confidence_drop, 0) / summary.conditions.length
      : 0;
  const avgFn =
    summary.conditions.length > 0
      ? summary.conditions.reduce((s, c) => s + c.avg_false_negative_rate, 0) / summary.conditions.length
      : 0;
  const safetyScore = Math.max(0, Math.round(100 - (avgDrop * 50 + avgFn * 50) * 100));

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold">Model Robustness Overview</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            YOLOv8 performance under {summary.conditions.length} adverse conditions
          </p>
        </div>
        <div className="text-xs text-[var(--text-muted)]">
          {summary.total_images} images analyzed
        </div>
      </motion.div>

      <SummaryCards data={summary} />

      {summary.worst_conf_drop > 0.3 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[var(--danger-glow)] border border-red-500/30 rounded-2xl p-4 flex items-start gap-3"
        >
          <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 animate-pulse" />
          <div>
            <div className="text-red-400 font-bold text-sm">SAFETY ALERT</div>
            <p className="text-red-300/80 text-sm mt-1">
              Model shows <strong>{(summary.worst_conf_drop * 100).toFixed(1)}% confidence drop</strong> under{" "}
              <strong>{summary.worst_condition?.replace(/_/g, " ")}</strong>. Safety-critical threshold exceeded.
            </p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <SafetyGauge score={safetyScore} label="Overall Safety Score" />
        <div className="col-span-2">
          <RadarChart conditions={summary.conditions} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <ConditionChart conditions={summary.conditions} />
        <ClassVulnerability data={summary.class_stats} />
      </div>
    </div>
  );
}
