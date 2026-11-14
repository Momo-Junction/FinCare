import { comparisons, type MeasuredStage } from "./pathway.ts";
import { sources } from "./screening.ts";

export type ActionPlan = {
  title: string;
  owner: string;
  first30: string;
  first90: string;
  measure: string;
  baseline: string;
  data: string;
  risks: string;
  source: { name: string; url: string };
};

export const screeningReminderStudy = {
  name: "Randomised trial of breast screening text reminders",
  url: "https://pubmed.ncbi.nlm.nih.gov/25668008/",
};

export const colonoscopyNavigationStudy = {
  name: "Randomised trial of help arranging follow-up colonoscopy",
  url: "https://pubmed.ncbi.nlm.nih.gov/40163863/",
};

export function localPlan(stage: MeasuredStage, areaId: string): ActionPlan {
  const comparison = comparisons[stage];
  const area = comparison.areas.find(({ id }) => id === areaId)!;
  const screening = stage === "screening";
  return {
    title: screening ? "Check whether invitations arrive" : "Find out why follow-up is missed",
    owner: screening ? `${area.name} screening lead and invitation provider` : `${area.name} screening lead and hospital endoscopy team`,
    first30: screening ? "Match invitation records to dispatch logs. Separate unsent, returned and unconfirmed invitations." : "Review positive tests and record whether people completed colonoscopy, had another exam, are waiting or declined.",
    first90: screening ? "If delivery is the problem, fix the sending process. If appointments are the problem, test easier booking. Test language support only if the audit finds a need." : "If the handoff is the problem, give each positive result a named follow-up owner. If booking is the problem, test a call that helps people book.",
    baseline: `2024: ${area.rate.toFixed(1)}% locally, ${comparison.national.rate.toFixed(1)}% nationally. Measure the current local rate before starting.`,
    measure: "Proposed success threshold: close at least half of any measured local gap against usual practice, within the same follow-up window. If there is no measured gap, agree a local target before running a trial.",
    data: screening ? "Invitation dispatch, returns, attendance, booking changes and aggregate counts of screening outside the programme where available." : "Positive test date, referral receipt, booked exam, completion, alternative exam and reasons for non-completion.",
    risks: screening ? "An invitation sent is not proof of delivery. Private screening and reasons for declining may be hard to count." : "Other exams and clinical exclusions can change the denominator. Review them before comparing providers.",
    source: comparison.source,
  };
}

export const nationalPlan: ActionPlan = {
  title: "Record the same care dates across Finland",
  owner: "Proposed leads: THL and Finnish Cancer Registry, with FICAN, HUS and participating counties.",
  first30: "Agree definitions for referral receipt, first specialist assessment, confirmed diagnosis and first treatment. Map them to THL’s existing reporting guidance.",
  first90: "Test aggregate reporting with two willing providers. Compare how they handle urgent referrals, transfers, cancelled care and patients still waiting.",
  baseline: "FinCare has no comparable regional waiting-time series. Measure date completeness in each pilot site first.",
  measure: "Proposed threshold: at least 95% of eligible records have the required dates or a documented reason for an open or excluded case.",
  data: "Aggregate counts, median waits, the wait exceeded by the slowest 10%, and missing dates, split by cancer site and urgency.",
  risks: "Different case definitions can distort comparisons. Use the same rules and suppress small cells before sharing totals.",
  source: sources.roadmap,
};

export const laplandOptions = [
  { title: "Review referral handoffs", rule: "If referrals frequently wait before first review or come back incomplete, test a shared checklist and a named reviewer.", measure: "Track the wait to first review and the share returned." },
  { title: "Reserve faster diagnostic appointments", rule: "If the longest wait is between specialist review and imaging or biopsy, test reserved appointments for patients who meet clinical criteria.", measure: "Track days to confirmed diagnosis and waits for patients outside the trial." },
  { title: "Review upcoming treatment starts", rule: "If delays cluster after the treatment decision, test a weekly review of patients awaiting a first appointment.", measure: "Track days from treatment decision to start and the share still waiting." },
];

export function rankedGaps(stage: MeasuredStage) {
  const { areas, national } = comparisons[stage];
  return areas.filter(({ gap }) => gap < 0).map((area) => ({
    ...area,
    fewerAtNationalRate: Math.max(0, Math.round(area.invited * national.attended / national.invited) - area.attended),
  })).sort((left, right) => left.gap - right.gap || right.fewerAtNationalRate - left.fewerAtNationalRate);
}
