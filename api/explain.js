const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map();

function tooMany(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = (req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
  if (tooMany(ip)) {
    return res.status(429).json({ error: "Too many requests. Please wait a minute and try again." });
  }

  const { input, context } = req.body || {};
  const val = typeof input === "string" ? input.trim().slice(0, 1000) : "";
  const ctx = typeof context === "string" ? context.trim().slice(0, 1000) : "";

  if (!val) {
    return res.status(400).json({ error: "Paste a statistical result first." });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "Server is not set up yet (missing API key)." });
  }

  const contextLine = ctx ? "Biological context / study question: " + ctx + "\n\n" : "";
  const contextInstruction = ctx
    ? "Ground the explanation in that biological context specifically — connect the numbers to what was actually being studied (the population, the condition, what a meaningful difference would mean for that group), not just generic stats language."
    : "No context was given, so explain the numbers generically, and note that the interpretation would sharpen a lot with context like the study population and what was being measured.";

  const prompt =
    "Explain this statistical result in plain language for a biology student who does not know statistics well. Say what the numbers mean, whether the result is meaningful for the biology involved, and any caveats (like small sample size). " +
    contextInstruction +
    " Keep it under 150 words, avoid unexplained jargon.\n\n" +
    contextLine +
    "Statistical result: " +
    val;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || "claude-sonnet-5-5",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error("Anthropic error:", data);
      return res.status(502).json({ error: "The translator is unavailable right now. Try again shortly." });
    }
    const text = (data.content || []).map((c) => c.text || "").join("\n").trim();
    if (!text) return res.status(502).json({ error: "No response came back. Try again." });
    return res.status(200).json({ text });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Something went wrong reaching the translator." });
  }
}
