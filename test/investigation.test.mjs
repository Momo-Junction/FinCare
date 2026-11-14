import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "../app/api/investigate/route.ts";
import { runInvestigationTool } from "../lib/investigation.ts";
import { pilotScenario } from "../lib/goal-three.ts";
import { rankedGaps } from "../lib/action-plans.ts";

test("priority tables rank each measure independently and use the national counts for estimates", () => {
  const [helsinki] = rankedGaps("screening");
  assert.equal(helsinki.id, "helsinki");
  assert.equal(helsinki.fewerAtNationalRate, Math.round(38630 * 281369 / 344851) - 28686);
  const [followUp] = rankedGaps("diagnosis");
  assert.equal(followUp.id, "kymenlaakso");
  assert.equal(followUp.fewerAtNationalRate, Math.round(496 * 10244 / 14083) - 308);
});
import { lungOutcomes, outcomeMetrics } from "../lib/lung-outcomes.ts";

test("lung outcome series cover all reporting areas with published benchmarks", () => {
  for (const sex of ["women", "men"]) {
    for (const metric of Object.keys(outcomeMetrics)) {
      const data = lungOutcomes(sex, metric);
      assert.equal(data.rows.length, 22);
      assert.equal(new Set(data.rows.map(({ id }) => id)).size, 22);
      assert.ok(data.rows.every(({ value, interval }) => Number.isFinite(value)
        && (!interval || interval[0] <= value && value <= interval[1])));
    }
  }
  const [comparison] = runInvestigationTool("compare_lung_outcomes", {
    sex: "women", metric: "mortality", areaIds: ["lapland"],
  });
  assert.ok(comparison.details.some((row) => row.startsWith("Lapland: 32.4")));
  assert.ok(comparison.details.some((row) => row.startsWith("Finland: 24.7")));
  assert.throws(() => runInvestigationTool("compare_lung_outcomes", { sex: "women", metric: "invalid" }));
});

test("pilot scenario uses cohort counts and caps completion at the cohort size", () => {
  assert.equal(pilotScenario(38630, 28686, 3).additional, 1159);
  assert.equal(pilotScenario(38630, 28686, 0).additional, 0);
  assert.deepEqual(pilotScenario(100, 98, 10), { baseline: 98, target: 100, additional: 2 });
});

test("tools return verified comparisons and stage-specific evidence", () => {
  const [comparison] = runInvestigationTool("compare_regions", {
    stage: "screening", areaIds: ["helsinki", "north-ostrobothnia"],
  });
  assert.ok(comparison.details.some((row) => row.includes("Helsinki: 74.3%")));
  assert.ok(comparison.details.some((row) => row.includes("North Ostrobothnia: 85.6%")));
  assert.equal(runInvestigationTool("get_region_data", { areaId: "helsinki" }).length, 2);
  const pathway = runInvestigationTool("analyze_care_pathway", { areaId: "helsinki" });
  assert.equal(pathway.length, 5);
  assert.ok(pathway[4].details.some((row) => row.startsWith("Helsinki: 51.9")));
  assert.match(pathway[1].details[0], /no comparable/);
  assert.match(pathway[3].details[0], /no comparable/);
  assert.throws(() => runInvestigationTool("get_region_data", { areaId: "invalid" }));
  assert.throws(() => runInvestigationTool("design_intervention_pilot", {
    areaId: "helsinki", stage: "diagnosis", pilot: "reminder",
  }));
});

test("agent uses prior context, executes sequential tool calls and preserves verified evidence on fallback", async (t) => {
  const key = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  t.after(() => {
    if (key === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = key;
  });
  const request = (history = [
    { role: "user", content: "How is the selected area doing?", areaId: "helsinki", stage: "screening" },
    { role: "assistant", content: "Attendance is below the benchmark in Helsinki." },
    { role: "user", content: "What could they pilot?" },
  ]) => new Request("http://localhost/api/investigate", {
    method: "POST",
    body: JSON.stringify({ areaId: "north-ostrobothnia", stage: "referral", history }),
  });
  assert.equal((await POST(request([]))).status, 400);
  assert.equal((await POST(request())).status, 503);

  process.env.ANTHROPIC_API_KEY = "test-key";
  const toolUse = (id, name, input) => ({
    stop_reason: "tool_use", content: [{ type: "tool_use", id, name, input }],
  });
  const regionCall = toolUse("toolu_a", "get_region_data", { areaId: "helsinki", stage: "screening" });
  const pilotCall = toolUse("toolu_b", "design_intervention_pilot", { areaId: "helsinki", stage: "screening", pilot: "reminder" });
  const finish = (text) => ({ stop_reason: "end_turn", content: [{ type: "text", text }] });
  let replies = [regionCall, pilotCall, finish("Check invitation access before piloting reminders.")];
  const mock = t.mock.method(globalThis, "fetch", async () => Response.json(replies.shift()));
  const result = await (await POST(request())).json();
  assert.equal(result.answer, "Check invitation access before piloting reminders.");
  assert.equal(result.steps.length, 2);
  const payload = (index) => JSON.parse(mock.mock.calls[index].arguments[1].body);
  assert.match(payload(0).messages[0].content, /helsinki, screening/);
  assert.match(payload(0).system, /north-ostrobothnia/);
  assert.match(payload(1).messages.at(-1).content[0].content, /74.3%/);
  assert.match(payload(2).messages.at(-1).content[0].content, /Target population/);

  replies = [regionCall, finish("Attendance improved by 8%.")];
  const fallback = await (await POST(request())).json();
  assert.match(fallback.answer, /Helsinki: 74\.3%/);
  assert.doesNotMatch(fallback.answer, /improved by 8%/);
  assert.equal(fallback.steps.length, 1);

  replies = [{
    stop_reason: "end_turn",
    content: [
      { type: "web_search_tool_result", content: [{ type: "web_search_result", url: "https://thl.fi/en/", title: "THL" }] },
      { type: "text", text: "THL published an update in 2026.", citations: [{ type: "web_search_result_location", url: "https://thl.fi/en/" }] },
    ],
  }];
  const current = await (await POST(request())).json();
  assert.equal(current.answer, undefined);
  assert.equal(current.steps.length, 0);
  assert.ok(payload(mock.mock.calls.length - 1).tools.every(({ type }) => !type?.startsWith("web_")));

  const timing = await (await POST(request([
    { role: "user", content: "How long do patients wait for referral and treatment in Helsinki?" },
  ]))).json();
  assert.match(timing.answer, /no comparable public county data/);
  assert.equal(timing.steps[0].results.length, 2);
  assert.ok(timing.steps[0].results.every(({ sources }) => sources.length > 0));

  replies = [...Array(4).fill(regionCall), finish("Helsinki is below the benchmark.")];
  const capped = await (await POST(request())).json();
  assert.equal(capped.steps.length, 4);
  assert.equal(payload(mock.mock.calls.length - 1).tool_choice.type, "none");

  replies = [regionCall, finish("Helsinki is below the benchmark.")];
  const streamed = new Request(request(), { headers: { accept: "application/x-ndjson" } });
  const events = (await (await POST(streamed)).text()).trim().split("\n").map(JSON.parse);
  assert.deepEqual(events[0], { tool: "get_region_data" });
  assert.equal(events[1].ok, true);
  assert.equal(events[1].result.answer, "Helsinki is below the benchmark.");
});
