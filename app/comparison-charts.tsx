"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { comparisons, type MeasuredStage } from "../lib/pathway";
import { isScreeningChartSpec, type ScreeningChartSpec } from "../lib/screening-chart";

const counts = new Intl.NumberFormat("en-GB");
type Area = (typeof comparisons)[MeasuredStage]["areas"][number];

function ChartSource({ stage }: { stage: MeasuredStage }) {
  const { source, year, denominator, limitation } = comparisons[stage];
  return <figcaption className="mt-2 space-y-1 text-xs text-slate-600">
    <p><a href={source.url}>{source.name}</a> · {year}</p>
    <p>{stage === "screening" ? "The rate uses everyone selected for invitation." : `The rate uses all ${denominator.toLowerCase()}.`} {limitation}</p>
  </figcaption>;
}

export function AttendanceChart({ area }: { area: Area }) {
  const slices = [
    { name: "Attended", value: area.attended, color: "#1555c0" },
    { name: "No attendance recorded", value: area.invited - area.attended, color: "#c6daf6" },
  ];
  return <figure className="my-4 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
    <h3 className="text-sm">{area.name} screening attendance</h3>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div key={area.id} className="comparison-donut relative size-28">
        <PieChart width={112} height={112} accessibilityLayer={false}>
          <Pie data={slices} dataKey="value" innerRadius={36} outerRadius={51} startAngle={90} endAngle={-270} isAnimationActive={false}>
            {slices.map(({ name, color }) => <Cell key={name} fill={color} />)}
          </Pie>
          <Tooltip formatter={(value) => counts.format(Number(value))} />
        </PieChart>
        <span className="pointer-events-none absolute inset-0 grid place-items-center font-semibold text-blue-950">{area.rate.toFixed(1)}%</span>
      </div>
      <ul className="space-y-1 text-xs">
        {slices.map(({ name, value, color }) => <li key={name} className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span>{name} <strong>{counts.format(value)}</strong></span>
        </li>)}
        <li>Selected for invitation <strong>{counts.format(area.invited)}</strong></li>
      </ul>
    </div>
    <ChartSource stage="screening" />
  </figure>;
}

export function RegionalBars({ rows, stage, areaId, id }: { rows: readonly Area[]; stage: MeasuredStage; areaId?: string; id?: string }) {
  const indicator = comparisons[stage];
  return <figure id={id} className="mt-3 min-w-0">
    <div key={`${areaId ?? ""}:${rows.map(({ id }) => id).join(",")}`} className="comparison-bars text-xs" style={{ height: rows.length * 32 + 38 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={[...rows]} layout="vertical" margin={{ right: 14 }}>
          <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value) => `${value}%`} />
          <CartesianGrid horizontal={false} stroke="#e6edf5" />
          <YAxis type="category" dataKey="name" interval={0} width={116} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#334155" }} />
          <ReferenceLine x={indicator.national.rate} stroke="#0f172a" strokeDasharray="4 3" />
          <Tooltip cursor={{ fill: "#f1f5fb" }} content={({ active, payload }) => {
            const row: Area | undefined = payload?.[0]?.payload;
            if (!active || !row) return null;
            return <div className="space-y-1 rounded-lg border border-blue-100 bg-white p-3 shadow-sm">
              <strong>{row.name} · {row.rate.toFixed(1)}%</strong>
              <p>{indicator.numerator}: {counts.format(row.attended)} of {counts.format(row.invited)} {indicator.denominator.toLowerCase()}</p>
              <p>{row.gap > 0 ? "+" : ""}{row.gap.toFixed(1)} percentage points vs Finland</p>
            </div>;
          }} />
          <Bar dataKey="rate" name={indicator.title} barSize={16} radius={[0, 5, 5, 0]} isAnimationActive={false}>
            {rows.map((row) => <Cell key={row.id} fill={row.id === areaId ? "#1555c0" : "#8baee6"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
    <p className="text-xs text-slate-600">Dashed line · Finland {indicator.national.rate.toFixed(1)}%</p>
    <ChartSource stage={stage} />
  </figure>;
}

export function ScreeningChart({ spec }: { spec: ScreeningChartSpec }) {
  if (!isScreeningChartSpec(spec)) return null;
  const rows = comparisons.screening.areas.filter(({ id }) => spec.areaIds.includes(id));
  if (spec.type === "attendance") return <AttendanceChart area={rows[0]} />;
  return <section className="rounded-xl border border-blue-100 bg-white p-3">
    <h3 className="text-sm">Breast screening attendance by area</h3>
    <RegionalBars rows={rows} stage="screening" />
    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {rows.map(({ id, name, rate }) => <li key={id}>{name} <strong>{rate.toFixed(1)}%</strong></li>)}
    </ul>
  </section>;
}
