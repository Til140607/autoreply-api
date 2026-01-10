export default async function handler(req, res) {
  // Erlaubt, dass Webflow deine API aufrufen kann
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Browser schickt manchmal zuerst eine "OPTIONS"-Anfrage (Preflight)
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const { review } = req.body || {};
    if (!review || typeof review !== "string") {
      return res.status(400).json({ error: "No review provided" });
    }

    // OpenAI Call (Key kommt später sicher über Vercel Environment Variable)
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: `Du bist ein professioneller Kundenservice-Assistent für ein kleines Restaurant.
Schreibe eine kurze, höfliche Antwort auf folgende Google-Bewertung (2–5 Sätze).

Google-Bewertung:
${review}`
      })
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: "OpenAI error", details: data });
    }

    const text = data.output_text || "Keine Antwort erhalten.";
    return res.status(200).json({ reply: text.trim() });
  } catch (err) {
    return res.status(500).json({ error: "Server error", details: String(err) });
  }
}
