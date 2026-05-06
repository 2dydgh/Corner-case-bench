"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ImageCompare from "../components/ImageCompare";
import MetricsTable from "../components/MetricsTable";
import ConfidenceDistribution from "../components/ConfidenceDistribution";
import { useTask } from "../lib/useTask";
import { dropLevel, fnLevel } from "../lib/tokens";

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
interface OverlayDetection {
  class: string;
  bbox: [number, number, number, number];
  confidence: number;
  polygons?: number[][][];
  missed?: boolean;
}
interface DetailResponse {
  baseline: { detections: OverlayDetection[] } | null;
  synthetic: { detections: OverlayDetection[] } | null;
  image_size: { width: number; height: number };
}

export default function ComparePage() {
  const [results, setResults] = useState<ResultItem[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [selectedCondition, setSelectedCondition] = useState<string>("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [task] = useTask();

  useEffect(() => {
    fetch(`/api/summary?task=${task}`)
      .then((res) => res.json())
      .then((data) => {
        const conds = data.conditions?.map((c: { condition: string }) => c.condition) ?? [];
        setConditions(conds);
        if (conds.length > 0) setSelectedCondition((prev) => (conds.includes(prev) ? prev : conds[0]));
      });
  }, [task]);

  useEffect(() => {
    if (!selectedCondition) return;
    fetch(`/api/results?condition=${selectedCondition}&task=${task}`)
      .then((res) => res.json())
      .then((data) => {
        setResults(data.results ?? []);
        setSelectedIdx(0);
      });
  }, [selectedCondition, task]);

  const current = results[selectedIdx];

  useEffect(() => {
    if (!current) {
      setDetail(null);
      return;
    }
    setDetail(null);
    const ctrl = new AbortController();
    fetch(
      `/api/results/${current.image_id}?condition=${current.condition}&task=${task}`,
      { signal: ctrl.signal }
    )
      .then((res) => res.json())
      .then(setDetail)
      .catch(() => {});
    return () => ctrl.abort();
  }, [current, task]);

  const baselineDets: OverlayDetection[] = detail?.baseline?.detections ?? [];
  const syntheticDets: OverlayDetection[] = (() => {
    const real = detail?.synthetic?.detections ?? [];
    if (!current) return real;
    const missedAsDets: OverlayDetection[] = current.missed_details.map((m) => ({
      class: m.class,
      bbox: m.bbox,
      confidence: m.confidence,
      missed: true,
    }));
    return [...real, ...missedAsDets];
  })();

  const imgW = detail?.image_size.width ?? 1280;
  const imgH = detail?.image_size.height ?? 720;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Image Comparison</div>
          <h1 style={{ fontFamily: "var(--font-sans)", fontSize: 24, fontWeight: 700, letterSpacing: "-0.015em", color: "var(--ink)", margin: 0 }}>
            Compare
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {selectedCondition && <span className="badge badge-accent">{selectedCondition.replace(/_/g, " ")}</span>}
          <span className="badge badge-neutral">
            {results.length ? `${selectedIdx + 1} / ${results.length}` : "— / —"} · {task}
          </span>
        </div>
      </div>

      {/* Controls bar */}
      <div className="surface" style={{ padding: "12px 16px", marginBottom: 20, display: "flex", gap: 12, alignItems: "center" }}>
        <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--meta)" }}>
          Condition
        </label>
        <select
          value={selectedCondition}
          onChange={(e) => setSelectedCondition(e.target.value)}
          className="styled-select"
        >
          {conditions.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
        </select>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            className="btn-outline"
            onClick={() => setSelectedIdx(Math.max(0, selectedIdx - 1))}
            disabled={selectedIdx === 0}
          >
            ← Prev
          </button>
          <button
            className="btn-outline"
            onClick={() => setSelectedIdx(Math.min(results.length - 1, selectedIdx + 1))}
            disabled={selectedIdx >= results.length - 1}
          >
            Next →
          </button>
        </div>
      </div>

      {current && (
        <>
          <ImageCompare
            imageId={current.image_id}
            condition={current.condition}
            task={task}
            baselineDetections={baselineDets}
            syntheticDetections={syntheticDets}
            imageWidth={imgW}
            imageHeight={imgH}
          />

          {/* Per-image metric strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 16 }}>
            <Cell label="IoU" value={current.avg_iou.toFixed(2)} />
            <Cell label="Conf Drop" value={`${(current.avg_confidence_drop * 100).toFixed(1)}%`} signal={dropLevel(current.avg_confidence_drop) === "signal"} />
            <Cell label="False Negative" value={`${(current.false_negative_rate * 100).toFixed(1)}%`} signal={fnLevel(current.false_negative_rate) === "signal"} />
            <Cell label="Class Flip" value={`${(current.class_flip_rate * 100).toFixed(1)}%`} />
          </div>

          {/* Lower 2-col */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
            <div className="surface" style={{ padding: 20 }}>
              <ConfidenceDistribution matched={current.matched_details} />
            </div>
            <div className="surface" style={{ padding: 20 }}>
              <MetricsTable matched={current.matched_details} missed={current.missed_details} />
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

function Cell({ label, value, signal }: { label: string; value: string; signal?: boolean }) {
  return (
    <div className="surface" style={{ padding: "16px 18px" }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--meta)", marginBottom: 8, fontFamily: "var(--font-sans)" }}>
        {label}
      </div>
      <div>
        {signal ? (
          <span className="badge badge-danger" style={{ fontSize: 20, fontFamily: "var(--font-mono)", fontWeight: 600, padding: "4px 10px" }}>
            {value}
          </span>
        ) : (
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 600,
            color: "var(--ink)", fontVariantNumeric: "tabular-nums",
            display: "inline-block",
          }}>
            {value}
          </span>
        )}
      </div>
    </div>
  );
}
