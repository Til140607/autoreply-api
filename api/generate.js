export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });

    const { review } = req.body || {};
    if (!review || typeof review !== "string") {
      return res.status(400).json({ error: "Missing review text" });
    }

    const input =
      "Du bist ein professioneller Kundenservice-Assistent für kleine Restaurants. " +
      "Schreibe eine kurze, höfliche, menschlich klingende Antwort auf diese Google-Bewertung. " +
      "Wenn negativ: entschuldigen, Verständnis zeigen, Lösung anbieten. " +
      "Wenn positiv: bedanken und wieder einladen.\n\n" +
      "Bewertung:\n" + review;

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input,
        temperature: 0.4
      })
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({ error: "OpenAI request failed", details: data });
    }

    // robust: nimm output_text, sonst fallback
    const text =
      (typeof data.output_text === "string" && data.output_text.trim()) ||
      (data.output?.[0]?.content || [])
        .map(c => c?.text)
        .filter(Boolean)
        .join("\n")
        .trim();

    if (!text) {
      return res.status(500).json({ error: "No text returned", raw: data });
    }

    // Wir geben BEIDES zurück, damit dein Frontend sicher was findet:
    return res.status(200).json({ reply: text, text });
  } catch (e) {
    return res.status(500).json({ error: "Server error", details: String(e) });
  }
}
