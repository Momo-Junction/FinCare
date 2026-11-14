import type { Step } from "./investigation.ts";

const publicSources = ["syoparekisteri.fi", "cancerregistry.fi", "cancerregister.fi", "thl.fi", "sotkanet.fi", "fican.fi", "stm.fi", "stat.fi", "kela.fi", "europa.eu", "oecd.org", "who.int", "nordcan.iarc.fr"];

export const liveTools = [
  { type: "web_search_20250305", name: "web_search", max_uses: 3, allowed_domains: publicSources },
  { type: "web_fetch_20250910", name: "web_fetch", max_uses: 2, max_content_tokens: 5000, allowed_domains: publicSources, citations: { enabled: true } },
];

export function liveSourceSteps(blocks: unknown[]): { tool: string; results: Step[] }[] {
  const steps: { tool: string; results: Step[] }[] = [];
  for (const block of blocks) {
    if (!block || typeof block !== "object" || !("type" in block) || !("content" in block)) continue;
    const search = block.type === "web_search_tool_result";
    if (!search && block.type !== "web_fetch_tool_result") continue;
    const records = Array.isArray(block.content) ? block.content : [block.content];
    const sources = records.flatMap((record) => {
      if (!record || !["web_search_result", "web_fetch_result"].includes(record.type) || typeof record.url !== "string") return [];
      try {
        const url = new URL(record.url);
        if (url.protocol !== "https:" || !publicSources.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`))) return [];
        return [{ url: url.href, name: record.title || record.content?.title || url.hostname }];
      } catch {
        return [];
      }
    });
    if (sources.length) steps.push({
      tool: search ? "web_search" : "web_fetch",
      results: [{ title: search ? "Sources found online" : "Source read online", details: [], sources }],
    });
  }
  return steps;
}
