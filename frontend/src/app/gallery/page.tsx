"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface GalleryItem {
  image_id: string;
  condition: string;
  avg_confidence_drop: number;
  false_negative_rate: number;
  total_missed: number;
  total_baseline: number;
}

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"conf_drop" | "fn_rate">("conf_drop");

  useEffect(() => {
    fetch("/api/summary")
      .then((res) => res.json())
      .then((data) => {
        const conds = data.conditions?.map((c: { condition: string }) => c.condition) ?? [];
        setConditions(conds);
      });
  }, []);

  useEffect(() => {
    const url = filter === "all" ? "/api/results?per_page=100" : `/api/results?condition=${filter}&per_page=100`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => setItems(data.results ?? []));
  }, [filter]);

  const sorted = [...items].sort((a, b) =>
    sortBy === "conf_drop"
      ? b.avg_confidence_drop - a.avg_confidence_drop
      : b.false_negative_rate - a.false_negative_rate
  );

  const getSeverityBadge = (confDrop: number) => {
    if (confDrop >= 0.4) return <span className="badge-danger">Critical</span>;
    if (confDrop >= 0.25) return <span className="badge-warning">Warning</span>;
    return <span className="badge-success">OK</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Gallery</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="glass-card px-3 py-1.5 text-sm border-none outline-none"
        >
          <option value="all">All Conditions</option>
          {conditions.map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "conf_drop" | "fn_rate")}
          className="glass-card px-3 py-1.5 text-sm border-none outline-none"
        >
          <option value="conf_drop">Sort: Worst Conf Drop</option>
          <option value="fn_rate">Sort: Worst FN Rate</option>
        </select>
        <span className="ml-auto text-sm text-[var(--text-muted)]">
          {sorted.length} results
        </span>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {sorted.map((item, i) => (
          <motion.div
            key={`${item.condition}-${item.image_id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.05, 0.5) }}
            className="glass-card overflow-hidden group"
          >
            <div className="relative">
              <img
                src={`/api/images/synthetic/${item.condition}/${item.image_id}.jpg`}
                alt={`${item.condition} ${item.image_id}`}
                className="w-full h-44 object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute top-3 left-3">
                {getSeverityBadge(item.avg_confidence_drop)}
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <span className="text-xs text-white/70">
                  {item.condition.replace(/_/g, " ")}
                </span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-[var(--text-muted)] font-mono">{item.image_id}</span>
                <span
                  className="text-sm font-bold"
                  style={{
                    color:
                      item.avg_confidence_drop >= 0.4
                        ? "var(--danger)"
                        : item.avg_confidence_drop >= 0.25
                        ? "var(--warning)"
                        : "var(--success)",
                  }}
                >
                  -{(item.avg_confidence_drop * 100).toFixed(1)}%
                </span>
              </div>
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--text-muted)]">
                    Missed {item.total_missed}/{item.total_baseline}
                  </span>
                  <span
                    className={
                      item.false_negative_rate > 0.3 ? "text-red-400" : "text-[var(--text-secondary)]"
                    }
                  >
                    {(item.false_negative_rate * 100).toFixed(0)}% FN
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.false_negative_rate * 100}%`,
                      background:
                        item.false_negative_rate > 0.3
                          ? "var(--danger)"
                          : item.false_negative_rate > 0.15
                          ? "var(--warning)"
                          : "var(--success)",
                    }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
