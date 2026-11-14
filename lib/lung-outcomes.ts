import { areas } from "./screening.ts";

// Registry tables 15.12 and 15.13: incidence, five-year relative survival,
// mortality, and lower/upper 95% confidence limits for mortality.
type Values = readonly [number, number, number, number, number];
type Sex = "women" | "men";
const rows = {
  "east-uusimaa": { women: [41.2, 32.6, 34.6, 28.6, 41.9], men: [63.9, 17.3, 51.1, 42.9, 61.0] },
  "central-uusimaa": { women: [38.4, 31.1, 25.4, 21.5, 29.9], men: [59.6, 15.8, 46.9, 40.9, 53.7] },
  "west-uusimaa": { women: [35.6, 26.9, 27.0, 24.3, 30.1], men: [61.0, 13.7, 51.0, 46.7, 55.8] },
  "vantaa-kerava": { women: [44.6, 34.4, 30.3, 26.4, 34.9], men: [58.3, 19.6, 49.3, 43.2, 56.2] },
  "paijat-hame": { women: [38.8, 24.8, 27.2, 23.7, 31.3], men: [62.3, 18.1, 50.0, 44.6, 56.0] },
  "kymenlaakso": { women: [36.0, 20.4, 28.3, 24.4, 32.8], men: [70.2, 16.4, 55.6, 49.4, 62.5] },
  "south-karelia": { women: [30.6, 29.6, 21.1, 17.2, 25.9], men: [56.5, 16.4, 48.7, 42.2, 56.2] },
  "helsinki": { women: [42.0, 32.9, 27.7, 25.3, 30.3], men: [62.3, 16.4, 51.9, 47.9, 56.2] },
  "south-savo": { women: [29.1, 21.2, 21.1, 17.4, 25.5], men: [64.8, 14.5, 51.1, 44.9, 58.2] },
  "north-savo": { women: [26.3, 25.5, 16.9, 14.3, 19.9], men: [54.5, 20.7, 42.6, 38.1, 47.7] },
  "north-karelia": { women: [29.2, 27.1, 21.1, 17.7, 25.3], men: [63.4, 12.1, 54.4, 48.3, 61.4] },
  "central-finland": { women: [26.6, 29.6, 18.5, 15.8, 21.7], men: [53.5, 23.0, 42.6, 38.1, 47.7] },
  "kanta-hame": { women: [37.5, 28.1, 26.6, 22.7, 31.2], men: [63.0, 19.4, 51.2, 45.2, 57.9] },
  "pirkanmaa": { women: [32.5, 25.8, 22.4, 20.2, 24.9], men: [58.4, 17.7, 43.4, 39.9, 47.2] },
  "south-ostrobothnia": { women: [32.2, 37.1, 19.4, 16.3, 23.2], men: [61.7, 16.9, 48.4, 42.9, 54.5] },
  "southwest-finland": { women: [36.3, 27.4, 24.3, 22.0, 26.9], men: [64.2, 16.9, 50.9, 47.1, 55.1] },
  "satakunta": { women: [34.1, 18.6, 24.4, 21.1, 28.2], men: [66.7, 10.6, 55.6, 50.1, 61.7] },
  "ostrobothnia": { women: [32.8, 26.9, 20.4, 16.8, 24.7], men: [63.0, 17.7, 49.9, 43.9, 56.8] },
  "central-ostrobothnia": { women: [30.3, 32.9, 23.5, 17.8, 31.1], men: [53.8, 25.0, 37.8, 29.7, 48.1] },
  "north-ostrobothnia": { women: [36.2, 25.3, 27.8, 24.9, 31.1], men: [64.0, 16.9, 51.9, 47.5, 56.7] },
  "kainuu": { women: [31.3, 25.7, 25.6, 20.0, 32.8], men: [65.3, 14.9, 58.1, 49.0, 68.7] },
  "lapland": { women: [42.6, 21.8, 32.4, 28.2, 37.4], men: [77.3, 13.7, 64.1, 57.6, 71.3] },
  "finland": { women: [35.2, 27.1, 24.7, 24.0, 25.5], men: [62.1, 16.7, 50.1, 48.9, 51.3] },
} satisfies Record<(typeof areas)[number]["id"] | "finland", Record<Sex, Values>>;

export const outcomeMetrics = {
  incidence: { label: "Incidence", unit: "new cases per 100,000 person-years", definition: "Age-standardised to Finland’s 2014 population.", index: 0 },
  survival: { label: "Five-year relative survival", unit: "%", definition: "Survival relative to the expected survival of the general population, age-standardised to the national patient age distribution.", index: 1 },
  mortality: { label: "Mortality", unit: "deaths per 100,000 person-years", definition: "Age-standardised to Finland’s 2014 population.", index: 2 },
} as const;

export type OutcomeMetric = keyof typeof outcomeMetrics;
export const outcomeCoverage = "All 21 wellbeing services counties and Helsinki. Åland has no separate row in these tables. Finland uses the published national rate.";
export const outcomePeriod = "2020–2024";

export function lungOutcomes(sex: Sex, metric: OutcomeMetric) {
  const metadata = outcomeMetrics[metric];
  const benchmark = rows.finland[sex][metadata.index];
  const direction = metric === "survival" ? 1 : -1;
  return {
    ...metadata, benchmark,
    nationalInterval: metric === "mortality" ? rows.finland[sex].slice(3) : null,
    source: {
      name: `Finnish Cancer Registry · Cancer in Finland 2024, table ${sex === "women" ? "15.12" : "15.13"}`,
      url: "https://syoparekisteri.fi/assets/themes/ssy3/factsheets/cancer_in_finland_2024.html",
    },
    rows: areas.map(({ id, name }) => ({
      id, name, value: rows[id][sex][metadata.index],
      interval: metric === "mortality" ? rows[id][sex].slice(3) : null,
    })).sort((left, right) => direction * (left.value - right.value) || left.name.localeCompare(right.name)),
  };
}
