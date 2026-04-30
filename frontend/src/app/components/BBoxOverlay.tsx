"use client";

import { useState } from "react";

interface Detection {
  class: string;
  bbox: [number, number, number, number]; // x1, y1, x2, y2 in pixels
  confidence: number;
}

interface BBoxOverlayProps {
  imageSrc: string;
  baselineDetections: Detection[];
  syntheticDetections: Detection[];
  imageWidth: number;
  imageHeight: number;
}

export default function BBoxOverlay({
  imageSrc,
  baselineDetections,
  syntheticDetections,
  imageWidth,
  imageHeight,
}: BBoxOverlayProps) {
  const [showBaseline, setShowBaseline] = useState(true);
  const [showSynthetic, setShowSynthetic] = useState(true);

  const toPercent = (val: number, total: number) => `${(val / total) * 100}%`;

  const renderBoxes = (detections: Detection[], color: string, label: string) =>
    detections.map((det, i) => {
      const [x1, y1, x2, y2] = det.bbox;
      return (
        <div
          key={`${label}-${i}`}
          className="absolute border-2 rounded-sm"
          style={{
            borderColor: color,
            left: toPercent(x1, imageWidth),
            top: toPercent(y1, imageHeight),
            width: toPercent(x2 - x1, imageWidth),
            height: toPercent(y2 - y1, imageHeight),
          }}
        >
          <span
            className="absolute -top-5 left-0 text-[10px] px-1 rounded font-mono"
            style={{ background: color, color: "#000" }}
          >
            {det.class} {(det.confidence * 100).toFixed(0)}%
          </span>
        </div>
      );
    });

  return (
    <div>
      <div className="flex gap-3 mb-3">
        <button
          onClick={() => setShowBaseline(!showBaseline)}
          className={`text-xs px-3 py-1 rounded-full border transition-all ${
            showBaseline
              ? "border-green-500 text-green-400 bg-green-500/10"
              : "border-[var(--border-subtle)] text-[var(--text-muted)]"
          }`}
        >
          Baseline
        </button>
        <button
          onClick={() => setShowSynthetic(!showSynthetic)}
          className={`text-xs px-3 py-1 rounded-full border transition-all ${
            showSynthetic
              ? "border-red-500 text-red-400 bg-red-500/10"
              : "border-[var(--border-subtle)] text-[var(--text-muted)]"
          }`}
        >
          Synthetic
        </button>
      </div>
      <div className="relative inline-block w-full">
        <img src={imageSrc} alt="Detection" className="w-full h-auto rounded-xl" />
        {showBaseline && renderBoxes(baselineDetections, "#22c55e", "base")}
        {showSynthetic && renderBoxes(syntheticDetections, "#ef4444", "synth")}
      </div>
    </div>
  );
}
