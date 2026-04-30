"use client";

import { motion } from "framer-motion";

interface SummaryData {
  total_images: number;
  worst_condition: string | null;
  worst_conf_drop: number;
  conditions: {
    condition: string;
    avg_confidence_drop: number;
    avg_false_negative_rate: number;
  }[];
}

export default function SummaryCards({ data }: { data: SummaryData }) {
  const avgConfDrop =
    data.conditions.length > 0
      ? data.conditions.reduce((s, c) => s + c.avg_confidence_drop, 0) / data.conditions.length
      : 0;
  const avgFnRate =
    data.conditions.length > 0
      ? data.conditions.reduce((s, c) => s + c.avg_false_negative_rate, 0) / data.conditions.length
      : 0;

  const cards = [
    {
      label: "Total Images Tested",
      value: data.total_images.toString(),
      sub: `${data.conditions.length} conditions`,
      color: "var(--primary)",
      glow: "var(--primary-glow)",
    },
    {
      label: "Avg Confidence Drop",
      value: `${(avgConfDrop * 100).toFixed(1)}%`,
      sub: "across all conditions",
      color: "var(--danger)",
      glow: "var(--danger-glow)",
    },
    {
      label: "Avg False Negative Rate",
      value: `${(avgFnRate * 100).toFixed(1)}%`,
      sub: "objects lost",
      color: "var(--warning)",
      glow: "var(--warning-glow)",
    },
    {
      label: "Worst Condition",
      value: data.worst_condition?.replace(/_/g, " ") ?? "N/A",
      sub: data.worst_condition ? `${(data.worst_conf_drop * 100).toFixed(1)}% drop` : "",
      color: "#f97316",
      glow: "rgba(249,115,22,0.2)",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          className="glass-card p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2">
            {card.label}
          </div>
          <div
            className="text-2xl font-bold"
            style={{ color: card.color, textShadow: `0 0 20px ${card.glow}` }}
          >
            {card.value}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">{card.sub}</div>
        </motion.div>
      ))}
    </div>
  );
}
