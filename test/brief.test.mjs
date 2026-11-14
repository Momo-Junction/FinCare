import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "../app/api/brief/route.ts";
import { comparisons } from "../lib/pathway.ts";

test("published participation rates and county counts reconcile", () => {
  for (const { areas, national } of Object.values(comparisons)) {
    assert.equal(areas.length, 22);
    assert.equal(new Set(areas.map(({ id }) => id)).size, 22);
    for (const field of ["invited", "attended"]) {
      assert.equal(areas.reduce((total, area) => total + area[field], 0), national[field]);
    }
    for (const { attended, invited, rate } of [...areas, national]) {
      assert.equal(Number((100 * attended / invited).toFixed(1)), rate);
    }
  }
  assert.equal(comparisons.screening.areas.find(({ id }) => id === "helsinki").gap, -7.3);
  assert.equal(comparisons.diagnosis.areas.find(({ id }) => id === "helsinki").gap, -4.9);
});

test("brief endpoint validates the area, comparison and returned evidence", async (t) => {
  const key = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  t.after(() => {
    if (key === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = key;
  });

  const request = (areaId, stage) => new Request("http://localhost/api/brief", {
    method: "POST",
    body: JSON.stringify({ areaId, stage }),
  });
  assert.equal((await POST(request("invalid"))).status, 400);
  assert.equal((await POST(request("helsinki"))).status, 503);

  process.env.ANTHROPIC_API_KEY = "test-key";
  const brief = {
    direction: "below",
    interpretation: "The gap occurs before attendance at screening.",
    hypothesis: "If rescheduling is difficult, some invitees may miss screening.",
    verification: "Ask invitees who missed appointments about rescheduling.",
    rationale: "Pilot clearer booking instructions if invitees describe difficulty changing appointments.",
    limitation: "Attendance data leave the cause of the gap unresolved.",
    pilot: "booking",
    evidence: ["regionalComparison", "screeningDefinition"],
  };
  let output = brief;
  const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json({
    stop_reason: "end_turn",
    content: [{ type: "thinking" }, { type: "text", text: JSON.stringify(output) }],
  }));

  const success = await POST(request("helsinki"));
  assert.equal(success.status, 200);
  assert.deepEqual(await success.json(), brief);
  const payload = JSON.parse(fetchMock.mock.calls[0].arguments[1].body);
  const evidence = JSON.parse(payload.messages[0].content);
  assert.equal(evidence.regionalComparison.area.name, "Helsinki");
  assert.equal(evidence.regionalComparison.national.rate, 81.6);
  assert.equal(payload.output_config.format.type, "json_schema");

  output = { ...brief, direction: "above" };
  assert.equal((await POST(request("helsinki"))).status, 502);
  output = { ...brief, hypothesis: "The pilot will improve attendance by 10%." };
  assert.equal((await POST(request("helsinki"))).status, 502);
  output = { ...brief, evidence: ["madeUpSource"] };
  assert.equal((await POST(request("helsinki"))).status, 502);

  output = brief;
  assert.equal((await POST(request("helsinki", "diagnosis"))).status, 502);
  output = { ...brief, pilot: "navigation" };
  assert.equal((await POST(request("helsinki", "diagnosis"))).status, 200);
  const diagnosisPayload = JSON.parse(fetchMock.mock.calls.at(-1).arguments[1].body);
  const diagnosisEvidence = JSON.parse(diagnosisPayload.messages[0].content);
  assert.equal(diagnosisEvidence.regionalComparison.national.rate, 72.7);
  assert.deepEqual(Object.keys(diagnosisEvidence.pilots), ["navigation", "handoff"]);
  assert.equal((await POST(request("helsinki", "referral"))).status, 400);
  assert.equal((await POST(request("helsinki", "treatment"))).status, 400);
});
