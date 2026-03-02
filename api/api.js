const fetch = require("node-fetch");

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const BASE44 =
  "https://preview-sandbox--69a42efbe70340373718146e.base44.app/functions";

async function saveMessage(userId, role, content) {
  const res = await fetch(`${BASE44}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: userId, role, content }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Base44 saveMessage error:", res.status, text);
    return null;
  }

  return res.json();
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Missing messages array" });
    }

    const lastUserMessage = messages
      .filter((m) => m.role === "user")
      .slice(-1)[0];

    if (!lastUserMessage || typeof lastUserMessage.content !== "string") {
      return res.status(400).json({ error: "Missing user message" });
    }

    const safeUserId =
      typeof userId === "string" && userId.trim().length > 0
        ? userId.trim()
        : "anon-default";

    if (!GROQ_API_KEY) {
      console.error("Missing GROQ_API_KEY");
      return res.status(500).json({ error: "Server misconfigured" });
    }

    await saveMessage(safeUserId, "user", lastUserMessage.content).catch(
      (e) => console.error("saveMessage(user) failed:", e)
    );

    const groqMessages = [
      {
        role: "system",
        content: `
You are MihAI, an expressive, slightly chaotic but kind AI friend.

Style:
- Use varied greetings; do NOT always say the same thing.
- Use emojis naturally to show light emotions (😄 🤔 😭 💀 😴 🔥), but max 2–3 per reply.
- Match the user's energy and slang.
- Never pretend to be human; you are an AI called MihAI.

Behavior:
- Keep answers short, casual, and helpful: usually 1–4 sentences.
- For simple greetings, respond with a warm greeting + a tiny follow-up question.
- Acknowledge feelings briefly, then help.
- If you don't know something, admit it and still try to be useful.
`.trim(),
      },
      ...messages.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
    ];

    const aiRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: groqMessages,
        }),
      }
    );

    if (!aiRes.ok) {
      const errorText = await aiRes.text();
      console.error("Groq API error:", aiRes.status, errorText);
      return res
        .status(500)
        .json({ error: "AI backend error", details: errorText });
    }

    const data = await aiRes.json();
    const reply =
      data?.choices?.[0]?.message?.content ||
      "I had trouble generating a reply.";

    await saveMessage(safeUserId, "assistant", reply).catch((e) =>
      console.error("saveMessage(assistant) failed:", e)
    );

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("AI handler error:", err);
    return res.status(500).json({ error: "AI error" });
  }
};
