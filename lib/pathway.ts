import { areas, indicator, national, sources } from "./screening.ts";

// Finnish Cancer Registry, 2024 county table: test positives, colonoscopies, published rate.
const followUp = [
  ["central-finland", 669, 506, 75.6],
  ["central-ostrobothnia", 168, 125, 74.4],
  ["central-uusimaa", 567, 398, 70.2],
  ["helsinki", 1284, 870, 67.8],
  ["east-uusimaa", 261, 171, 65.5],
  ["kainuu", 280, 182, 65.0],
  ["kanta-hame", 544, 406, 74.6],
  ["kymenlaakso", 496, 308, 62.1],
  ["lapland", 571, 415, 72.7],
  ["north-karelia", 425, 338, 79.5],
  ["north-ostrobothnia", 953, 701, 73.6],
  ["north-savo", 739, 513, 69.4],
  ["ostrobothnia", 418, 308, 73.7],
  ["pirkanmaa", 1236, 868, 70.2],
  ["paijat-hame", 565, 402, 71.2],
  ["satakunta", 693, 499, 72.0],
  ["south-karelia", 375, 284, 75.7],
  ["south-ostrobothnia", 588, 481, 81.8],
  ["south-savo", 441, 339, 76.9],
  ["southwest-finland", 1260, 984, 78.1],
  ["vantaa-kerava", 604, 441, 73.0],
  ["west-uusimaa", 946, 705, 74.5],
] as const;

const areaNames = new Map(areas.map(({ id, name }) => [id, name]));
const colonoscopyNational = { invited: 14083, attended: 10244, rate: 72.7 };

export const comparisons = {
  screening: {
    ...indicator,
    title: "Breast screening participation",
    source: sources.registry,
    numerator: "Attended screening",
    denominator: "Recorded invitees",
    limitation: indicator.denominatorNote,
    areas,
    national,
  },
  diagnosis: {
    ...indicator,
    title: "Colonoscopy after a positive colorectal screen",
    source: {
      name: "Finnish Cancer Registry · Colorectal screening annual statistics",
      url: "https://stats.cancerregistry.fi/joukkistilastot/colorectal.html",
    },
    definition: "Recorded colonoscopies divided by people with a positive colorectal screening test.",
    numerator: "Attended colonoscopy",
    denominator: "Positive screening tests",
    limitation: "This screening follow-up measure excludes alternative CT colonography. It does not show time to diagnosis or whether cancer was confirmed.",
    areas: followUp.map(([id, invited, attended, rate]) => ({
      id, name: areaNames.get(id)!, invited, attended, rate,
      gap: Number((rate - colonoscopyNational.rate).toFixed(1)),
    })).sort((left, right) => right.rate - left.rate || left.name.localeCompare(right.name)),
    national: colonoscopyNational,
  },
} as const;

export type MeasuredStage = keyof typeof comparisons;
export type Stage = MeasuredStage | "referral" | "treatment";

export const pathway = [
  { id: "screening", name: "Screening", status: "Public participation data" },
  { id: "referral", name: "Referral", status: "Guidance and data gaps" },
  { id: "diagnosis", name: "Diagnosis", status: "Public follow-up data" },
  { id: "treatment", name: "Treatment", status: "Targets and data gaps" },
] as const satisfies ReadonlyArray<{ id: Stage; name: string; status: string }>;

export const timingGaps = {
  referral: {
    title: "Time to first specialist assessment",
    context: "FinCare has no comparable county-level waiting-time series for suspected-cancer referrals.",
    guidance: "Roadmap action 2.5.2 calls for standard referral criteria by cancer type. THL’s monitoring guide defines referral receipt and first specialist contact.",
    owner: "County referral teams and hospital intake teams",
    collect: "Record suspected-cancer referral receipt, urgency, first specialist assessment, and open or redirected referrals.",
    evaluate: "Audit timestamp completeness by hospital, then compare median and upper-percentile waits and the share of referrals still open, by urgency and cancer site.",
  },
  treatment: {
    title: "Time from diagnosis to first treatment",
    context: "FinCare has no comparable county-level series of elapsed time from confirmed diagnosis to first treatment.",
    guidance: "Goal 3 calls for care within established target times. Roadmap action 3.1.2 calls for cancer-specific access times for five cancers in 2026–2028.",
    owner: "Hospital cancer services with county analytics teams",
    collect: "Record confirmed diagnosis, treatment decision and first treatment dates. Capture active surveillance, declined treatment and patients still waiting.",
    evaluate: "Audit timestamp completeness, then compare diagnosis-to-treatment intervals and the share still waiting by cancer site and treatment intent.",
  },
} as const;
