interface ConditionSummary {
  condition: string;
  avg_false_negative_rate: number;
  avg_confidence_drop: number;
}

interface SummaryShape {
  worst_condition?: string | null;
  worst_conf_drop?: number;
  conditions?: ConditionSummary[];
}

const FALLBACK = "Corner Case Bench — robustness report";

/**
 * Derives a one-line page headline from the summary payload.
 *
 * Rule:
 *   - If worst condition's FN rate >= 0.5  → "YOLOv8 misses N% of objects in <cond>."
 *   - Else                                  → "YOLOv8 confidence drops N% under <cond>."
 *   - If worst_condition is missing/null    → static fallback.
 *
 * Examples (use mentally to verify):
 *   { worst_condition: "dense_fog", conditions: [{ condition: "dense_fog", avg_false_negative_rate: 0.767, avg_confidence_drop: 0.032 }] }
 *     → "YOLOv8 misses 77% of objects in dense fog."
 *   { worst_condition: "strong_glare", conditions: [{ condition: "strong_glare", avg_false_negative_rate: 0.20, avg_confidence_drop: 0.119 }] }
 *     → "YOLOv8 confidence drops 12% under strong glare."
 *   { worst_condition: null }
 *     → "Corner Case Bench — robustness report"
 */
export function deriveHeadline(summary: SummaryShape | null | undefined): string {
  if (!summary || !summary.worst_condition) return FALLBACK;
  const cond = summary.conditions?.find((c) => c.condition === summary.worst_condition);
  if (!cond) return FALLBACK;
  const condText = cond.condition.replace(/_/g, " ");
  if (cond.avg_false_negative_rate >= 0.5) {
    return `YOLOv8 misses ${Math.round(cond.avg_false_negative_rate * 100)}% of objects in ${condText}.`;
  }
  return `YOLOv8 confidence drops ${Math.round(cond.avg_confidence_drop * 100)}% under ${condText}.`;
}
