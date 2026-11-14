const minute = 60_000;
const clients = new Map<string, { expires: number; count: number }>();
let instance = { expires: 0, count: 0 };

export function limitAI(request: Request) {
  const now = Date.now();
  const client = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (instance.expires <= now) {
    clients.clear();
    instance = { expires: now + minute, count: 0 };
  }
  const usage = clients.get(client) ?? { expires: instance.expires, count: 0 };
  if (usage.count >= 6 || instance.count >= 30) {
    return Response.json({ error: "Too many AI requests. Try again in a minute." }, {
      status: 429, headers: { "Retry-After": String(Math.ceil((instance.expires - now) / 1000)) },
    });
  }
  usage.count++;
  instance.count++;
  clients.set(client, usage);
}
