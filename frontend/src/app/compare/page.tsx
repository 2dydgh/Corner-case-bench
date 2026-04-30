"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ImageCompare from "../components/ImageCompare";
import MetricsTable from "../components/MetricsTable";
import ConfidenceDistribution from "../components/ConfidenceDistribution";

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

interface ResultItem {
  image_id: string;
  condition: string;
  avg_iou: number;
  avg_confidence_drop: number;
  false_negative_rate: number;
  class_flip_rate: number;
  matched_details: MatchDetail[];
  missed_details: MissedDetail[];
}

export default function ComparePage() {
  const [results, setResults] = useState<ResultItem[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [selectedCondition, setSelectedCondition] = useState<string>("");
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    fetch("/api/summary")
      .then((res) => res.json())
      .then((data) => {
        const conds = data.conditions?.map((c: { condition: string }) => c.condition) ?? [];
        setConditions(conds);
        if (conds.length > 0) setSelectedCondition(conds[0]);
      });
  }, []);

  useEffect(() => {
    if (!selectedCondition) return;
    fetch(`/api/results?condition=${selectedCondition}`)
      .then((res) => res.json())
      .then((data) => {
        setResults(data.results ?? []);
        setSelectedIdx(0);
      });
  }, [selectedCondition]);

  const current = results[selectedIdx];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Compare</h1>
        <select
          value={selectedCondition}
          onChange={(e) => setSelectedCondition(e.target.value)}
          className="glass-card px-3 py-1.5 text-sm border-none outline-none"
        >
          {conditions.map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setSelectedIdx(Math.max(0, selectedIdx - 1))}
            disabled={selectedIdx === 0}
            className="glass-card px-3 py-1.5 text-sm disabled:opacity-30 hover:border-[var(--border-glow)]"
          >
            Prev
          </button>
          <span className="text-sm text-[var(--text-muted)] tabular-nums min-w-[60px] text-center">
            {results.length > 0 ? `${selectedIdx + 1} / ${results.length}` : "- / -"}
          </span>
          <button
            onClick={() => setSelectedIdx(Math.min(results.length - 1, selectedIdx + 1))}
            disabled={selectedIdx >= results.length - 1}
            className="glass-card px-3 py-1.5 text-sm disabled:opacity-30 hover:border-[var(--border-glow)]"
          >
            Next
          </button>
        </div>
      </div>

      {current && (
        <motion.div
          key={`${current.condition}-${current.image_id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <ImageCompare imageId={current.image_id} condition={current.condition} />

          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Avg IoU", value: current.avg_iou.toFixed(2), color: "var(--primary)" },
              {
                label: "Conf Drop",
                value: `-${(current.avg_confidence_drop * 100).toFixed(1)}%`,
                color: "var(--danger)",
              },
              {
                label: "FN Rate",
                value: `${(current.false_negative_rate * 100).toFixed(1)}%`,
                color: "var(--warning)",
              },
              {
                label: "Class Flip",
                value: `${((current.class_flip_rate ?? 0) * 100).toFixed(1)}%`,
                color: "#f97316",
              },
            ].map((m) => (
              <div key={m.label} className="glass-card p-4 text-center">
                <div className="text-xs text-[var(--text-muted)] uppercase">{m.label}</div>
                <div className="text-xl font-bold mt-1" style={{ color: m.color }}>
                  {m.value}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <ConfidenceDistribution matched={current.matched_details} />
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold mb-4 text-[var(--text-secondary)]">
                Per-Object Details
              </h3>
              <MetricsTable
                matched={current.matched_details}
                missed={current.missed_details}
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
