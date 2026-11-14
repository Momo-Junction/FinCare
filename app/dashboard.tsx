"use client";

import { useState } from "react";
import { AttendanceChart, RegionalBars } from "./comparison-charts";
import { isBrief, pilots, type Brief } from "../lib/brief";
import { comparisons, pathway, timingGaps, type MeasuredStage, type Stage } from "../lib/pathway";
import { sources } from "../lib/screening";
import Investigation from "./investigation";
import DashboardMotion from "./dashboard-motion";
import { EvidenceCoverage, GoalThree, PilotPlanner } from "./goal-three";
import { ActionCard, DecisionBrief, PriorityView, Recommendations } from "./action-plans";
import { localPlan } from "../lib/action-plans";

const counts = new Intl.NumberFormat("en-GB");
const investigationStarters = [
  {
    stage: "screening",
    title: "Breast screening attendance",
    question: "Compare breast screening attendance across Finland. Where is the largest shortfall against the national rate, where would the most additional people attend at that rate, and what should the local teams check first? Keep the two comparisons separate.",
  },
  {
    stage: "diagnosis",
    title: "Follow-up after a positive screen",
    question: "Compare completed colonoscopy after a positive colorectal screen across Finland. Explain which areas have the largest gaps, what these figures can tell us, and how a local team could test a change and measure whether follow-up improves.",
  },
  {
    stage: "treatment",
    title: "Referral and treatment waits",
    question: "What comparable public county data does FinCare have on referral and treatment waiting times? What dates should hospitals record to find where people wait the longest?",
  },
] as const;

export default function Dashboard() {
  const [areaId, setAreaId] = useState("helsinki");
  const [stage, setStage] = useState<Stage>("screening");
  const [aiOpen, setAIOpen] = useState(false);
  const [goalPrompt, setGoalPrompt] = useState<{ question: string } | null>(null);
  return (
    <>
      <header className="app-header">
        <div className="shell flex flex-wrap items-center justify-between gap-3 py-4">
          <a href="#overview" className="inline-flex items-center gap-2 text-xl font-bold tracking-tight text-blue-950 no-underline">
            FinCare
          </a>
          <nav aria-label="Workspace" className="header-links">
            <a href="#recommendations">Recommendations</a>
            <a href="#care-pathway">Care pathway</a>
            <a href="#where-to-act">Where to act</a>
            <a href="#goal-three">Cancer outcomes</a>
            <a href="#evidence-coverage">Data coverage</a>
          </nav>
          <a className="ai-header-link" href="#fincare-ai" aria-controls="fincare-ai" aria-expanded={aiOpen} onClick={(event) => {
            event.preventDefault();
            setAIOpen(true);
          }}>Ask FinCare AI</a>
        </div>
        <DashboardMotion />
      </header>
      <main id="overview" className="shell py-7 md:py-10">
        <div className="space-y-6">
        <section className="intro" aria-labelledby="overview-title">
          <h1 id="overview-title">Cancer care equality in Finland</h1>
          <p>Explore regional differences across the cancer care pathway.</p>
        </section>
        <section className="ai-start" aria-labelledby="investigation-start-heading">
          <div className="flex items-start gap-3">
            <span className="ai-mark" aria-hidden="true">✦</span>
            <div>
              <h2 id="investigation-start-heading">Find where care could be fairer</h2>
              <p className="mt-1 text-sm text-blue-100">Use FinCare AI to compare areas, see what the data can tell you, and plan what to check next.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-2 md:grid-cols-3">
            {investigationStarters.map(({ stage: topic, title, question }) => (
              <button key={topic} type="button" className="ai-start-button" aria-controls="fincare-ai" onClick={() => {
                setStage(topic);
                setGoalPrompt({ question });
                setAIOpen(true);
              }}>
                {title}<span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
        </section>
        <DecisionBrief />
        <Recommendations />
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
            <TimingGap stage={stage} investigate={() => {
              setGoalPrompt({ question: `Explain the published ${stage} guidance for the selected area and propose actions with an owner, starting point and measures for the first 90 days.` });
              setAIOpen(true);
            }} />
          ) : (
            <Comparison key={stage} stage={stage} areaId={areaId} setAreaId={setAreaId} openAI={(question) => {
              setGoalPrompt({ question });
              setAIOpen(true);
            }} />
          )}
        </div>
        <PriorityView />
        <GoalThree investigate={(question) => {
          setGoalPrompt({ question });
          setAIOpen(true);
        }} />
        <EvidenceCoverage />
        </div>
        <Investigation areaId={areaId} setAreaId={setAreaId} stage={stage} open={aiOpen} setOpen={setAIOpen} goalPrompt={goalPrompt} />
      </main>
    </>
  );
}

function TimingGap({ stage, investigate }: { stage: keyof typeof timingGaps; investigate: () => void }) {
  const gap = timingGaps[stage];
  return (
    <section className="panel max-w-3xl space-y-4">
      <p className="text-sm font-semibold text-blue-800">Comparable regional data unavailable in FinCare</p>
      <h2>{gap.title}</h2>
      <p>{gap.context}</p>
      <div><h3>Who can act</h3><p>{gap.owner}</p></div>
      <div><h3>What to collect</h3><p>{gap.collect}</p></div>
      <div><h3>How to evaluate</h3><p>{gap.evaluate}</p></div>
      <div><h3>Published guidance</h3><p>{gap.guidance}</p></div>
      <p className="text-sm">Mentor input pending. FinCare has no confirmed notes from Kaisa Kaitila on this stage.</p>
      {stage === "treatment" && <p className="text-sm">THL’s 2016 guide, section 4.1, records an earlier working-group recommendation of six weeks from receipt of a suspected-cancer referral to first treatment. This interval starts at referral and includes diagnosis. Urgent cases may require faster care.</p>}
      <button type="button" className="secondary-button" onClick={investigate}>Explain this stage and propose actions</button>
      <p><a href="https://www.julkari.fi/items/0424a55a-f159-406f-8883-5dfdad4d6772">THL cancer care access monitoring guide</a></p>
      <p><a href={sources.strategy.url}>National Cancer Strategy, Goal 3</a></p>
      <a href={sources.roadmap.url}>{sources.roadmap.name}</a>
    </section>
  );
}

function Comparison({ stage, areaId, setAreaId, openAI }: {
  stage: MeasuredStage;
  areaId: string;
  setAreaId: (id: string) => void;
  openAI: (question: string) => void;
}) {
  const indicator = comparisons[stage];
  const { areas: regional, national } = indicator;
  const [showAll, setShowAll] = useState(false);
  const [chartPage, setChartPage] = useState(0);
  const pageSize = 6;
  const pageStart = chartPage * pageSize;
  const chartData = showAll
    ? regional.slice(pageStart, pageStart + pageSize)
    : regional.filter(({ id }, index) => id === areaId || index < 2 || index >= regional.length - 2);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const area = regional.find((candidate) => candidate.id === areaId)!;
  const pilot = brief ? pilots[brief.pilot] : null;
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
            <p className="eyebrow">{indicator.status}</p>
            <h2 id="comparison">{stage === "screening" ? "Screening Equity Explorer" : indicator.title}</h2>
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
            {stage === "screening" ? <AttendanceChart area={area} /> :
              <p>{counts.format(area.attended)} of {counts.format(area.invited)} {indicator.denominator.toLowerCase()} in {area.name} were followed by a colonoscopy.</p>}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4">
              <div><h3>Regional comparison</h3><p className="text-xs text-slate-600">{showAll ? "Ranked by rate, highest first" : "Your area, plus the two highest and two lowest rates"}</p></div>
              <button type="button" aria-controls="regional-chart" className="secondary-button" onClick={() => {
                if (!showAll) {
                  setChartPage(Math.floor(regional.findIndex(({ id }) => id === areaId) / pageSize));
                }
                setShowAll(!showAll);
              }}>{showAll ? "Back to overview" : "Browse all areas"}</button>
            </div>
            <RegionalBars id="regional-chart" rows={chartData} stage={stage} areaId={areaId} />
            {showAll && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-blue-100 pt-3">
              <button type="button" className="secondary-button" disabled={chartPage === 0} onClick={() => setChartPage(chartPage - 1)}>Previous</button>
              <p aria-live="polite" className="text-xs tabular-nums text-slate-600">{pageStart + 1}–{pageStart + chartData.length} of {regional.length} areas</p>
              <button type="button" className="secondary-button" disabled={pageStart + pageSize >= regional.length} onClick={() => setChartPage(chartPage + 1)}>Next</button>
            </div>}
            <details className="my-4">
              <summary className="cursor-pointer font-semibold">View data table</summary>
              <div className="overflow-x-auto">
                <table className="mt-2 w-full text-left text-sm">
                  <caption className="sr-only">{indicator.title}, {indicator.year}</caption>
                  <thead><tr><th scope="col">Area</th><th scope="col">{indicator.numerator}</th><th scope="col">{indicator.denominator}</th><th scope="col">Area rate</th>{stage === "diagnosis" && <th scope="col">National rate</th>}</tr></thead>
                  <tbody>
                    <tr className="font-semibold"><th scope="row">Finland overall</th><td>{counts.format(national.attended)}</td><td>{counts.format(national.invited)}</td><td>{national.rate.toFixed(1)}%</td>{stage === "diagnosis" && <td>{national.rate.toFixed(1)}%</td>}</tr>
                    {regional.map((item) => (
                      <tr key={item.id} className={item.id === areaId ? "bg-blue-50" : ""}>
                        <th scope="row">{item.name}</th><td>{counts.format(item.attended)}</td><td>{counts.format(item.invited)}</td><td>{item.rate.toFixed(1)}%</td>
                        {stage === "diagnosis" && <td>{national.rate.toFixed(1)}%</td>}
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
            <section className="panel regional-brief" aria-labelledby="brief">
              <p className="eyebrow">FinCare AI · Quick brief</p>
              <h2 id="brief">What could {area.name} do next?</h2>
              <p className="my-3 text-sm text-slate-600">Ask what might be getting in people’s way and what a local team could try.</p>
              <button className="bg-blue-800 text-white hover:bg-blue-900" type="button" disabled={pending} onClick={generateBrief}>{pending ? "Preparing suggestion…" : "Explain this indicator and propose actions"}</button>
              <div aria-live="polite" aria-busy={pending}>
                {pending && <div className="ai-loading mt-3" role="status"><span className="ai-pulse" aria-hidden="true" /> Checking the local figures and what the team could try</div>}
                {error && <p className="mt-3 text-sm text-red-800">{error}</p>}
                {brief && (
                  <div className="regional-brief-result mt-5 space-y-4 text-sm">
                    <p>{brief.interpretation}</p>
                    <div><h3>What might explain the gap</h3><p>{brief.hypothesis}</p></div>
                    <div><h3>Why try this change</h3><p>{brief.rationale}</p></div>
                    <div><h3>What the data can’t tell us</h3><p>{brief.limitation}</p></div>
                    <ul className="space-y-1">
                      {briefSources.map((source) => <li key={source.url}><a href={source.url}>{source.name}</a></li>)}
                    </ul>
                  </div>
                )}
              </div>
              <button type="button" className="secondary-button mt-3" aria-controls="fincare-ai" onClick={() => openAI(
                stage === "screening"
                  ? "Show a chart comparing breast screening attendance in the selected area with Finland. What should the local team check first?"
                  : "Explain how colorectal screening follow-up in the selected area compares with Finland. What should the local team check first?",
              )}>Ask a follow-up in chat ↗</button>
            </section>
            <ActionCard plan={brief && pilot ? {
              ...localPlan(stage, areaId),
              first30: brief.verification,
              first90: `If those checks support the change, ${pilot.action.charAt(0).toLowerCase() + pilot.action.slice(1)}`,
              measure: `${localPlan(stage, areaId).measure} ${pilot.metric}`,
            } : localPlan(stage, areaId)} />
            <PilotPlanner areaId={areaId} stage={stage} />
          </div>
        </div>
  );
}
