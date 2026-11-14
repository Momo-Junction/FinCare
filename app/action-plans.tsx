import { localPlan, nationalPlan, rankedGaps, type ActionPlan } from "../lib/action-plans";
import { comparisons } from "../lib/pathway";

export function ActionCard({ plan }: { plan: ActionPlan }) {
  return <section className="panel space-y-3">
    <h3>{plan.title}</h3>
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      {[
        ["Owner", plan.owner], ["First 30 days", plan.first30], ["By day 90", plan.first90],
        ["Starting point", plan.baseline], ["How to judge success", plan.measure],
        ["Data needed", plan.data], ["Risks and unknowns", plan.risks],
      ].map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd>{value}</dd></div>)}
    </dl>
    <a className="text-sm" href={plan.source.url}>{plan.source.name}</a>
  </section>;
}

export function DecisionBrief() {
  const plan = localPlan("screening", "helsinki");
  const helsinki = rankedGaps("screening").find(({ id }) => id === "helsinki")!;
  return <section className="panel space-y-3">
    <p className="eyebrow">Two-minute decision brief · 2024</p>
    <h2>Start by checking Helsinki’s screening invitations</h2>
    <p>{helsinki.rate}% attended breast screening in Helsinki, compared with {comparisons.screening.national.rate}% nationally. At the national rate, about <strong>{helsinki.fewerAtNationalRate.toLocaleString("en-GB")} more people</strong> would have attended from the same group.</p>
    <ol className="list-decimal space-y-1 pl-5 text-sm">
      <li>Check which invitations were sent, returned or never sent.</li>
      <li>Ask people what got in their way and check screening outside the programme where records allow.</li>
      <li>Test the change that addresses what the team finds.</li>
    </ol>
    <p className="text-sm"><strong>How to tell if it helped.</strong> Compare attendance with a group receiving usual care over the same period.</p>
    <a className="text-sm" href={plan.source.url}>{plan.source.name}</a>
  </section>;
}

export function PriorityView() {
  return <section id="where-to-act" className="space-y-4">
    <h2>Where to act first</h2>
    <p className="text-sm">Areas below the national rate are ordered by the size of the gap within each measure. The count estimates how many more people would have attended at the national rate using the same group size.</p>
    <div className="grid gap-4 lg:grid-cols-2">
      {(["screening", "diagnosis"] as const).map((stage) => <details key={stage} open className="panel">
        <summary className="cursor-pointer font-semibold">{comparisons[stage].title}</summary>
        <div className="overflow-x-auto">
          <table className="mt-3 w-full text-left text-sm">
            <thead><tr><th scope="col">Area</th><th scope="col">Gap (percentage points)</th><th scope="col">More at national rate</th></tr></thead>
            <tbody>{rankedGaps(stage).map((area) => <tr key={area.id}><th scope="row">{area.name}</th><td>{Math.abs(area.gap).toFixed(1)}</td><td>{area.fewerAtNationalRate.toLocaleString("en-GB")}</td></tr>)}</tbody>
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
