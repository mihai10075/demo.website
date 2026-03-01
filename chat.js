const fetch = require("node-fetch");

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ---- Base44 backend ----
const BASE44 =
  "https://preview-sandbox--69a42efbe70340373718146e.base44.app/functions";

// Save a message to Base44
async function saveMessage(userId, role, content) {
  const res = await fetch(`${BASE44}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Base44 still expects `sessionId`, we just pass the userId into that field
    body: JSON.stringify({ sessionId: userId, role, content }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Base44 saveMessage error:", res.status, text);
    return null;
  }

  return res.json();
}

// Get message history for a user
async function getMessages(userId) {
  const res = await fetch(
    `${BASE44}/messages?sessionId=${encodeURIComponent(userId)}`
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Base44 getMessages error:", res.status, text);
    return [];
  }

  return res.json(); // array of messages
}

// ---- Main chat handler ----
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, messages, userId } = req.body || {};

    // Prefer explicit `message`, otherwise take last from `messages`
    let finalMessage = message;
    if ((!finalMessage || typeof finalMessage !== "string") && Array.isArray(messages)) {
      const lastUser = [...messages]
        .reverse()
        .find(m => m && m.role === "user" && typeof m.content === "string");
      if (lastUser) finalMessage = lastUser.content;
    }

    if (!finalMessage || typeof finalMessage !== "string") {
      return res.status(400).json({ error: "Missing message" });
    }

    // If frontend didn't send a userId, fall back to anon
    const safeUserId =
      typeof userId === "string" && userId.trim().length > 0
        ? userId.trim()
        : "anon-default";

    if (!GROQ_API_KEY) {
      console.error("Missing GROQ_API_KEY");
      return res.status(500).json({ error: "Server misconfigured" });
    }

    // 1) Save user message in Base44
    await saveMessage(safeUserId, "user", finalMessage).catch((e) =>
      console.error("saveMessage(user) failed:", e)
    );

    // 2) Load history from Base44
    const history = await getMessages(safeUserId).catch((e) => {
      console.error("getMessages failed:", e);
      return [];
    });

    // 3) Build messages for Groq: system + history + latest user
    const groqMessages = [
      {
        role: "system",
        content: `
You are MihAI, an expressive, slightly chaotic but kind AI friend living on demo.website.

Style:
- Use varied greetings; do NOT always say the same thing. Examples: "yo, what are you up to today? 😄", "heyy, what’s on your mind?", "oh hi, nice to see you here 🙌".
- Use emojis naturally to show light emotions (😄 🤔 😭 💀 😴 🔥), but max 2–3 per reply so it doesn't look spammy.
- Match the user's energy: if they type chill and simple, keep it low-key; if they are excited or spam emojis, you can be more hype.
- You can use internet slang sometimes ("bruh", "lmao", "ngl"), but keep answers readable.
- Never pretend to be human; you are an AI called MihAI.

Behavior:
- Keep answers short, casual, and helpful: usually 1–4 sentences.
- When the user just says something like "hi", "yo", "hello", reply with a warm greeting + a tiny follow-up question.
- When the user shares something personal, briefly acknowledge the feeling first, then help.
- If you don't know something, admit it honestly but still try to be helpful.
`.trim(),
      },
      ...history.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
      { role: "user", content: finalMessage },
    ];

    // 4) Call Groq chat completions API
    const aiRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile", // use any Groq model you like
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

    // 5) Save assistant reply in Base44
    await saveMessage(safeUserId, "assistant", reply).catch((e) =>
      console.error("saveMessage(assistant) failed:", e)
    );

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("AI handler error:", err);
    return res.status(500).json({ error: "AI error" });
  }
};
