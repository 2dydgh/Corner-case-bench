"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ClassVulnerability from "./components/ClassVulnerability";
import { useTask } from "./lib/useTask";
import { deriveHeadline } from "./lib/headline";
import { dropLevel, fnLevel } from "./lib/tokens";

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

export default function OverviewPage() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [task] = useTask();

  useEffect(() => {
    setSummary(null);
    fetch(`/api/summary?task=${task}`)
      .then((res) => res.json())
      .then(setSummary)
      .catch((e) => setError(e.message));
  }, [task]);

  if (error) return (
    <div style={{ padding: "24px", background: "var(--danger-bg)", borderRadius: "var(--radius-md)", color: "var(--danger)", fontSize: 14 }}>
      Error: {error}
    </div>
  );
  if (!summary) return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--meta)", paddingTop: 60, justifyContent: "center" }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
        <path d="M21 12a9 9 0 11-6.219-8.56"/>
      </svg>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      Loading…
    </div>
  );

  const headline = deriveHeadline(summary);
  const worstFn = summary.conditions.length
    ? Math.max(...summary.conditions.map((c) => c.avg_false_negative_rate))
    : 0;
  const meanIou = summary.conditions.length
    ? summary.conditions.reduce((s, c) => s + c.avg_iou, 0) / summary.conditions.length
    : 0;
  const sortedConditions = [...summary.conditions].sort(
    (a, b) => b.avg_false_negative_rate - a.avg_false_negative_rate
  );
  const maxFn = Math.max(0.01, ...sortedConditions.map((c) => c.avg_false_negative_rate));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>

      {/* ── HERO BANNER ─────────────────────────────────────────── */}
      <div style={{
        margin: "-44px -48px 0",
        padding: "48px 48px 40px",
        background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 40%, #4338CA 70%, #6D28D9 100%)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* decorative blobs */}
        <div style={{
          position: "absolute", top: -60, right: -60,
          width: 320, height: 320, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(167,139,250,0.25) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -40, left: "30%",
          width: 200, height: 200, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* eyebrow */}
        <div style={{
          fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: "rgba(196,181,253,0.9)", marginBottom: 12,
        }}>
          Robustness Report · {today} · task: {task.toUpperCase()}
        </div>

        {/* title */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}
          style={{
            fontFamily: "var(--font-sans)", fontSize: 36, fontWeight: 800,
            letterSpacing: "-0.025em", color: "#FFFFFF", margin: "0 0 12px",
            lineHeight: 1.15,
          }}
        >
          {headline}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.4 }}
          style={{ fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: 1.65, color: "rgba(196,181,253,0.85)", maxWidth: 560, margin: "0 0 24px" }}
        >
          Stress test of <span style={{ color: "#C4B5FD", fontWeight: 600 }}>{task === "seg" ? "YOLOv8m-seg" : "YOLOv8m"}</span> under{" "}
          <span style={{ color: "#A5B4FC", fontWeight: 600 }}>{summary.conditions.length} adverse conditions</span>,
          evaluated on{" "}
          <span style={{ color: "#A5B4FC", fontWeight: 600 }}>{summary.total_images.toLocaleString()} synthetic corner cases</span>{" "}
          derived from the BDD100K val set.
        </motion.p>

        {/* hero stat strip */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.4 }}
          style={{ display: "flex", gap: 32 }}
        >
          {[
            { label: "Images", value: summary.total_images.toLocaleString(), color: "#A5B4FC" },
            { label: "Worst FN", value: `${(worstFn * 100).toFixed(1)}%`, color: "#FCA5A5" },
            { label: "Conditions", value: summary.conditions.length, color: "#A5B4FC" },
            { label: "Mean IoU", value: meanIou.toFixed(2), color: "#6EE7B7" },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>
                {value}
              </div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "rgba(196,181,253,0.7)", marginTop: 5, fontWeight: 500, letterSpacing: "0.04em" }}>
                {label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── METRIC CARDS ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}
        style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, margin: "28px 0 36px" }}
      >
        <MetricCard
          label="Images Evaluated"
          value={summary.total_images.toLocaleString()}
          accentColor="#6366F1"
        />
        <MetricCard
          label="Worst FN Rate"
          value={`${(worstFn * 100).toFixed(1)}%`}
          accentColor="#DC2626"
          danger
          sub={summary.worst_condition?.replace(/_/g, " ") ?? "—"}
        />
        <MetricCard
          label="Largest Conf Drop"
          value={summary.worst_conf_drop.toFixed(3)}
          accentColor="#DC2626"
          danger
          sub={summary.worst_condition?.replace(/_/g, " ") ?? "—"}
        />
        <MetricCard
          label="Mean IoU"
          value={meanIou.toFixed(2)}
          accentColor="#10B981"
          sub="across all conditions"
        />
      </motion.div>

      {/* ── BY CONDITION TABLE ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4 }}
        style={{ marginBottom: 36 }}
      >
        <SectionHeader title="By condition" meta={`task = ${task} · sorted by FN rate`} />
        <div className="surface" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#FAFBFF" }}>
                <th style={thStyle}>condition</th>
                <th style={{ ...thStyle, textAlign: "right" }}>n</th>
                <th style={{ ...thStyle, textAlign: "right" }}>fn_rate</th>
                <th style={{ ...thStyle, textAlign: "right" }}>iou</th>
                <th style={{ ...thStyle, textAlign: "right" }}>conf_drop</th>
                <th style={{ ...thStyle, width: 160 }}>severity</th>
              </tr>
            </thead>
            <tbody>
              {sortedConditions.map((c, i) => {
                const fnL = fnLevel(c.avg_false_negative_rate);
                const dropL = dropLevel(c.avg_confidence_drop);
                const barWidth = (c.avg_false_negative_rate / maxFn) * 100;
                const cc = conditionColor(c.condition);
                const isDangerFn = fnL === "signal";
                const isDangerDrop = dropL === "signal";
                return (
                  <motion.tr
                    key={c.condition}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.04, duration: 0.25 }}
                    style={{ transition: "background 120ms ease" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F5F3FF")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: cc, display: "inline-block", flexShrink: 0 }} />
                        <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500 }}>
                          {c.condition.replace(/_/g, " ")}
                        </span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", color: "var(--meta)" }}>{c.num_images}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {isDangerFn ? (
                        <span className="badge badge-danger">{c.avg_false_negative_rate.toFixed(3)}</span>
                      ) : (
                        <span style={{ color: "var(--ink)" }}>{c.avg_false_negative_rate.toFixed(3)}</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", color: "var(--meta)" }}>{c.avg_iou.toFixed(2)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {isDangerDrop ? (
                        <span style={{ color: "var(--danger)", fontWeight: 600 }}>{c.avg_confidence_drop.toFixed(3)}</span>
                      ) : (
                        <span style={{ color: "var(--meta)" }}>{c.avg_confidence_drop.toFixed(3)}</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, paddingRight: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: "var(--divider)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{
                            width: `${barWidth}%`, height: "100%",
                            background: isDangerFn ? `linear-gradient(90deg, #FCA5A5, #DC2626)` : `linear-gradient(90deg, ${cc}88, ${cc})`,
                            borderRadius: 3,
                            transition: "width 600ms cubic-bezier(0.4, 0, 0.2, 1)",
                          }} />
                        </div>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--meta)", width: 36, textAlign: "right" }}>
                          {(c.avg_false_negative_rate * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ── KEY FINDINGS ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.4 }}
        style={{ marginBottom: 36 }}
      >
        <SectionHeader title="Key findings" meta="summary" />
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
          {/* text analysis card */}
          <div className="surface" style={{ padding: "22px 24px", borderLeft: "4px solid var(--accent)" }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>
              Analysis
            </div>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: 1.75, color: "var(--ink-2)", margin: "0 0 14px" }}>
              The model fails <span style={{ color: "var(--danger)", fontWeight: 700, background: "var(--danger-bg)", padding: "0 4px", borderRadius: 3 }}>silently</span> rather than noisily under heavy fog and night conditions,
              registering normal confidence on the few objects it does detect while missing the rest.
            </p>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: 1.75, color: "var(--ink-2)", margin: 0 }}>
              Lighting, not weather, is the harder stressor. Rain and snow leave the model nearly intact;
              spatially non-uniform lighting (glare, dark, dirty lens) drives confidence drops <strong>4–7×</strong> larger.
            </p>
          </div>

          {/* findings list card */}
          <div className="surface" style={{ padding: "22px 24px" }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--meta)", marginBottom: 14 }}>
              Key metrics
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { k: "Silent failure", v: "FN 76.7%, drop 0.03", level: "danger" },
                { k: "Lighting > weather", v: "4–7× drop ratio", level: "warning" },
                { k: "Hallucination", v: "traffic_light, bench", level: "neutral" },
                { k: "Vehicle confusion", v: "truck flips 111×", level: "neutral" },
                { k: "Seg ≈ det", v: "Δ ≤ 0.02 all metrics", level: "accent" },
              ].map(({ k, v, level }) => (
                <li key={k} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 10px", borderRadius: "var(--radius-sm)",
                  background: "var(--bg)",
                }}>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--ink-2)" }}>
                    {k}
                  </span>
                  <span className={`badge badge-${level}`}>{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>

      {/* ── CLASS TABLE ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.4 }}
      >
        <ClassVulnerability data={summary.class_stats} limit={8} />
      </motion.div>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <div style={{
        marginTop: 48, paddingTop: 18, borderTop: "1px solid var(--divider)",
        display: "flex", justifyContent: "space-between",
        fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--meta)", letterSpacing: "0.03em",
      }}>
        <span>YOLOv8m · YOLOv8m-seg · Ultralytics</span>
        <span>BDD100K val · 1,000 source · {summary.total_images.toLocaleString()} synthetic</span>
        <span>Generator: InstructPix2Pix</span>
      </div>
    </motion.div>
  );
}

function MetricCard({
  label, value, sub, danger, accentColor,
}: {
  label: string; value: string | number; sub?: string;
  danger?: boolean; accentColor: string;
}) {
  return (
    <div style={{
      background: "var(--card)",
      border: "1px solid var(--card-brd)",
      borderRadius: "var(--radius-md)",
      boxShadow: "var(--shadow-card)",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* color top bar */}
      <div style={{ height: 3, background: accentColor, width: "100%" }} />
      <div style={{ padding: "16px 18px 18px" }}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--meta)" }}>
            {label}
          </div>
        </div>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 30, fontWeight: 700,
          color: danger ? accentColor : "var(--ink)",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
          marginBottom: sub ? 10 : 0,
        }}>
          {value}
        </div>
        {sub && (
          <div style={{
            fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--meta)",
            fontWeight: 500, marginTop: 6,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <h2 className="sec-h">{title}</h2>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--meta)" }}>{meta}</span>
    </div>
  );
}

const thStyle = {
  textAlign: "left" as const,
  fontWeight: 600,
  padding: "12px 16px",
  borderBottom: "1px solid var(--divider)",
  color: "var(--meta)",
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  fontFamily: "var(--font-sans)",
};
const tdStyle = {
  padding: "11px 16px",
  borderBottom: "1px solid var(--divider)",
  color: "var(--ink)",
  fontVariantNumeric: "tabular-nums" as const,
};
