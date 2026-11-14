import { areas } from "./screening.ts";

export const screeningChartTypes = ["attendance", "regional"] as const;
export type ScreeningChartSpec = { type: (typeof screeningChartTypes)[number]; areaIds: string[] };

export function isScreeningChartSpec(value: unknown): value is ScreeningChartSpec {
  if (!value || typeof value !== "object") return false;
  const spec = value as Partial<ScreeningChartSpec>;
  return Object.keys(spec).every((key) => key === "type" || key === "areaIds")
    && (spec.type === "attendance" || spec.type === "regional")
    && Array.isArray(spec.areaIds) && spec.areaIds.length >= 1
    && spec.areaIds.length <= (spec.type === "attendance" ? 1 : 6)
    && new Set(spec.areaIds).size === spec.areaIds.length
    && spec.areaIds.every((id) => areas.some((area) => area.id === id));
}
