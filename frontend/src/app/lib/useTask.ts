"use client";

import { useEffect, useState } from "react";

export type Task = "seg" | "det";

const STORAGE_KEY = "cc:task";
const EVENT = "cc:task-change";

function readTask(): Task {
  if (typeof window === "undefined") return "seg";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "det" ? "det" : "seg";
}

export function useTask(): [Task, (next: Task) => void] {
  const [task, setTaskState] = useState<Task>("seg");

  useEffect(() => {
    setTaskState(readTask());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<Task>).detail;
      if (detail === "seg" || detail === "det") setTaskState(detail);
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const setTask = (next: Task) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new CustomEvent<Task>(EVENT, { detail: next }));
    setTaskState(next);
  };

  return [task, setTask];
}
