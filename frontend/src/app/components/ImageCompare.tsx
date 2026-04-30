"use client";

import { useState, useRef } from "react";

interface ImageCompareProps {
  imageId: string;
  condition: string;
}

export default function ImageCompare({ imageId, condition }: ImageCompareProps) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const originalSrc = `/api/images/original/val/${imageId}.jpg`;
  const syntheticSrc = `/api/images/synthetic/${condition}/${imageId}.jpg`;

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  };

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) handleMove(e.clientX);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  return (
    <div className="glass-card p-4">
      <div className="flex justify-between mb-3">
        <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
          Original
        </span>
        <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
          {condition.replace(/_/g, " ")}
        </span>
      </div>
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-xl cursor-col-resize select-none"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
      >
        <img
          src={syntheticSrc}
          alt="Synthetic"
          className="w-full h-auto block"
          draggable={false}
        />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPos}%` }}
        >
          <img
            src={originalSrc}
            alt="Original"
            className="h-full object-cover"
            style={{ width: containerRef.current ? `${containerRef.current.offsetWidth}px` : "100%" }}
            draggable={false}
          />
        </div>
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white z-20"
          style={{ left: `${sliderPos}%`, boxShadow: "0 0 8px rgba(255,255,255,0.5)" }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M5 3L2 8L5 13" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M11 3L14 8L11 13" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
