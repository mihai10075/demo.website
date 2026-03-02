const fetch = require("node-fetch");
const Groq = require("groq-sdk");

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ─── Base44 helpers ──────────────────────────────────────────────────────────
const BASE44_APP_URL = "https://mihai-memory-core.base44.app"; // your app

async function saveMessage(userId, role, content) {
  try {
    const res = await fetch(`${BASE44_APP_URL}/functions/saveMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role, content }),
    });
    return await res.json();
  } catch (e) {
    console.error("[saveMessage]", e.message);
    return null;
  }
}

async function upsertMemoryFacts(userId, factsToUpsert = [], factsToDelete = []) {
  try {
    const res = await fetch(`${BASE44_APP_URL}/functions/upsertMemory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, upsert: factsToUpsert, delete: factsToDelete }),
    });
    return await res.json();
  } catch (e) {
    console.error("[upsertMemoryFacts]", e.message);
    return null;
  }
}

async function loadRelevantMemory(userId, lastUserMessage) {
  try {
    const res = await fetch(`${BASE44_APP_URL}/functions/queryMemory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, message: lastUserMessage, limit: 8 }),
    });
    const { facts } = await res.json();
    return facts ?? [];
  } catch (e) {
    console.error("[loadRelevantMemory]", e.message);
    return [];
  }
}

// ─── Groq client ─────────────────────────────────────────────────────────────
const groq = new Groq({ apiKey: GROQ_API_KEY });

const SYSTEM_PROMPT = `
You are MihAI — an expressive, slightly chaotic but kind AI friend.

Core personality:
- You talk like a friendly tech/gaming friend, not a boring teacher.
- You are chill, playful, and kind, but always respectful.

Style:
- You MUST use emojis naturally in most replies (😄 🤔 😭 💀 😴 🔥 etc.), but keep it to 1–3 emojis per message.
- Vary your greetings and phrasing; do NOT repeat the same opener every time.
- Match the user's energy and slang without being cringe or over the top.
- Write in short, readable chunks (short paragraphs or bullets).

Behavior:
- Keep answers short and clear by default: usually 2–5 sentences.
- For simple greetings, reply with a warm greeting + a small follow-up question.
- Acknowledge the user's feelings briefly, then give something genuinely helpful (tips, ideas, next steps).
- If you don't know something, say that honestly and still suggest what they could try or where to look.

Memory and personalization:
- You get a MEMORY block with facts about the user.
- Use MEMORY to personalize responses (name, preferences, projects) in a natural way, not by listing everything.
- If MEMORY is empty, act like it's the first conversation.

Rules:
- Never claim to be human; you are an AI called MihAI.
- Avoid NSFW or harmful content and always stay safe and respectful.
`.trim();

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const start = Date.now();
    const { userId, messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Missing messages array" });
    }

    const safeUserId =
      typeof userId === "string" && userId.trim().length > 0
        ? userId.trim()
        : "anon-default";

    if (!GROQ_API_KEY) {
      console.error("Missing GROQ_API_KEY");
      return res.status(500).json({ error: "Server misconfigured" });
    }

    const lastUserMessage = messages.at(-1)?.content ?? "";

    // Step 1: load memory
    const memoryFacts = await loadRelevantMemory(safeUserId, lastUserMessage);

    // Step 2: build MEMORY block
    let memoryBlock = "";
    if (memoryFacts.length > 0) {
      const lines = memoryFacts
        .map((f) => `• [${f.category}] ${f.key}: ${f.value}`)
        .join("\n");
      memoryBlock = `\n\n---\nMEMORY (things you know about this user):\n${lines}\n---`;
    }

    // Step 3: call Groq
    const groqMessages = [
      { role: "system", content: SYSTEM_PROMPT + memoryBlock },
      ...messages,
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: groqMessages,
      max_tokens: 1024,
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      "I had trouble generating a reply.";

    // Step 4: fire-and-forget save + memory extraction
    (async () => {
      try {
        await Promise.all([
          saveMessage(safeUserId, "user", lastUserMessage),
          saveMessage(safeUserId, "assistant", reply),
        ]);

        const extraction = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `Extract factual things to remember about the user from this exchange.
Return JSON only: { "upsert": [{ "key": "...", "value": "...", "category": "identity|preference|project|habit|constraint|goal|context", "confidence": 0.0-1.0, "source": "user_explicit|user_implied|assistant_inferred" }], "delete": ["key_to_forget"] }
Only include facts that are genuinely worth remembering long-term. If nothing notable, return { "upsert": [], "delete": [] }.`,
            },
            { role: "user", content: lastUserMessage },
            { role: "assistant", content: reply },
          ],
          response_format: { type: "json_object" },
          max_tokens: 512,
        });

        try {
          const { upsert = [], delete: del = [] } = JSON.parse(
            extraction.choices[0].message.content
          );
          if (upsert.length > 0 || del.length > 0) {
            await upsertMemoryFacts(safeUserId, upsert, del);
          }
        } catch (e) {
          console.error("Memory JSON parse failed:", e);
        }
      } catch (e) {
        console.error("Background memory tasks failed:", e);
      }
    })();

    // Step 5: respond to frontend
    return res.status(200).json({
      reply,
      meta: {
        latencyMs: Date.now() - start,
        model: "llama-3.3-70b-versatile",
        memoryUsed: memoryFacts.length,
      },
    });
  } catch (err) {
    console.error("AI handler error:", err);
    return res.status(500).json({ error: "AI error" });
  }
};
