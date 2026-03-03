// api/chat.js
import Groq from "groq-sdk";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const BASE44_APP_URL = "https://mihai-memory-core.base44.app";

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

const groq = new Groq({ apiKey: GROQ_API_KEY });

const SYSTEM_PROMPT = `
You are MihAI — an expressive, slightly chaotic but kind AI friend.
...
`.trim();

export default async function handler(req, res) {
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

    const memoryFacts = await loadRelevantMemory(safeUserId, lastUserMessage);

    let memoryBlock = "";
    if (memoryFacts.length > 0) {
      const lines = memoryFacts
        .map((f) => `• [${f.category}] ${f.key}: ${f.value}`)
        .join("\n");
      memoryBlock = `\n\n---\nMEMORY (things you know about this user):\n${lines}\n---`;
    }

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
Return JSON only: { "upsert": [...], "delete": [...] }`,
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
}
