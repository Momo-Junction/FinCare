"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { isBrief, pilots, stagePilots, type Brief } from "../lib/brief";
import { comparisons, pathway, timingGaps, type MeasuredStage, type Stage } from "../lib/pathway";
import { sources } from "../lib/screening";
import Investigation from "./investigation";
import DashboardMotion from "./dashboard-motion";
import { EvidenceCoverage, GoalThree, PilotPlanner } from "./goal-three";

const counts = new Intl.NumberFormat("en-GB");
export default function Dashboard() {
  const [areaId, setAreaId] = useState("helsinki");
  const [stage, setStage] = useState<Stage>("screening");
  const [aiOpen, setAIOpen] = useState(false);
  const [goalPrompt, setGoalPrompt] = useState<{ question: string } | null>(null);
  return (
    <>
      <header className="app-header">
        <div className="shell flex flex-wrap items-center justify-between gap-3 py-4">
          <a href="#overview" className="text-xl font-bold tracking-tight text-blue-950 no-underline">FinCare</a>
          <nav aria-label="Workspace" className="header-links">
            <a href="#care-pathway">Care pathway</a>
            <a href="#goal-three">Cancer outcomes</a>
            <a href="#evidence-coverage">Data coverage</a>
          </nav>
          <button className="ai-header-button" type="button" aria-controls="fincare-ai" aria-expanded={aiOpen} onClick={() => setAIOpen(!aiOpen)}>✦ Ask FinCare AI</button>
        </div>
        <DashboardMotion />
      </header>
      <main id="overview" className="shell py-7 md:py-10">
        <div className="space-y-6">
        <section className="intro">
          <h1>Cancer care equality in Finland</h1>
          <p>Explore regional differences across the cancer care pathway.</p>
        </section>
        <nav id="care-pathway" data-scroll-section aria-label="Cancer care pathway" className="pathway">
          <ol className="grid grid-cols-2 gap-px sm:grid-cols-4">
            {pathway.map((step) => (
              <li key={step.id} className="relative">
                <button
                  type="button"
                  aria-current={step.id === stage ? "step" : undefined}
                  aria-controls="pathway-evidence"
                  onClick={() => setStage(step.id)}
                  className="pathway-step"
                >
                  <span className="block">{step.name}</span>
                  <span className="mt-1 block text-xs font-normal">{step.status}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <div id="pathway-evidence" key={stage} className="stage-enter">
          {stage === "referral" || stage === "treatment" ? (
            <TimingGap stage={stage} />
          ) : (
            <Comparison key={stage} stage={stage} areaId={areaId} setAreaId={setAreaId} openAI={() => setAIOpen(true)} />
          )}
        </div>
        <GoalThree investigate={(question) => {
          setGoalPrompt({ question });
          setAIOpen(true);
        }} />
        <EvidenceCoverage />
        </div>
        <Investigation areaId={areaId} stage={stage} open={aiOpen} setOpen={setAIOpen} goalPrompt={goalPrompt} />
      </main>
    </>
  );
}

function TimingGap({ stage }: { stage: keyof typeof timingGaps }) {
  const gap = timingGaps[stage];
  return (
    <section className="panel max-w-3xl space-y-4">
      <p className="text-sm font-semibold text-blue-800">Comparable regional data unavailable in FinCare</p>
      <h2>{gap.title}</h2>
      <p>{gap.context}</p>
      <div><h3>Who can act</h3><p>{gap.owner}</p></div>
      <div><h3>What to collect</h3><p>{gap.collect}</p></div>
      <div><h3>How to evaluate</h3><p>{gap.evaluate}</p></div>
      <a href={sources.roadmap.url}>{sources.roadmap.name}</a>
    </section>
  );
}

function Comparison({ stage, areaId, setAreaId, openAI }: {
  stage: MeasuredStage;
  areaId: string;
  setAreaId: (id: string) => void;
  openAI: () => void;
}) {
  const indicator = comparisons[stage];
  const { areas: regional, national } = indicator;
  const [showAll, setShowAll] = useState(false);
  const chartData = regional.filter(({ id }, index) => showAll || id === areaId || index < 3 || index >= regional.length - 3)
    .map(({ id, name, rate }) => ({ id, name, rate: Number(rate) }));
  const [brief, setBrief] = useState<Brief | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const area = regional.find((candidate) => candidate.id === areaId)!;
  const pilot = pilots[brief?.pilot ?? stagePilots[stage][0]];
  const gap = `${area.gap > 0 ? "+" : ""}${area.gap.toFixed(1)} pp`;
  const evidenceLinks = {
    regionalComparison: indicator.source,
    screeningDefinition: indicator.source,
    strategyCommunication: sources.strategy,
  };
  const briefSources = [...new Set(brief?.evidence.map((id) => evidenceLinks[id]))];

  async function generateBrief() {
    setPending(true);
    setError("");
    setBrief(null);
    try {
      const response = await fetch("/api/brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ areaId, stage }),
      });
      const result = await response.json();
      if (!response.ok || !isBrief(result)) {
        setError(result?.error || "The brief could not be loaded.");
        return;
      }
      setBrief(result);
    } catch {
      setError("The brief could not be loaded. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
          <section className="panel" aria-labelledby="comparison">
            <div className="comparison-header">
            <div>
            <p className="eyebrow">{indicator.year} · {indicator.status}</p>
            <h2 id="comparison">{indicator.title}</h2>
            </div>
            <div>
            <label className="block text-xs font-semibold text-slate-600" htmlFor="area">Reporting area</label>
            <select id="area" disabled={pending} value={areaId} onChange={(event) => {
              const selected = regional.find((candidate) => candidate.id === event.target.value);
              if (!selected) return;
              setAreaId(selected.id);
              setBrief(null);
              setError("");
            }}>
              {regional.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            </div>
            </div>
            <div aria-live="polite">
            <dl key={areaId} className="metrics metric-enter">
              <div><dt>{area.name}</dt><dd>{area.rate.toFixed(1)}%</dd></div>
              <div><dt>Finland overall</dt><dd>{national.rate.toFixed(1)}%</dd></div>
              <div><dt>Difference</dt><dd className={area.gap < 0 ? "text-rose-700" : "text-blue-800"}>{gap}</dd></div>
            </dl>
            </div>
            <p>{counts.format(area.attended)} of {counts.format(area.invited)} {indicator.denominator.toLowerCase()} in {area.name} {stage === "screening" ? "attended screening" : "were followed by a colonoscopy"}.</p>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4">
              <div><h3>Regional comparison</h3><p className="text-xs text-slate-600">{showAll ? "All reporting areas" : "Highest and lowest rates, plus your selection"}</p></div>
              <button type="button" aria-expanded={showAll} aria-controls="regional-chart" className="secondary-button" onClick={() => setShowAll(!showAll)}>{showAll ? "Show summary" : "Show all areas"}</button>
            </div>
            <div id="regional-chart" className="mt-3 min-w-0 text-xs" style={{ height: chartData.length * 29 + 38 }} aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ right: 12 }} accessibilityLayer={false}>
                  <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value) => `${value}%`} />
                  <CartesianGrid horizontal={false} stroke="#e6edf5" />
                  <YAxis type="category" dataKey="name" interval={0} width={116} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#334155" }} />
                  <ReferenceLine x={national.rate} stroke="#0f172a" strokeDasharray="4 3" />
                  <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, "Rate"]} cursor={{ fill: "#f1f5fb" }} />
                  <Bar dataKey="rate" barSize={14} radius={[0, 5, 5, 0]} isAnimationActive={false}>
                    {chartData.map((item) => <Cell key={item.id} fill={item.id === areaId ? "#1555c0" : "#a8bfea"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-600">The dashed line shows the rate for Finland overall.</p>
            <details className="my-4">
              <summary className="cursor-pointer font-semibold">View data table</summary>
              <div className="overflow-x-auto">
                <table className="mt-2 w-full text-left text-sm">
                  <caption className="sr-only">{indicator.title}, {indicator.year}</caption>
                  <thead><tr><th scope="col">Area</th><th scope="col">{indicator.numerator}</th><th scope="col">{indicator.denominator}</th><th scope="col">Rate</th></tr></thead>
                  <tbody>
                    <tr className="font-semibold"><th scope="row">National benchmark</th><td>{counts.format(national.attended)}</td><td>{counts.format(national.invited)}</td><td>{national.rate.toFixed(1)}%</td></tr>
                    {regional.map((item) => (
                      <tr key={item.id} className={item.id === areaId ? "bg-blue-50" : ""}>
                        <th scope="row">{item.name}</th><td>{counts.format(item.attended)}</td><td>{counts.format(item.invited)}</td><td>{item.rate.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <details className="evidence-note">
              <summary className="cursor-pointer font-semibold">Source and methodology</summary>
              <p className="mt-2">{indicator.definition} {indicator.coverage}</p>
              <p className="my-2">{indicator.limitation} Differences use the Registry’s rounded rates.</p>
              <a href={indicator.source.url}>{indicator.source.name}</a>
            </details>
          </section>

          <div className="grid gap-6">
            <section className="panel action-panel" aria-labelledby="brief">
              <p className="eyebrow">FinCare AI</p>
              <h2 id="brief">Investigate {area.name}</h2>
              <p className="my-3 text-sm text-slate-600">Ask what might be getting in people’s way and what a local team could try.</p>
              <button className="bg-blue-800 text-white hover:bg-blue-900" type="button" disabled={pending} onClick={generateBrief}>{pending ? "Preparing suggestion…" : "Suggest a pilot with FinCare AI"}</button>
              <div aria-live="polite" aria-busy={pending}>
                {pending && <div className="ai-loading mt-3" role="status"><span className="ai-pulse" aria-hidden="true" /> Preparing a pilot from regional evidence</div>}
                {error && <p className="mt-3 text-sm text-red-800">{error}</p>}
                {brief && (
                  <div className="mt-5 space-y-4 text-sm">
                    <p>{brief.interpretation}</p>
                    <div><h3>Hypothesis to test</h3><p>{brief.hypothesis}</p></div>
                    <div><h3>Check locally</h3><p>{brief.verification}</p></div>
                    <div><h3>Why this pilot</h3><p>{brief.rationale}</p></div>
                    <div><h3>Evidence limit</h3><p>{brief.limitation}</p></div>
                    <ul className="space-y-1">
                      {briefSources.map((source) => <li key={source.url}><a href={source.url}>{source.name}</a></li>)}
                    </ul>
                  </div>
                )}
              </div>
              <button type="button" className="secondary-button mt-3" onClick={openAI}>Open AI workspace →</button>
            </section>
            <section className="panel">
              <h2>What a local team could try</h2>
              <h3 className="mt-3">{pilot.title}</h3>
              <p className="mt-1">{area.gap >= 0 ? "Consider a targeted pilot if local checks identify a specific attendance barrier. " : ""}{pilot.action}</p>
              <h3 className="mt-3">Measure success</h3>
              <p className="mt-1">{pilot.metric}</p>
              <p className="mt-3"><a href={sources.strategy.url}>{sources.strategy.name}</a></p>
            </section>
            <PilotPlanner areaId={areaId} stage={stage} />
            <section className="panel">
              <h2>What Finland needs to measure</h2>
              <dl className="mt-3 space-y-3 text-sm">
                {stage === "screening" ? (
                  <div><dt className="font-semibold">Invitation delivery and booking</dt><dd>Record delivery, rescheduling and reasons for missed appointments to investigate participation gaps.</dd></div>
                ) : (
                  <div><dt className="font-semibold">Diagnostic follow-up and outcomes</dt><dd>Record positive result, referral, completed examination, alternative tests and confirmed diagnosis dates. Include cases still open.</dd></div>
                )}
              </dl>
              <p className="mt-3 text-sm">Publish comparable counts and missingness by area.</p>
              <p className="mt-3 text-sm"><a href={sources.roadmap.url}>{sources.roadmap.name}</a></p>
            </section>
          </div>
        </div>
  );
}
