export function sendMessage(apiKey: string, body: object, signal: AbortSignal) {
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey.trim(),
      ...(workspaceId ? { "anthropic-workspace-id": workspaceId } : {}),
      "anthropic-version": "2023-06-01",
    },
    signal,
    body: JSON.stringify({
      model,
      max_tokens: 1800,
      ...(model === "claude-sonnet-5-5" ? { output_config: { effort: "low" } } : {}),
      ...body,
    }),
  });
}
