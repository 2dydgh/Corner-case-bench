"use client";

import { tokens } from "../lib/tokens";

interface Detection {
  class: string;
  bbox: [number, number, number, number];
  confidence: number;
  polygons?: number[][][];
  missed?: boolean;
}

interface OverlayLayerProps {
  detections: Detection[];
  task: "seg" | "det";
  side: "baseline" | "synthetic";
  imageWidth: number;
  imageHeight: number;
  showLabels?: boolean;
}

export default function OverlayLayer({
  detections,
  task,
  side,
  imageWidth,
  imageHeight,
  showLabels = true,
}: OverlayLayerProps) {
  const stroke = side === "baseline" ? tokens.colors.baselineOverlay : tokens.colors.signalBar;
  const fill = side === "baseline" ? "rgba(192,192,192,0.12)" : "rgba(255,233,107,0.18)";
  const labelBg = stroke;
  const labelFg = side === "baseline" ? tokens.colors.ink : tokens.colors.signal;

  return (
    <>
      {task === "seg" && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`0 0 ${imageWidth} ${imageHeight}`}
          preserveAspectRatio="none"
        >
          {detections.flatMap((det, i) =>
            (det.polygons ?? []).map((poly, j) => (
              <polygon
                key={`p-${i}-${j}`}
                points={poly.map(([x, y]) => `${x},${y}`).join(" ")}
                fill={fill}
                stroke={stroke}
                strokeWidth={2}
                strokeDasharray={det.missed ? "4 3" : undefined}
                opacity={det.missed ? 0.4 : 1}
                vectorEffect="non-scaling-stroke"
              />
            ))
          )}
        </svg>
      )}

      {detections.map((det, i) => {
        const [x1, y1, x2, y2] = det.bbox;
        const left = `${(x1 / imageWidth) * 100}%`;
        const top = `${(y1 / imageHeight) * 100}%`;
        const width = `${((x2 - x1) / imageWidth) * 100}%`;
        const height = `${((y2 - y1) / imageHeight) * 100}%`;
        const opacity = det.missed ? 0.4 : 1;
        return (
          <div
            key={`b-${i}`}
            className="absolute pointer-events-none"
            style={{ left, top, width, height, opacity }}
          >
            {task === "det" && (
              <div
                className="absolute inset-0"
                style={{
                  border: `2px ${det.missed ? "dashed" : "solid"} ${stroke}`,
                  background: fill,
                }}
              />
            )}
            {showLabels && (
              <span
                className="absolute -top-4 left-0"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  padding: "1px 5px",
                  background: labelBg,
                  color: labelFg,
                  whiteSpace: "nowrap",
                }}
              >
                {det.missed ? "missed" : `${det.class} ${(det.confidence * 100).toFixed(0)}%`}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}
