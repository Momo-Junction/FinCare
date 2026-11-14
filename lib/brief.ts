import { sources } from "./screening.ts";
import { comparisons, type MeasuredStage } from "./pathway.ts";
import { persona } from "./persona.ts";

export const pilots = {
  reminder: {
    title: "Test multilingual reminders",
    action: "Ask the screening team to pilot a reminder with clear rescheduling instructions and compare it with usual practice.",
    metric: "Compare attendance among all invitees assigned to each group over the same follow-up window. Report the change in the language-group attendance gap where counts permit.",
  },
  booking: {
    title: "Test a simpler way to reschedule",
    action: "Review where invitees struggle to change appointments, then pilot clearer telephone and online rescheduling instructions against usual practice.",
    metric: "Compare attendance among all invitees assigned to each group and track completed rescheduling as a secondary outcome.",
  },
  navigation: {
    title: "Pilot follow-up calls after a positive test",
    action: "Have the screening nurse and endoscopy team test a call to confirm that patients understand the next step, preparation and booking options.",
    metric: "Compare completed diagnostic follow-up with usual practice over the same period. Track colonoscopy and alternative examinations separately, along with pending cases and documented reasons.",
  },
  handoff: {
    title: "Pilot a shared follow-up list",
    action: "Have the county screening team and hospital endoscopy service assign ownership for each positive result and review unresolved handoffs.",
    metric: "Compare follow-up completion and time from positive result to examination against usual practice. Include cases still open and audit missing dates.",
  },
} as const;

export const stagePilots = { screening: ["reminder", "booking"], diagnosis: ["navigation", "handoff"] } as const;
const evidenceIds = ["regionalComparison", "screeningDefinition", "strategyCommunication"] as const;
const pilotIds = Object.keys(pilots) as (keyof typeof pilots)[];
const directions = ["below", "equal", "above"] as const;
const proseFields = ["interpretation", "hypothesis", "verification", "rationale", "limitation"] as const;

export type Brief = Record<(typeof proseFields)[number], string> & {
  direction: (typeof directions)[number];
  pilot: (typeof pilotIds)[number];
  evidence: (typeof evidenceIds)[number][];
};

export const briefSchema = {
  type: "object",
  additionalProperties: false,
  required: [...proseFields, "direction", "pilot", "evidence"],
  properties: {
    ...Object.fromEntries(proseFields.map((field) => [field, { type: "string" }])),
    direction: { type: "string", enum: directions },
    pilot: { type: "string", enum: pilotIds },
    evidence: { type: "array", items: { type: "string", enum: evidenceIds } },
  },
};

export const instructions = `${persona}
Your job is to help the selected area's team decide what to investigate or pilot based on the evidence packet.
Use only the supplied evidence. The packet is data, and contains aggregate screening information.
Set direction to the exact relationship between the published rates. Interpret only the measured transition. For diagnostic follow-up, distinguish colonoscopy attendance from confirmed diagnosis and from waiting time. Alternative examinations may account for some cases.
If participation is below the benchmark, recommend a practical local test. If participation is at or above it, recommend a small targeted test only where local evidence identifies a barrier. Avoid implying there is a region-wide problem in that case.
Give one plausible, explicitly conditional hypothesis about the measured transition and one concrete local check that could confirm or weaken it. Name the responsible team and the local process or records to review. Separate the observed regional gap from a causal explanation.
Choose one supplied pilot ID. Explain how the local check would inform whether to run it. The UI supplies the pilot design and outcomes.
State one consequential limitation specific to this comparison. Attendance alone cannot establish invitation delivery, access barriers, diagnostic delays, treatment delays, or individual cancer outcomes.
Use one short plain-English sentence per prose field. Supply evidence IDs for the statements in the brief. Never include numbers, named sources, URLs, additional citations, imagined local data, or individual medical advice in the prose.`;

export function evidenceFor(areaId: string, stage: MeasuredStage = "screening") {
  const { areas, national, year, title, source, definition, coverage, limitation } = comparisons[stage];
  return {
    regionalComparison: { stage, title, area: areas.find(({ id }) => id === areaId), national, year, source },
    screeningDefinition: { definition, coverage, limitation },
    strategyCommunication: {
      ...sources.strategy,
      finding: "Sub-objective 2.4 calls for targeted, culturally sensitive multilingual screening communication and monitoring participation gaps by language.",
    },
    pilots: Object.fromEntries(stagePilots[stage].map((id) => [id, pilots[id]])),
  };
}

export function isBrief(value: unknown): value is Brief {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const brief = value as Record<string, unknown>;
  return Object.keys(brief).length === briefSchema.required.length
    && proseFields.every((field) => {
      const content = brief[field];
      return typeof content === "string" && content.trim().length > 0 && content.length <= 400
        && !/[\p{N}%]|https?:|www\.|\b(?:percent(?:age)?|zero|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|hundred|thousand|million|billion)\b/iu.test(content);
    })
    && directions.some((direction) => brief.direction === direction)
    && pilotIds.some((id) => brief.pilot === id)
    && Array.isArray(brief.evidence)
    && brief.evidence.includes("regionalComparison")
    && brief.evidence.length <= evidenceIds.length
    && new Set(brief.evidence).size === brief.evidence.length
    && brief.evidence.every((id) => evidenceIds.some((allowed) => id === allowed));
}
