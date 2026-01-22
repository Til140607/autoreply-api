export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });

const { review, tone = "professionell", lang = "de" } = req.body || {};
const toneRules = {
  professionell: {
    de: "Schreibe professionell, freundlich und seriös. 3–5 Sätze. Kein Slang.",
    en: "Write professionally, friendly, and polished. 3–5 sentences. No slang."
  },
  kurz: {
    de: "Schreibe sehr kurz und prägnant. 1–2 Sätze.",
    en: "Write very short and concise. 1–2 sentences."
  },
  locker: {
    de: "Schreibe locker, herzlich und nahbar. 2–4 Sätze. Kein übertriebener Slang.",
    en: "Write casual, warm, and approachable. 2–4 sentences. No heavy slang."
  }
};
    const safeLang = (lang === "en" ? "en" : "de");
const toneInstruction =
  toneRules[tone]?.[safeLang] || toneRules.professionell[safeLang];

const toneInstruction = toneRules[tone] || toneRules.professionell;
    if (!review || typeof review !== "string") {
      return res.status(400).json({ error: "Missing review text" });
    }

    const languageInstruction =
  lang === "en"
    ? "Write the reply in English."
    : "Schreibe die Antwort auf Deutsch.";

const systemText =
  safeLang === "en"
    ? "You are a professional customer support assistant for small restaurants."
    : "Du bist ein professioneller Kundenservice-Assistent für kleine Restaurants.";

const userText =
  safeLang === "en"
    ? `Write a short, polite, human-sounding reply to this Google review.
If the review is negative: apologize, show understanding, and offer a solution.
If the review is positive: thank them and invite them to come back.

Tone rule: ${toneInstruction}

Review:
${review}`
    : `Schreibe eine kurze, höfliche, menschlich klingende Antwort auf diese Google-Bewertung.
Wenn negativ: entschuldigen, Verständnis zeigen, Lösung anbieten.
Wenn positiv: bedanken und wieder einladen.

Tonalitäts-Regel: ${toneInstruction}

Bewertung:
${review}`;
    
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
  model: "gpt-4o-mini",
  input: [
    { role: "system", content: systemText },
    { role: "user", content: userText }
  ],
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
