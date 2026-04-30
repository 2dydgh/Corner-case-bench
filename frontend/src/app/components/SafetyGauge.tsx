"use client";

import { motion } from "framer-motion";

interface SafetyGaugeProps {
  score: number; // 0-100, higher = safer
  label: string;
}

export default function SafetyGauge({ score, label }: SafetyGaugeProps) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = () => {
    if (score >= 70) return { stroke: "var(--success)", glow: "var(--success-glow)" };
    if (score >= 40) return { stroke: "var(--warning)", glow: "var(--warning-glow)" };
    return { stroke: "var(--danger)", glow: "var(--danger-glow)" };
  };

  const getGrade = () => {
    if (score >= 80) return "SAFE";
    if (score >= 60) return "MODERATE";
    if (score >= 40) return "AT RISK";
    return "CRITICAL";
  };

  const color = getColor();

  return (
    <div className="glass-card p-6 flex flex-col items-center">
      <div className="relative w-44 h-44">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
          <circle
            cx="80" cy="80" r={radius}
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth="8"
          />
          <motion.circle
            cx="80" cy="80" r={radius}
            fill="none"
            stroke={color.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 6px ${color.glow})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-3xl font-bold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {score}
          </motion.span>
          <span className="text-xs text-[var(--text-muted)] mt-1">{getGrade()}</span>
        </div>
      </div>
      <span className="text-sm text-[var(--text-secondary)] mt-3">{label}</span>
    </div>
  );
}
