import { briefSchema, evidenceFor, instructions, isBrief, stagePilots } from "../../../lib/brief.ts";
import { comparisons } from "../../../lib/pathway.ts";
import { sendMessage } from "../../../lib/anthropic.ts";
import { limitAI } from "../../../lib/ai-limit.ts";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const areaId = body && typeof body === "object" && "areaId" in body ? body.areaId : null;
  const stage = body && typeof body === "object" && "stage" in body ? body.stage : "screening";
  if (stage !== "screening" && stage !== "diagnosis") {
    return Response.json({ error: "Choose a stage with public comparison data." }, { status: 400 });
  }
  const area = comparisons[stage].areas.find((candidate) => candidate.id === areaId);
  if (!area) return Response.json({ error: "Choose a reporting area." }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "FinCare AI needs a server-side API key." }, { status: 503 });
  if (process.env.NODE_ENV === "production") {
    const limited = limitAI(request);
    if (limited) return limited;
  }

  try {
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
    const direction = area.gap < 0 ? "below" : area.gap > 0 ? "above" : "equal";
    const schema = {
      ...briefSchema,
      properties: {
        ...briefSchema.properties,
        direction: { type: "string", enum: [direction] },
        pilot: { type: "string", enum: stagePilots[stage] },
      },
    };
    const response = await sendMessage(apiKey, {
        max_tokens: 1500,
        system: instructions,
        messages: [{ role: "user", content: JSON.stringify(evidenceFor(area.id, stage)) }],
        output_config: {
          ...(model === "claude-sonnet-5-5" ? { effort: "low" } : {}),
          format: { type: "json_schema", schema },
        },
    }, AbortSignal.timeout(25_000));
    if (!response.ok) {
      console.error("Claude request failed", response.status);
      return Response.json({ error: "FinCare AI is unavailable. The evidence and pilot are still available below." }, { status: 502 });
    }
    const message = await response.json();
    const output = Array.isArray(message.content)
      ? message.content.find((block: { type?: string } | null) => block?.type === "text")
      : null;
    const brief: unknown = message.stop_reason === "end_turn" && output?.type === "text"
      ? JSON.parse(output.text)
      : null;
    if (!isBrief(brief) || brief.direction !== direction || !stagePilots[stage].some((id) => id === brief.pilot)) {
      return Response.json({ error: "FinCare AI couldn’t check its suggestion. Try again or use the plan below." }, { status: 502 });
    }
    return Response.json(brief);
  } catch (error) {
    console.error("Claude brief failed", error instanceof Error ? error.name : "UnknownError");
    return Response.json({ error: "The brief could not be generated. Try again." }, { status: 502 });
  }
}
