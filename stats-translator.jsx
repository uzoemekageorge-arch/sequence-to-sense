import { useState } from "react";

export default function StatsTranslator() {
  const [input, setInput] = useState("");
  const [context, setContext] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleTranslate() {
    const val = input.trim();
    const ctx = context.trim();
    setError("");
    setResult("");
    if (!val) {
      setError("Paste a statistical result first.");
      return;
    }
    setLoading(true);
    try {
      const contextLine = ctx
        ? "Biological context / study question: " + ctx + "\n\n"
        : "";
      const contextInstruction = ctx
        ? "Ground the explanation in that biological context specifically — connect the numbers to what was actually being studied (the population, the condition, what a meaningful difference would mean for that group), not just generic stats language."
        : "No context was given, so explain the numbers generically, and note that the interpretation would sharpen a lot with context like the study population and what was being measured.";

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 500,
          messages: [
            {
              role: "user",
              content:
                "Explain this statistical result in plain language for a biology student who does not know statistics well. Say what the numbers mean, whether the result is meaningful for the biology involved, and any caveats (like small sample size). " +
                contextInstruction +
                " Keep it under 150 words, avoid unexplained jargon.\n\n" +
                contextLine +
                "Statistical result: " +
                val,
            },
          ],
        }),
      });
      const data = await response.json();
      const text = (data.content || [])
        .map((c) => c.text || "")
        .join("\n")
        .trim();
      if (!text) {
        setError("No response came back. Try again.");
      } else {
        setResult(text);
      }
    } catch (e) {
      setError("Something went wrong reaching the translator. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <h1 className="text-2xl font-semibold text-stone-900 mb-1">
          Stats, in plain English
        </h1>
        <p className="text-sm text-stone-500 mb-6">
          Paste a statistical result from a paper or assignment. Get back what it
          actually means, in biology-student terms.
        </p>

        <label className="text-sm font-medium text-stone-700 block mb-1">
          Biological context (optional, but recommended)
        </label>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={2}
          placeholder="e.g. Sample was infants in hospital with a genetic disorder, comparing survival rates between two treatments"
          className="w-full rounded-lg border border-stone-300 p-3 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none mb-4"
        />

        <label className="text-sm font-medium text-stone-700 block mb-1">
          Statistical result
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          placeholder="p = 0.03, n = 45, effect size = 0.6"
          className="w-full rounded-lg border border-stone-300 p-3 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
        />

        {error && (
          <p className="text-sm text-red-600 mt-2">{error}</p>
        )}

        <button
          onClick={handleTranslate}
          disabled={loading}
          className="mt-3 bg-stone-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-stone-700 disabled:opacity-50"
        >
          {loading ? "Translating..." : "Explain in plain language"}
        </button>

        {result && (
          <div className="mt-6 bg-white border border-stone-200 rounded-lg p-4">
            <p className="text-xs uppercase tracking-wide text-stone-400 mb-2">
              Plain-language explanation
            </p>
            <p className="text-sm text-stone-800 leading-relaxed whitespace-pre-wrap">
              {result}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
