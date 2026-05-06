"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTask } from "../lib/useTask";
import { dropLevel, fnLevel, isWorstBucket } from "../lib/tokens";

interface GalleryItem {
  image_id: string;
  condition: string;
  avg_confidence_drop: number;
  false_negative_rate: number;
  total_missed: number;
  total_baseline: number;
  avg_iou: number;
}

const CONDITION_COLORS: Record<string, string> = {
  fog: "#64748B",
  night: "#1E293B",
  rain: "#3B82F6",
  snow: "#93C5FD",
  glare: "#F59E0B",
  dark: "#6366F1",
  dirty_lens: "#8B5CF6",
  motion_blur: "#EC4899",
};

function conditionColor(c: string): string {
  for (const [k, v] of Object.entries(CONDITION_COLORS)) {
    if (c.toLowerCase().includes(k)) return v;
  }
  return "#6366F1";
}

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"conf_drop" | "fn_rate">("conf_drop");
  const [task] = useTask();

  useEffect(() => {
    fetch(`/api/summary?task=${task}`)
      .then((res) => res.json())
      .then((data) => {
        const conds = data.conditions?.map((c: { condition: string }) => c.condition) ?? [];
        setConditions(conds);
      });
  }, [task]);

  useEffect(() => {
    const base = filter === "all"
      ? `/api/results?per_page=100`
      : `/api/results?condition=${filter}&per_page=100`;
    fetch(`${base}&task=${task}`)
      .then((res) => res.json())
      .then((data) => setItems(data.results ?? []));
  }, [filter, task]);

  const sorted = [...items].sort((a, b) =>
    sortBy === "conf_drop"
      ? b.avg_confidence_drop - a.avg_confidence_drop
      : b.false_negative_rate - a.false_negative_rate
  );

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {/* Page header + controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Image Gallery</div>
          <h1 style={{ fontFamily: "var(--font-sans)", fontSize: 24, fontWeight: 700, letterSpacing: "-0.015em", color: "var(--ink)", margin: 0 }}>
            Gallery
          </h1>
        </div>
        <span className="badge badge-neutral">{sorted.length} results</span>
      </div>

      {/* Filter bar */}
      <div className="surface" style={{ padding: "12px 16px", marginBottom: 24, display: "flex", gap: 12, alignItems: "center" }}>
        <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--meta)" }}>
          Filter
        </label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="styled-select"
        >
          <option value="all">All conditions</option>
          {conditions.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
        </select>

        <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--meta)", marginLeft: 8 }}>
          Sort by
        </label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "conf_drop" | "fn_rate")}
          className="styled-select"
        >
          <option value="conf_drop">Worst conf drop</option>
          <option value="fn_rate">Worst FN rate</option>
        </select>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {sorted.map((item, i) => {
          const worst = isWorstBucket(item.false_negative_rate, item.avg_confidence_drop);
          const dropL = dropLevel(item.avg_confidence_drop);
          const fnL = fnLevel(item.false_negative_rate);
          const cc = conditionColor(item.condition);

          return (
            <motion.a
              key={`${item.condition}-${item.image_id}`}
              href={`/compare?condition=${item.condition}&id=${item.image_id}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
              style={{
                background: "var(--card)",
                border: "1px solid var(--card-brd)",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                textDecoration: "none",
                color: "inherit",
                display: "block",
                boxShadow: "var(--shadow-card)",
                transform: "translateY(0)",
                transition: "transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = "translateY(-4px)";
                el.style.boxShadow = `0 8px 24px rgba(0,0,0,0.12), 0 2px 8px ${cc}40`;
                el.style.borderColor = cc;
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = "translateY(0)";
                el.style.boxShadow = "var(--shadow-card)";
                el.style.borderColor = "var(--card-brd)";
              }}
            >
              {/* Image */}
              <div style={{ position: "relative", aspectRatio: "16 / 9", background: "#0F172A", overflow: "hidden" }}>
                <img
                  src={`/api/images/synthetic/${item.condition}/${item.image_id}.jpg`}
                  alt={`${item.condition} ${item.image_id}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 300ms ease" }}
                />
                {/* bottom gradient overlay */}
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)",
                  pointerEvents: "none",
                }} />
                {/* Condition badge */}
                <span style={{
                  position: "absolute", top: 10, left: 10,
                  fontFamily: "var(--font-sans)", fontSize: 10, letterSpacing: "0.05em", fontWeight: 700,
                  padding: "3px 9px",
                  background: cc,
                  color: "#FFFFFF",
                  borderRadius: "var(--radius-pill)",
                  textTransform: "uppercase",
                  boxShadow: `0 2px 8px ${cc}70`,
                }}>
                  {item.condition.replace(/_/g, " ")}
                </span>
                {/* Worst indicator */}
                {worst && (
                  <span style={{
                    position: "absolute", top: 10, right: 10,
                    background: "#DC2626",
                    color: "#FFFFFF",
                    fontFamily: "var(--font-sans)", fontSize: 9, fontWeight: 700,
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    padding: "3px 8px", borderRadius: "var(--radius-pill)",
                  }}>WORST</span>
                )}
              </div>

              {/* Card body */}
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--meta)" }}>{item.image_id}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--meta)" }}>iou {item.avg_iou.toFixed(2)}</span>
                </div>

                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
                  <span style={{
                    fontSize: 24, fontWeight: 800, fontFamily: "var(--font-mono)", lineHeight: 1,
                    color: dropL === "signal" ? "var(--danger)" : "var(--ink)",
                  }}>
                    −{(item.avg_confidence_drop * 100).toFixed(0)}%
                  </span>
                  <span style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--meta)", fontFamily: "var(--font-sans)" }}>
                    conf drop
                  </span>
                </div>

                {/* FN bar */}
                <div style={{ width: "100%", height: 5, background: "var(--divider)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    width: `${Math.min(100, item.false_negative_rate * 100)}%`,
                    height: "100%",
                    borderRadius: 3,
                    background: fnL === "signal"
                      ? "linear-gradient(90deg, #FCA5A5, #DC2626)"
                      : `linear-gradient(90deg, ${cc}70, ${cc})`,
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--meta)" }}>
                  <span>fn {(item.false_negative_rate * 100).toFixed(0)}%</span>
                  <span>missed {item.total_missed}/{item.total_baseline}</span>
                </div>
              </div>
            </motion.a>
          );
        })}
      </div>
    </motion.div>
  );
}
