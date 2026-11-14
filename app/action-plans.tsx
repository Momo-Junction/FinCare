import { localPlan, nationalPlan, rankedGaps, screeningReminderStudy, colonoscopyNavigationStudy, type ActionPlan } from "../lib/action-plans";
import { comparisons } from "../lib/pathway";

export function ActionCard({ plan }: { plan: ActionPlan }) {
  return <section className="panel space-y-4">
    <h3>{plan.title}</h3>
    <p className="text-sm text-slate-600">{plan.owner}</p>
    <ol className="space-y-3 border-l-2 border-blue-200 pl-4 text-sm">
      {[
        ["First 30 days", plan.first30],
        ["By day 90", plan.first90],
        ["How to judge success", plan.measure],
      ].map(([label, value]) => <li key={label} className="relative before:absolute before:top-1.5 before:-left-[22px] before:size-2.5 before:rounded-full before:bg-blue-600 before:ring-4 before:ring-white">
        <h4 className="font-semibold text-blue-950">{label}</h4><p className="mt-1">{value}</p>
      </li>)}
    </ol>
    <details className="evidence-note">
      <summary className="cursor-pointer font-semibold">Starting figures, data and risks</summary>
      <dl className="mt-3 grid gap-3">
        {[["Starting point", plan.baseline], ["Data needed", plan.data], ["Risks and unknowns", plan.risks]]
          .map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd>{value}</dd></div>)}
      </dl>
    </details>
    <a className="text-sm" href={plan.source.url}>{plan.source.name}</a>
  </section>;
}

export function DecisionBrief() {
  const plan = localPlan("screening", "helsinki");
  const helsinki = rankedGaps("screening").find(({ id }) => id === "helsinki")!;
  const { year, national, limitation } = comparisons.screening;
  return <section className="panel border-t-4 border-t-blue-600" aria-labelledby="decision-brief-title">
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <div>
        <p className="eyebrow">Breast screening · {year}</p>
        <h2 id="decision-brief-title">Helsinki’s breast screening gap</h2>
        <dl className="my-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-blue-50 p-3">
            <dt className="text-xs font-medium">Helsinki</dt>
            <dd className="text-2xl font-semibold tabular-nums text-blue-950">{helsinki.rate.toFixed(1)}%</dd>
          </div>
          <div className="col-span-2 rounded-xl bg-blue-50 p-3 sm:col-span-1">
            <dt className="text-xs font-medium">Below Finland’s rate</dt>
            <dd className="text-2xl font-semibold tabular-nums text-blue-950">{Math.abs(helsinki.gap).toFixed(1)} <span className="text-sm">pp</span></dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs font-medium">Finland overall</dt>
            <dd className="text-2xl font-semibold tabular-nums">{national.rate.toFixed(1)}%</dd>
          </div>
        </dl>
        <p className="text-sm">At Finland’s rate, about <strong>{helsinki.fewerAtNationalRate.toLocaleString("en-GB")} more people</strong> would have attended from the same group.</p>
        <p className="my-2 text-xs text-slate-600">{limitation}</p>
        <a className="text-xs" href={plan.source.url}>{plan.source.name}</a>
      </div>
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <h3>Check whether invitations were sent</h3>
        <p className="mt-2 text-sm">The Helsinki screening lead and invitation provider can compare the invitation list with records of what was sent and returned.</p>
        <h3 className="mt-3 text-sm">How to tell whether a change helps</h3>
        <p className="mt-1 text-sm">If the team tests a change, compare attendance with the usual process over the same period.</p>
        <a className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold" href="#recommendations">See the recommendations <span aria-hidden="true" className="ml-1">↓</span></a>
      </div>
    </div>
  </section>;
}

export function Recommendations() {
  const cards = [
    {
      title: "Check whether Helsinki’s invitations were sent",
      action: "Match the invitation list to dispatch and return records before choosing a change.",
      owner: "Helsinki screening lead and invitation provider",
      evidence: "The Registry counts people selected for invitation and notes that some invitations may go unsent. This audit tests whether that explains part of the local gap.",
      metric: "Share of invitees with a recorded dispatch status, and share whose invitations were unsent or returned.",
      source: comparisons.screening.source,
    },
    {
      title: "Test a text reminder where missed appointments are common",
      action: "If the audit finds missed appointments after invitations were sent, compare a text reminder with the usual invitation process.",
      owner: "Helsinki screening provider",
      evidence: "A UK randomised trial found that text reminders increased attendance at first routine breast screening appointments. Helsinki would measure its own results.",
      metric: "Share attending within the same follow-up period in each group. Also track who could receive a text.",
      source: screeningReminderStudy,
    },
    {
      title: "Help people arrange colonoscopy after a positive test",
      action: "In Kymenlaakso, check why follow-up is missed. If booking is a barrier, test a call that helps people arrange the exam.",
      owner: "Kymenlaakso screening lead and hospital endoscopy team",
      evidence: "A US randomised trial found that help arranging care increased colonoscopy completion after an abnormal stool test.",
      metric: "Share completing colonoscopy within the same follow-up period, compared with usual care. Track alternative exams separately.",
      source: colonoscopyNavigationStudy,
    },
  ];
  return <section id="recommendations" className="space-y-3 scroll-mt-32">
    <h2>What local teams can do</h2>
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map(({ title, action, owner, evidence, metric, source }) => <article key={title} className="panel flex flex-col gap-3 border-t-4 border-t-blue-600">
        <h3>{title}</h3>
        <p className="text-sm">{action}</p>
        <dl className="space-y-2 text-sm">
          <div><dt className="font-semibold">Who leads</dt><dd>{owner}</dd></div>
          <div><dt className="font-semibold">What to measure</dt><dd>{metric}</dd></div>
        </dl>
        <details className="evidence-note mt-auto">
          <summary className="cursor-pointer font-semibold">Research behind it</summary>
          <p className="my-2">{evidence}</p>
          <a href={source.url}>{source.name}</a>
        </details>
      </article>)}
    </div>
  </section>;
}

export function PriorityView() {
  return <section id="where-to-act" data-scroll-section className="space-y-4">
    <h2>Where to act first</h2>
    <p className="text-sm">Areas below the national rate are ordered by the size of the gap within each measure. The count estimates how many more people would have attended at the national rate using the same group size.</p>
    <div className="grid gap-4 lg:grid-cols-2">
      {(["screening", "diagnosis"] as const).map((stage) => <details key={stage} className="panel">
        <summary className="cursor-pointer font-semibold">{comparisons[stage].title}</summary>
        <div className="overflow-x-auto">
          <table className="mt-3 w-full text-left text-sm">
            <thead><tr><th scope="col">Area</th><th scope="col">Area rate</th><th scope="col">National rate</th><th scope="col">Gap (pp)</th><th scope="col">More at national rate</th></tr></thead>
            <tbody>{rankedGaps(stage).map((area) => <tr key={area.id}><th scope="row">{area.name}</th><td>{area.rate.toFixed(1)}%</td><td>{comparisons[stage].national.rate.toFixed(1)}%</td><td>{Math.abs(area.gap).toFixed(1)}</td><td>{area.fewerAtNationalRate.toLocaleString("en-GB")}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="mt-2 text-xs">2024 · {comparisons[stage].limitation}</p>
        <a className="text-sm" href={comparisons[stage].source.url}>{comparisons[stage].source.name}</a>
      </details>)}
    </div>
    <ActionCard plan={nationalPlan} />
    <section className="panel space-y-2">
      <h3>Next 90 days with a county and Helsinki</h3>
      <p className="text-sm">Invite the City of Helsinki screening lead, its screening provider and HUS to review aggregate invitation and follow-up figures. Invite Lapland’s cancer lead and hospital analysts to test the same care-date definitions for lung cancer. At day 30, agree what can be shared and record the starting figures. At day 90, review the trial results and decide whether to continue.</p>
    </section>
  </section>;
}
