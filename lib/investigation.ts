import { evidenceFor, pilots, stagePilots } from "./brief.ts";
import { comparisons, timingGaps, type MeasuredStage } from "./pathway.ts";
import { areas, sources } from "./screening.ts";
import { lungOutcomes, outcomeCoverage, outcomeMetrics, outcomePeriod, type OutcomeMetric } from "./lung-outcomes.ts";
import { rankedGaps, localPlan, screeningReminderStudy, colonoscopyNavigationStudy } from "./action-plans.ts";
import { isScreeningChartSpec, screeningChartTypes, type ScreeningChartSpec } from "./screening-chart.ts";
import { pilotScenario } from "./goal-three.ts";

export type EvidenceLink = { name: string; url: string };
export type Step = {
  title: string;
  details: string[];
  sources: EvidenceLink[];
  localComparison?: { areaId: string; stage: MeasuredStage };
  regionalComparison?: { areaIds: string[]; stage: MeasuredStage };
  chart?: ScreeningChartSpec;
};
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
  tool("calculate", "Calculate a difference, ratio, or percentage from user-provided numbers or verified tool results. Use a as the numerator or first operand and b as the denominator or second operand.", {
    operation: { type: "string", enum: ["difference", "ratio", "percentage"] },
    a: { type: "number" }, b: { type: "number" },
  }, ["operation", "a", "b"]),
  tool("check_waiting_time_evidence", "Check available evidence and THL recording guidance for referral or treatment waits. This tool does not return measured county waiting times.", {
    stage: { type: "string", enum: ["referral", "treatment"] },
  }, ["stage"]),
  tool("show_screening_chart", "Show a breast screening chart when requested or useful. Use attendance for one area's split and regional for comparisons of up to six areas. Supply only area IDs and the chart type.", {
    type: { type: "string", enum: screeningChartTypes },
    areaIds: { type: "array", items: areaInput, minItems: 1, maxItems: 6 },
  }, ["type", "areaIds"]),
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

const thlGuide = {
  name: "THL · Follow-up of access to cancer care",
  url: "https://www.julkari.fi/items/b5e1578d-c380-466a-b8a7-8506b6181612",
};

function waitingTimeEvidence(stage: keyof typeof timingGaps): Step {
  const gap = timingGaps[stage];
  return {
    title: gap.title,
    details: [gap.context, gap.guidance, `Who can act: ${gap.owner}.`, gap.collect, gap.evaluate],
    sources: [thlGuide, sources.roadmap, sources.strategy],
  };
}

function compare(stage: MeasuredStage, ids?: string[]): Step {
  const comparison = comparisons[stage];
  const rows = comparison.areas.filter(({ id }) => !ids || ids.includes(id));
  const gaps = ids ? [] : rankedGaps(stage);
  const largestRateGap = gaps[0];
  const largestCountGap = gaps.reduce<(typeof gaps)[number] | undefined>((largest, area) =>
    !largest || area.fewerAtNationalRate > largest.fewerAtNationalRate ? area : largest, undefined);
  return {
    title: comparison.title,
    localComparison: ids?.length === 1 ? { areaId: ids[0], stage } : undefined,
    regionalComparison: { areaIds: rows.map(({ id }) => id), stage },
    details: [
      `${comparison.year} · ${comparison.coverage}`,
      comparison.definition,
      `National benchmark: ${comparison.national.rate.toFixed(1)}% (${comparison.national.attended.toLocaleString("en-GB")} of ${comparison.national.invited.toLocaleString("en-GB")}).`,
      ...(largestRateGap ? [`Largest shortfall versus national rate: ${largestRateGap.name} (${Math.abs(largestRateGap.gap).toFixed(1)} percentage points).`] : []),
      ...(largestCountGap ? [`Largest estimated additional count at the national rate: ${largestCountGap.name} (about ${largestCountGap.fewerAtNationalRate.toLocaleString("en-GB")} in the same cohort). This is a comparison scenario.`] : []),
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
  if (name === "calculate") {
    const { a, b, operation } = args;
    if (typeof a !== "number" || typeof b !== "number" || !Number.isFinite(a) || !Number.isFinite(b)
      || (operation !== "difference" && operation !== "ratio" && operation !== "percentage")
      || (operation !== "difference" && b === 0)) throw new Error("Use finite numbers and a non-zero divisor.");
    const result = operation === "difference" ? a - b : operation === "ratio" ? a / b : (a / b) * 100;
    if (!Number.isFinite(result)) throw new Error("The result is outside the supported range.");
    const value = new Intl.NumberFormat("en-GB", { maximumSignificantDigits: 12 }).format(result);
    return [{ title: "Calculation", details: [`${operation} of ${a} and ${b}: ${value}${operation === "percentage" ? "%" : ""}`], sources: [] }];
  }
  if (name === "check_waiting_time_evidence") {
    if (stage !== "referral" && stage !== "treatment") throw new Error("Choose referral or treatment.");
    return [waitingTimeEvidence(stage)];
  }
  if (name === "show_screening_chart") {
    if (!isScreeningChartSpec(args)) throw new Error("Choose a chart type and valid reporting areas.");
    return [{ ...compare("screening", args.areaIds), chart: args }];
  }
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
      { ...waitingTimeEvidence("referral"), title: "Referral timing" },
      compare("diagnosis", [areaId]),
      { ...waitingTimeEvidence("treatment"), title: "Treatment timing" },
      ...runInvestigationTool("compare_lung_outcomes", { sex: "men", metric: "mortality", areaIds: [areaId] }),
    ];
  }
  const pilotId = isMeasured(stage) ? stagePilots[stage].find((id) => id === pilot) : undefined;
  if (!isMeasured(stage) || !pilotId) throw new Error("Choose a pilot that matches the measured stage.");
  const proposal = pilots[pilotId];
  const evidence = evidenceFor(areaId, stage);
  const area = evidence.regionalComparison.area!;
  const national = evidence.regionalComparison.national;
  const halfGap = Math.max(0, 50 * (national.attended / national.invited - area.attended / area.invited));
  const scenario = pilotScenario(area.invited, area.attended, halfGap);
  const plan = localPlan(stage, areaId);
  return [{
    title: proposal.title,
    localComparison: { areaId, stage },
    details: [
      `Objective: improve ${stage === "screening" ? "equitable screening attendance" : "equitable diagnostic follow-up"}.`,
      `Target population: ${stage === "screening" ? "people invited to breast screening" : "people with a positive colorectal screening result"} in ${evidence.regionalComparison.area?.name}.`,
      `Who can act: ${plan.owner}.`,
      `What to check first: ${plan.first30}`,
      `Proposed action: ${proposal.action}`,
      `Evaluation: ${proposal.metric} Where counts allow, compare the change in participation or follow-up gaps between relevant groups, and report missing data.`,
      halfGap > 0
        ? `Planning example at the published group size: closing half the gap would move the rate from ${scenario.baseline.toFixed(1)}% to ${scenario.target.toFixed(1)}%, about ${scenario.additional} additional completions. This is a proposed target, not a prediction or a measured result.`
        : "The area meets Finland’s rate. Set a local target only if the team finds a specific barrier.",
      `Limitations: Check the suspected barrier locally before starting. ${evidence.screeningDefinition.limitation}`,
    ],
    sources: [evidence.regionalComparison.source, sources.strategy,
      ...(pilotId === "reminder" ? [screeningReminderStudy] : pilotId === "navigation" ? [colonoscopyNavigationStudy] : [])],
  }];
}
