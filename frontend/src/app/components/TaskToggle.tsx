"use client";

import { useTask, type Task } from "../lib/useTask";

const OPTIONS: { value: Task; label: string }[] = [
  { value: "det", label: "DET" },
  { value: "seg", label: "SEG" },
];

export default function TaskToggle() {
  const [task, setTask] = useTask();
  return (
    <div
      style={{
        display: "inline-flex",
        background: "var(--divider)",
        borderRadius: "var(--radius-pill)",
        padding: 3,
        gap: 2,
      }}
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === task;
        return (
          <button
            key={opt.value}
            onClick={() => setTask(opt.value)}
            aria-pressed={active}
            style={{
              padding: "3px 12px",
              fontSize: 11,
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              letterSpacing: "0.04em",
              border: "none",
              borderRadius: "var(--radius-pill)",
              background: active ? "var(--card)" : "transparent",
              color: active ? "var(--accent)" : "var(--meta)",
              cursor: "pointer",
              boxShadow: active ? "var(--shadow-sm)" : "none",
              transition: "background 150ms ease, color 150ms ease, box-shadow 150ms ease",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
