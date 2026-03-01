const fetch = require("node-fetch");

const PPLX_API_KEY = process.env.PPLX_API_KEY;

// ---- Base44 backend ----
const BASE44 = "https://preview-sandbox--69a42efbe70340373718146e.base44.app/functions";

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
  const res = await fetch(`${BASE44}/messages?sessionId=${encodeURIComponent(sessionId)}`);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Base44 getMessages error:", res.status, text);
    return [];
  }

  return res.json(); // array of messages
}

// Optional: call an external API through Base44 proxy (for future web tools)
async function callExternalApi(url, method, headers, body) {
  const res = await fetch(`${BASE44}/call-external-api`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, method, headers, body }),
  });
  const { ok, status, data } = await res.json();
  if (!ok) throw new Error(`External API returned ${status}: ${JSON.stringify(data)}`);
  return data;
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

    if (!PPLX_API_KEY) {
      console.error("Missing PPLX_API_KEY");
      return res.status(500).json({ error: "Server misconfigured" });
    }

    // 1) Save user message in Base44 (fire-and-forget)
    await saveMessage(safeSessionId, "user", message).catch((e) =>
      console.error("saveMessage(user) failed:", e)
    );

    // 2) (Optional) load history from Base44, could be used to give Perplexity context
    const history = await getMessages(safeSessionId).catch((e) => {
      console.error("getMessages failed:", e);
      return [];
    });

    // Build messages array for Perplexity: system + history + new message
    const pplxMessages = [
      {
        role: "system",
        content:
          "You are MihAI, a friendly, chill AI for demo.website. Keep answers short, casual, and helpful. When people ask who you are, say you are MihAI.",
      },
      // Convert saved history into Perplexity chat messages
      ...history.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
    ];

    // Ensure the latest user message is in case history missed it
    pplxMessages.push({ role: "user", content: message });

    // 3) Call Perplexity for web-search answers
    const aiRes = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PPLX_API_KEY}`,
      },
      body: JSON.stringify({
        model: "pplx-70b-online", // search-enabled model
        messages: pplxMessages,
      }),
    });

    if (!aiRes.ok) {
      const errorText = await aiRes.text();
      console.error("Search AI API error:", aiRes.status, errorText);
      return res
        .status(500)
        .json({ error: "AI backend error", details: errorText });
    }

    const data = await aiRes.json();

    const reply =
      data?.choices?.[0]?.message?.content ||
      "I had trouble generating a reply.";

    // 4) Save assistant reply in Base44 (fire-and-forget)
    await saveMessage(safeSessionId, "assistant", reply).catch((e) =>
      console.error("saveMessage(assistant) failed:", e)
    );

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("AI handler error:", err);
    return res.status(500).json({ error: "AI error" });
  }
};
