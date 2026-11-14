"use client";

import { useState } from "react";
import { pilotScenario } from "../lib/goal-three";
import { comparisons, timingGaps, type MeasuredStage } from "../lib/pathway";
import { lungOutcomes, outcomeCoverage, outcomeMetrics, outcomePeriod, type OutcomeMetric } from "../lib/lung-outcomes";
import { sources } from "../lib/screening";
import { laplandOptions } from "../lib/action-plans";

export function GoalThree({ investigate }: { investigate: (question: string) => void }) {
  const [sex, setSex] = useState<"women" | "men">("men");
  const [metric, setMetric] = useState<OutcomeMetric>("mortality");
  const [expanded, setExpanded] = useState(false);
  const data = lungOutcomes(sex, metric);
  const displayed = expanded ? data.rows : data.rows.slice(0, 5);
  return (
    <section className="panel" id="goal-three" data-scroll-section aria-labelledby="goal-three-title">
      <p className="eyebrow">National Cancer Strategy · Goal 3</p>
      <h2 id="goal-three-title">Lung cancer across Finland</h2>
      <p className="mt-2 text-sm text-slate-600">{outcomePeriod} · {data.unit}. {data.definition} {outcomeCoverage}</p>
      <div className="mt-3 grid max-w-lg grid-cols-2 gap-3 text-sm">
        <label>Population<select value={sex} onChange={(event) => setSex(event.target.value as typeof sex)}><option value="men">Men</option><option value="women">Women</option></select></label>
        <label>Indicator<select value={metric} onChange={(event) => setMetric(event.target.value as OutcomeMetric)}>
          {Object.entries(outcomeMetrics).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
        </select></label>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{data.label} in {sex}, {outcomePeriod}</caption>
          <thead><tr><th scope="col">Area</th><th scope="col">{data.label}</th>{metric === "mortality" && <th scope="col">95% confidence interval</th>}<th scope="col">Difference from Finland {metric === "survival" && "(pp)"}</th></tr></thead>
          <tbody>
            <tr className="bg-blue-50"><th scope="row">Finland</th><td>{data.benchmark.toFixed(1)}</td>{data.nationalInterval && <td>{data.nationalInterval.map((value) => value.toFixed(1)).join("–")}</td>}<td>Benchmark</td></tr>
            {displayed.map(({ id, name, value, interval }) => (
              <tr key={id}><th scope="row">{name}</th><td>{value.toFixed(1)}</td>{interval && <td>{interval.map((value) => value.toFixed(1)).join("–")}</td>}<td>{value > data.benchmark ? "+" : ""}{(value - data.benchmark).toFixed(1)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" aria-expanded={expanded} className="secondary-button mt-3" onClick={() => setExpanded(!expanded)}>{expanded ? "Show five highest values" : "Show all 22 reporting areas"}</button>
      <p className="evidence-note my-4">These are descriptive comparisons. The ranges shown for mortality describe uncertainty. Incidence, survival and mortality reflect different aspects of cancer burden and cannot establish the cause or location of a pathway delay.</p>
      <h3>Proposed next step for Lapland</h3>
      <p className="mt-1 text-sm">Ask the county cancer lead and hospital analytics team to audit lung cancer stage at diagnosis, referral and treatment timestamps, and missing records. Compare like cohorts with a peer county before choosing an intervention.</p>
      <p className="mt-2 text-sm"><strong>First 30 days.</strong> Establish the starting wait and missing-date rate at each step. <strong>By day 90.</strong> Test one change where the audit finds the clearest delay.</p>
      <div className="my-3 grid gap-3 md:grid-cols-3">
        {laplandOptions.map(({ title, rule, measure }) => <article className="evidence-note" key={title}><h3>{title}</h3><p>{rule}</p><p className="mt-2">{measure} Compare with the starting figures before expanding.</p></article>)}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <button type="button" className="secondary-button" onClick={() => investigate(
          `Compare lung cancer ${data.label.toLowerCase()} in ${sex} across Finland. What do the regional differences show, and what should a county audit before choosing an intervention?`,
        )}>Investigate this indicator with FinCare AI</button>
        <a href={data.source.url}>{data.source.name}</a>
        <a href={sources.strategy.url}>National Cancer Strategy, Figure 1</a>
      </div>
    </section>
  );
}

export function EvidenceCoverage() {
  return (
    <section className="panel" id="evidence-coverage" data-scroll-section aria-labelledby="coverage-heading">
      <h2 id="coverage-heading">What Finland can compare today</h2>
      <p className="mt-2 text-sm">Headline figures last checked against Registry tables on 14 November 2026. The reporting periods are shown below.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr><th scope="col">Evidence</th><th scope="col">Reporting period</th><th scope="col">Regional coverage</th></tr></thead>
          <tbody>
            {Object.values(comparisons).map((item) => <tr key={item.title}><th scope="row"><a href={item.source.url}>{item.title}</a></th><td>{item.year}</td><td>{item.areas.length} areas · Åland excluded</td></tr>)}
            <tr><th scope="row"><a href="#goal-three">Lung cancer incidence, survival and mortality</a></th><td>{outcomePeriod}</td><td>{lungOutcomes("men", "mortality").rows.length} areas · Åland not separately reported</td></tr>
            {Object.values(timingGaps).map((gap) => <tr key={gap.title}><th scope="row">{gap.title}</th><td>Unavailable</td><td>Comparable regional series missing in FinCare</td></tr>)}
            <tr><th scope="row">Time to confirmed diagnosis</th><td>Unavailable</td><td>Follow-up attendance is available. Diagnosis intervals are missing in FinCare.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function PilotPlanner({ areaId, stage }: { areaId: string; stage: MeasuredStage }) {
  const [share, setShare] = useState(50);
  const { areas, national } = comparisons[stage];
  const area = areas.find(({ id }) => id === areaId)!;
  const fullGap = Math.max(0, 100 * (national.attended / national.invited - area.attended / area.invited));
  const increase = fullGap * share / 100;
  const { baseline, target, additional } = pilotScenario(area.invited, area.attended, increase);
  const event = stage === "screening" ? "screening attendees" : "recorded colonoscopies";

  return (
    <details className="panel">
      <summary className="cursor-pointer font-semibold">Plan a pilot target</summary>
      <div className="mt-3 space-y-3 text-sm">
        <p>What would an improvement mean at {area.name}’s 2024 cohort size?</p>
        {fullGap > 0 ? <>
          <label htmlFor="pilot-gain" className="block font-medium">Share of the gap closed · {share}%</label>
          <input id="pilot-gain" className="w-full accent-blue-700" type="range" min="0" max="100" step="5" value={share} onChange={(event) => setShare(Number(event.target.value))} />
          <p>Range for this group: 0 to {pilotScenario(area.invited, area.attended, fullGap).additional.toLocaleString("en-GB")} additional {event}.</p>
        </> : <p>This area already meets or exceeds the national rate.</p>}
        <p className="rounded-lg bg-blue-50 p-3" aria-live="polite"><strong>{baseline.toFixed(1)}% → {target.toFixed(1)}%</strong><br />About <strong>{additional.toLocaleString("en-GB")}</strong> additional {event} with the same cohort size.</p>
        <p className="text-slate-600">Planning scenario. The improvement is an assumption, and the 2024 cohort comes from the Registry. Evaluate the pilot against usual practice and report whether gaps narrow in relevant groups.</p>
      </div>
    </details>
  );
}
