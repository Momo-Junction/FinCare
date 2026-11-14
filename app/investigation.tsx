"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Step } from "../lib/investigation";
import { comparisons, timingGaps, type Stage } from "../lib/pathway";
import { areas } from "../lib/screening";

const toolLabels: Record<string, string> = {
  compare_lung_outcomes: "Compared lung cancer outcomes",
  get_region_data: "Checked local figures",
  compare_regions: "Compared regions",
  analyze_care_pathway: "Checked each step of care",
  design_intervention_pilot: "Suggested what to try",
};

type Exchange = {
  question: string;
  area: string;
  areaId: string;
  stage: Stage;
  answer?: string;
  error?: string;
  steps: { tool: string; results: Step[]; error?: string }[];
};

export default function Investigation({ areaId, stage, open, setOpen, goalPrompt }: {
  areaId: string; stage: Stage; open: boolean; setOpen: (open: boolean) => void; goalPrompt: { question: string } | null;
}) {
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [pending, setPending] = useState(false);
  const [completedTools, setCompletedTools] = useState<string[]>([]);
  useEffect(() => {
    if (goalPrompt) setQuestion(goalPrompt.question);
  }, [goalPrompt]);
  const area = areas.find(({ id }) => id === areaId)?.name ?? areaId;
  const panel = useRef<HTMLElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const comparison = stage === "screening" || stage === "diagnosis" ? comparisons[stage] : null;
  const selected = comparison?.areas.find(({ id }) => id === areaId);
  const questions = comparison ? [
    { label: "Find the gap", prompt: `Compare ${area} with the national benchmark for ${comparison.title.toLowerCase()}. What could explain the difference, and what should we check locally?` },
    { label: "Where does the gap show up?", prompt: `Review the pathway for ${area}. Where does the measured difference occur, and which data should local teams collect next?` },
    { label: "What could a local team try?", prompt: `What should ${area} try for ${comparison.title.toLowerCase()}, and how could the team tell if it narrows the gap?` },
  ] : [
    { label: "Investigate this data gap", prompt: `What evidence is available for ${stage} in ${area}, and what should local teams collect?` },
    { label: "Plan an evaluation", prompt: `How could hospitals and county teams in ${area} evaluate equitable access at the ${stage} stage given current data limitations?` },
  ];
  const latest = exchanges.at(-1);
  const followUps = latest?.steps.some(({ tool, results }) => tool === "design_intervention_pilot" && results.length)
    ? [{ label: "How would we know it worked?", prompt: "How could we check whether the change you suggested narrows the gap?" }, ...questions]
    : questions;

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.current?.focus();
    return () => {
      const target = returnFocus.current;
      if (target !== document.body && target?.getClientRects().length) target.focus();
      else launcher.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    const body = conversation.current;
    if (open && exchanges.length && body) body.scrollTop = body.scrollHeight;
  }, [open, exchanges, pending, completedTools]);

  async function ask(input: string) {
    const content = input.trim();
    if (pending || !content || content.length > 800) return;
    setPending(true);
    setCompletedTools([]);
    setQuestion("");
    const exchange: Exchange = { question: content, area, areaId, stage, steps: [] };
    setExchanges((previous) => [...previous, exchange]);
    const history = exchanges.filter(({ answer }) => answer).slice(-6).flatMap((item) => [
      { role: "user", content: item.question, areaId: item.areaId, stage: item.stage },
      { role: "assistant", content: item.answer },
    ]);
    try {
      const response = await fetch("/api/investigate", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/x-ndjson" },
        body: JSON.stringify({ areaId, stage, history: [...history, { role: "user", content }] }),
      });
      if (!response.ok || !response.body) throw new Error("Investigation unavailable");
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      let final: { ok: boolean; result: { answer?: string; error?: string; steps?: Exchange["steps"] } } | undefined;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const event = JSON.parse(line);
          if (typeof event.tool === "string") setCompletedTools((tools) => [...tools, event.tool]);
          else final = event;
        }
      }
      if (!final) throw new Error("Investigation ended without a result");
      const { ok, result } = final;
      setExchanges((previous) => [...previous.slice(0, -1), {
        ...exchange,
        answer: ok ? result.answer : undefined,
        error: ok ? undefined : result.error,
        steps: result.steps ?? [],
      }]);
      if (!ok) setQuestion((draft) => draft || content);
    } catch {
      setExchanges((previous) => [...previous.slice(0, -1), {
        ...exchange, error: "FinCare AI could not connect. Try again or use the dashboard evidence.",
      }]);
      setQuestion((draft) => draft || content);
    } finally {
      setPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(question);
  }

  return (
    <>
    <button ref={launcher} type="button" hidden={open} className="ai-launcher" aria-expanded={open} aria-controls="fincare-ai" onClick={() => setOpen(true)}>
      <span aria-hidden="true">✦</span> FinCare AI
    </button>
    <section ref={panel} id="fincare-ai" hidden={!open} tabIndex={-1} role="dialog" className="ai-window"
      aria-labelledby="investigation-heading" onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
      <header className="ai-header">
        <span className="ai-mark" aria-hidden="true">✦</span>
        <div className="min-w-0 flex-1">
          <h2 id="investigation-heading">FinCare AI</h2>
          <p className="text-xs text-blue-100">{area} · <span className="capitalize">{stage}</span></p>
        </div>
        <button type="button" aria-label="Close FinCare AI" className="ai-close" onClick={() => setOpen(false)}>×</button>
      </header>
      <div ref={conversation} className="ai-body">
      {!exchanges.length && (
        <div className="ai-context">
          <p className="mb-2 text-xs font-semibold text-blue-800">What we know</p>
          <h3>{selected ? comparison?.title : "Evidence gap"}</h3>
          <p>{selected ? `${area} recorded ${selected.rate.toFixed(1)}% in ${comparison?.year}, versus ${comparison?.national.rate.toFixed(1)}% nationally.`
            : timingGaps[stage as keyof typeof timingGaps]?.context}</p>
          <p className="mt-2">Choose what FinCare AI should investigate.</p>
        </div>
      )}
      <div role="log" aria-label="FinCare AI conversation" className="space-y-4">
        {exchanges.map((exchange, index) => (
          <article key={index} className="space-y-3 rounded-xl border border-blue-100 p-4">
            <div className="ai-question-bubble">
              <p className="text-xs font-semibold text-blue-100">You · {exchange.area} · <span className="capitalize">{exchange.stage}</span></p>
              <p className="mt-1 break-words">{exchange.question}</p>
            </div>
            {exchange.answer && <div className="ai-answer-bubble"><h3 className="mb-2 text-xs text-blue-900">FinCare AI</h3><p className="whitespace-pre-wrap break-words">{exchange.answer}</p></div>}
            {exchange.error && <p className="text-red-800">{exchange.error}</p>}
            {exchange.steps.length > 0 && <InvestigationSteps steps={exchange.steps} />}
          </article>
        ))}
        {pending && (
          <div role="status" className="ai-loading">
            <span className="ai-pulse" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{completedTools.length ? "Investigation in progress" : "Starting investigation"}</p>
              {completedTools.length > 0 && <ul className="mt-2 space-y-1 text-xs">
                {completedTools.map((tool, index) => <li key={index} className="ai-tool-complete">✓ {toolLabels[tool] ?? tool}</li>)}
              </ul>}
              <div className="ai-progress" aria-hidden="true"><span /></div>
            </div>
          </div>
        )}
      </div>
      {!pending && <div className="mt-3 grid gap-2" aria-label="Suggested next questions">
        {followUps.map(({ label, prompt }) => (
          <button key={label} type="button" onClick={() => void ask(prompt)} className="ai-suggestion">{label} <span aria-hidden="true">↗</span></button>
        ))}
      </div>}
      </div>
      <form onSubmit={submit} className="ai-composer">
        <label htmlFor="ai-question" className="sr-only">Ask FinCare AI a question</label>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <input id="ai-question" value={question} maxLength={800} onChange={(event) => setQuestion(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 p-2.5" placeholder="How could our region improve follow-up?" />
          <button type="submit" disabled={pending || !question.trim()} className="bg-blue-800 text-white hover:bg-blue-900">Send</button>
        </div>
        <p className="mt-2 text-xs text-slate-600">For service planning. Leave out patient details.</p>
      </form>
    </section>
    </>
  );
}

function InvestigationSteps({ steps }: { steps: Exchange["steps"] }) {
  const links = new Map(steps.flatMap(({ results }) => results.flatMap(({ sources }) => sources.map((source) => [source.url, source] as const))));
  return (
    <>
      <details className="rounded-lg bg-slate-50 p-3 text-sm" open>
        <summary className="cursor-pointer font-semibold">What I checked · {steps.length}</summary>
        <ol className="mt-2 space-y-2">
          {steps.map(({ tool, results, error }, index) => (
            <li key={index} className="rounded border border-slate-200 bg-white p-2">
              <details open={steps.length === 1}>
                <summary className="cursor-pointer font-medium">{toolLabels[tool] ?? "Tool validation"}{error ? " · needs correction" : ""}</summary>
                {error && <p>{error}</p>}
                {results.map(({ title, details }) => (
                  <div key={title} className="mt-2">
                    <h3>{title}</h3>
                    <ul className="list-disc space-y-1 pl-5">{details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
                  </div>
                ))}
              </details>
            </li>
          ))}
        </ol>
      </details>
      {links.size > 0 && (
        <ul aria-label="Evidence sources" className="space-y-1 text-sm">
          {[...links.values()].map(({ name, url }) => <li key={url}><a href={url}>{name}</a></li>)}
        </ul>
      )}
    </>
  );
}
