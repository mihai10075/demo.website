const fetch = require("node-fetch");

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ---- Base44 backend ----
const BASE44 =
  "https://preview-sandbox--69a42efbe70340373718146e.base44.app/functions";

// Save a message to Base44
async function saveMessage(sessionId, role, content) {
  const res = await fetch(`${BASE44}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, role, content }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Base44 saveMessage error:", res.status, text);
    return null;
  }

  return res.json();
}

// Get message history for a session
async function getMessages(sessionId) {
  const res = await fetch(
    `${BASE44}/messages?sessionId=${encodeURIComponent(sessionId)}`
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
    const { message, sessionId } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing message" });
    }

    // Fallback session id if frontend doesn’t send one yet
    const safeSessionId =
      typeof sessionId === "string" && sessionId.trim().length > 0
        ? sessionId.trim()
        : "default-session";

    if (!GROQ_API_KEY) {
      console.error("Missing GROQ_API_KEY");
      return res.status(500).json({ error: "Server misconfigured" });
    }

    // 1) Save user message in Base44
    await saveMessage(safeSessionId, "user", message).catch((e) =>
      console.error("saveMessage(user) failed:", e)
    );

    // 2) Load history from Base44
    const history = await getMessages(safeSessionId).catch((e) => {
      console.error("getMessages failed:", e);
      return [];
    });

    // 3) Build messages for Groq: system + history + latest user
    const groqMessages = [
      {
        role: "system",
        content:
          "You are MihAI, a friendly, chill AI for demo.website. Keep answers short, casual, and helpful. When people ask who you are, say you are MihAI.",
      },
      ...history.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
    ];

    groqMessages.push({ role: "user", content: message });

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
    await saveMessage(safeSessionId, "assistant", reply).catch((e) =>
      console.error("saveMessage(assistant) failed:", e)
    );

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("AI handler error:", err);
    return res.status(500).json({ error: "AI error" });
  }
};
