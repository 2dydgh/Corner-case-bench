"use client";

import { useState } from "react";
import OverlayLayer from "./OverlayLayer";

interface Detection {
  class: string;
  bbox: [number, number, number, number];
  confidence: number;
  polygons?: number[][][];
  missed?: boolean;
}

interface ImageCompareProps {
  imageId: string;
  condition: string;
  task: "seg" | "det";
  baselineDetections: Detection[];
  syntheticDetections: Detection[];
  imageWidth: number;
  imageHeight: number;
}

export default function ImageCompare({
  imageId,
  condition,
  task,
  baselineDetections,
  syntheticDetections,
  imageWidth,
  imageHeight,
}: ImageCompareProps) {
  const [showOverlays, setShowOverlays] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  const originalSrc = `/api/images/original/val/${imageId}.jpg`;
  const syntheticSrc = `/api/images/synthetic/${condition}/${imageId}.jpg`;

  const toggleBtn = (label: string, on: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        padding: "4px 10px",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        border: `1px solid ${on ? "var(--ink)" : "var(--card-brd)"}`,
        background: on ? "var(--ink)" : "transparent",
        color: on ? "var(--bg)" : "var(--meta)",
        cursor: "pointer",
        borderRadius: 0,
      }}
    >
      {label}
    </button>
  );

  const chip = (text: string, side: "left" | "right") => (
    <span
      className="absolute"
      style={{
        top: 8,
        [side]: 10,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.04em",
        padding: "2px 7px",
        background: "var(--chip-bg)",
        color: "var(--chip-fg)",
      }}
    >
      {text}
    </span>
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {toggleBtn("Overlays", showOverlays, () => setShowOverlays((v) => !v))}
        {toggleBtn("Labels", showLabels && showOverlays, () => setShowLabels((v) => !v))}
        <span className="ml-auto" style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--meta)" }}>
          {baselineDetections.length} → {syntheticDetections.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3.5">
        <div className="relative overflow-hidden bg-[#1a1a1a]" style={{ aspectRatio: "16 / 9" }}>
          <img src={originalSrc} alt="Original" className="w-full h-full object-cover block" />
          {chip("ORIGINAL", "left")}
          {chip(`${baselineDetections.length} detected`, "right")}
          {showOverlays && (
            <OverlayLayer
              detections={baselineDetections}
              task={task}
              side="baseline"
              imageWidth={imageWidth}
              imageHeight={imageHeight}
              showLabels={showLabels}
            />
          )}
        </div>
        <div className="relative overflow-hidden bg-[#1a1a1a]" style={{ aspectRatio: "16 / 9" }}>
          <img src={syntheticSrc} alt="Synthetic" className="w-full h-full object-cover block" />
          {chip(condition.toUpperCase(), "left")}
          {chip(`${syntheticDetections.length} detected`, "right")}
          {showOverlays && (
            <OverlayLayer
              detections={syntheticDetections}
              task={task}
              side="synthetic"
              imageWidth={imageWidth}
              imageHeight={imageHeight}
              showLabels={showLabels}
            />
          )}
        </div>
      </div>
    </div>
  );
}
