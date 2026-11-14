import { evidenceFor, pilots, stagePilots } from "./brief.ts";
import { comparisons, timingGaps, type MeasuredStage } from "./pathway.ts";
import { areas, sources } from "./screening.ts";
import { lungOutcomes, outcomeCoverage, outcomeMetrics, outcomePeriod, type OutcomeMetric } from "./lung-outcomes.ts";

export type EvidenceLink = { name: string; url: string };
export type Step = { title: string; details: string[]; sources: EvidenceLink[] };
const areaIds = areas.map(({ id }) => id);
const measured = ["screening", "diagnosis"] as const;
const stages = ["screening", "referral", "diagnosis", "treatment"] as const;
const areaInput = { type: "string", enum: areaIds };
const stageInput = { type: "string", enum: measured };
const pilotInput = { type: "string", enum: Object.keys(pilots) };

function tool(name: string, description: string, properties: object, required: string[]) {
  return { name, description, input_schema: { type: "object", properties, required, additionalProperties: false } };
}

export const investigationTools = [
  tool("compare_lung_outcomes", "Compare lung cancer incidence, five-year relative survival or mortality across all reporting areas or up to six selected areas. Use for Goal 3 and lung cancer outcome questions.", {
    sex: { type: "string", enum: ["women", "men"] },
    metric: { type: "string", enum: Object.keys(outcomeMetrics) },
    areaIds: { type: "array", items: areaInput, minItems: 1, maxItems: 6 },
  }, ["sex", "metric"]),
  tool("get_region_data", "Get verified breast screening and colorectal diagnostic follow-up statistics for one area. Omit stage for both.", { areaId: areaInput, stage: stageInput }, ["areaId"]),
  tool("compare_regions", "Compare named areas to each other and the national benchmark for one indicator. Omit areaIds for the full ranking, including the largest gaps.", {
    stage: stageInput, areaIds: { type: "array", items: areaInput, minItems: 1, maxItems: 6 },
  }, ["stage"]),
  tool("analyze_care_pathway", "Review evidence across the four stages, missing timing intervals, and the Goal 3 lung cancer mortality comparison.", { areaId: areaInput }, ["areaId"]),
  tool("design_intervention_pilot", "Build an evaluation proposal after inspecting evidence. Choose reminder or booking for screening, navigation or handoff for diagnostic follow-up.", {
    areaId: areaInput, stage: stageInput, pilot: pilotInput,
  }, ["areaId", "stage", "pilot"]),
];

export function isAreaId(value: unknown): value is string {
  return areaIds.some((id) => id === value);
}

export function isStage(value: unknown): value is (typeof stages)[number] {
  return stages.some((stage) => stage === value);
}

function isMeasured(value: unknown): value is MeasuredStage {
  return measured.some((stage) => stage === value);
}

function compare(stage: MeasuredStage, ids?: string[]): Step {
  const comparison = comparisons[stage];
  const rows = comparison.areas.filter(({ id }) => !ids || ids.includes(id));
  return {
    title: comparison.title,
    details: [
      `${comparison.year} · ${comparison.coverage}`,
      comparison.definition,
      `National benchmark: ${comparison.national.rate.toFixed(1)}% (${comparison.national.attended.toLocaleString("en-GB")} of ${comparison.national.invited.toLocaleString("en-GB")}).`,
      ...rows.map(({ name, attended, invited, rate, gap }) =>
        `${name}: ${rate.toFixed(1)}% (${attended.toLocaleString("en-GB")} of ${invited.toLocaleString("en-GB")}); ${gap > 0 ? "+" : ""}${gap.toFixed(1)} percentage points versus benchmark.`),
      comparison.limitation,
    ],
    sources: [comparison.source],
  };
}

export function runInvestigationTool(name: string, input: unknown): Step[] {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Expected an input object.");
  const args = input as Record<string, unknown>;
  const allowed = investigationTools.find((candidate) => candidate.name === name);
  if (!allowed || Object.keys(args).some((key) => !Object.hasOwn(allowed.input_schema.properties, key))) {
    throw new Error("Unsupported tool or argument.");
  }
  const { areaId, areaIds: ids, stage, pilot } = args;
  if (name === "compare_lung_outcomes") {
    const { sex, metric } = args;
    if ((sex !== "women" && sex !== "men") || typeof metric !== "string" || !Object.hasOwn(outcomeMetrics, metric)
      || (ids !== undefined && (!Array.isArray(ids) || !ids.length || ids.length > 6 || !ids.every(isAreaId)))) {
      throw new Error("Choose a population, a valid outcome and valid reporting areas.");
    }
    const data = lungOutcomes(sex, metric as OutcomeMetric);
    return [{
      title: `Lung cancer · ${data.label} in ${sex}`,
      details: [
        `${outcomePeriod} · ${data.unit}. ${data.definition} ${outcomeCoverage}`,
        `Finland: ${data.benchmark.toFixed(1)}${data.nationalInterval ? ` (95% CI ${data.nationalInterval.join("–")})` : ""}`,
        ...data.rows.filter(({ id }) => !ids || ids.includes(id)).map(({ name, value, interval }) =>
          `${name}: ${value.toFixed(1)}${interval ? ` (95% CI ${interval.join("–")})` : ""}`),
        "Descriptive comparisons cannot establish the cause or location of a delay.",
      ],
      sources: [data.source, sources.strategy],
    }];
  }
  if (name === "compare_regions") {
    if (!isMeasured(stage) || (ids !== undefined && (!Array.isArray(ids) || !ids.length || ids.length > 6 || !ids.every(isAreaId) || new Set(ids).size !== ids.length))) {
      throw new Error("Choose a measured stage and valid, distinct reporting areas.");
    }
    return [compare(stage, ids)];
  }
  if (!isAreaId(areaId)) throw new Error("Choose a valid reporting area.");
  if (name === "get_region_data") {
    if (stage === undefined) return measured.map((item) => compare(item, [areaId]));
    if (!isMeasured(stage)) throw new Error("Choose screening or diagnostic follow-up.");
    return [compare(stage, [areaId])];
  }
  if (name === "analyze_care_pathway") {
    return [
      compare("screening", [areaId]),
      { title: "Referral timing", details: [timingGaps.referral.context, timingGaps.referral.collect], sources: [sources.roadmap] },
      compare("diagnosis", [areaId]),
      { title: "Treatment timing", details: [timingGaps.treatment.context, timingGaps.treatment.collect], sources: [sources.roadmap] },
      ...runInvestigationTool("compare_lung_outcomes", { sex: "men", metric: "mortality", areaIds: [areaId] }),
    ];
  }
  const pilotId = isMeasured(stage) ? stagePilots[stage].find((id) => id === pilot) : undefined;
  if (!isMeasured(stage) || !pilotId) throw new Error("Choose a pilot that matches the measured stage.");
  const proposal = pilots[pilotId];
  const evidence = evidenceFor(areaId, stage);
  return [{
    title: proposal.title,
    details: [
      `Objective: improve ${stage === "screening" ? "equitable screening attendance" : "equitable diagnostic follow-up"}.`,
      `Target population: ${stage === "screening" ? "people invited to breast screening" : "people with a positive colorectal screening result"} in ${evidence.regionalComparison.area?.name}.`,
      `Proposed action: ${proposal.action}`,
      `Evaluation: ${proposal.metric} Where counts allow, compare the change in participation or follow-up gaps between relevant groups, and report missing data.`,
      `Limitations: Check the suspected barrier locally before starting. ${evidence.screeningDefinition.limitation}`,
    ],
    sources: [evidence.regionalComparison.source, sources.strategy],
  }];
}
