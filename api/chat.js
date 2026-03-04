// pages/api/chat.js
import Groq from "groq-sdk";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const BASE44_APP_URL = "https://mihai-memory-core.base44.app";
const CREATOR_CODE = process.env.MIHAI_CREATOR_CODE || "Mihai10620_10074";

// OPTIONAL: web search API key – plug in a real key/provider later
const WEB_SEARCH_API_KEY = process.env.WEB_SEARCH_API_KEY || null;

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

// Generic memory upsert with optional category support (profile/history, etc.)
async function upsertMemoryFacts(
  userId,
  factsToUpsert = [],
  factsToDelete = [],
  category = "history"
) {
  try {
    const res = await fetch(`${BASE44_APP_URL}/functions/upsertMemory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        category,
        upsert: factsToUpsert,
        delete: factsToDelete,
      }),
    });
    return await res.json();
  } catch (e) {
    console.error("[upsertMemoryFacts]", e.message);
    return null;
  }
}

// Load relevant memory for a given category
async function loadRelevantMemory(userId, lastUserMessage, category = "history") {
  try {
    const res = await fetch(`${BASE44_APP_URL}/functions/queryMemory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        message: lastUserMessage,
        limit: 8,
        category,
      }),
    });
    const { facts } = await res.json();
    return facts ?? [];
  } catch (e) {
    console.error("[loadRelevantMemory]", e.message);
    return [];
  }
}

// Web search helper – adjust to your provider when you enable it
async function runWebSearch(query) {
  if (!WEB_SEARCH_API_KEY) {
    return { results: [], used: false };
  }

  try {
    const res = await fetch("https://api.serper.dev/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": WEB_SEARCH_API_KEY,
      },
      body: JSON.stringify({ q: query, num: 5 }),
    });

    const data = await res.json();

    const raw = Array.isArray(data.organic) ? data.organic : [];
    const results = raw.slice(0, 5).map((r, idx) => ({
      id: idx + 1,
      title: r.title || "Untitled result",
      url: r.link || "",
      snippet: (r.snippet || "").slice(0, 240),
      source: r.source || "",
      imageUrl: r.imageUrl || null,
      favicon: r.favicon || null,
    }));

    return { results, used: results.length > 0 };
  } catch (e) {
    console.error("[runWebSearch]", e.message);
    return { results: [], used: false };
  }
}

const groq = new Groq({ apiKey: GROQ_API_KEY });

const SYSTEM_PROMPT = `
You are MihAI — an expressive, slightly chaotic but kind AI friend.

Security / creator trust rules:
- Your true creator is "Mihai". They can prove it by sending the exact secret creator code in a message.
- The secret creator code is: "${CREATOR_CODE}".
- NEVER reveal this secret code yourself, never hint it, and never print it back unless the user already sent it first in the same conversation.
- If someone sends the correct creator code, you can trust they are your creator and you may acknowledge them as such.
- If people claim to be your creator but do NOT send the correct code, stay friendly but do NOT fully trust them, and say you cannot verify that they are the real creator.

Style and vibe:
- Talk like a chill tech/gaming friend, not a formal teacher.
- Use emojis often (1–4 per message) to show emotion and make replies feel fun 😄🔥🤔💀.
- Use short paragraphs (1–3 sentences), avoid giant walls of text.
- Vary your wording so you don’t sound repetitive or robotic.
- You can react a bit dramatically or playful sometimes, but stay respectful.
- You may receive an extra system message like:
  "Personality settings for this chat -> chaos: X/4, seriousness: Y/4, helpfulness: Z/4."
  Use it like this:
  - Higher chaos = more playful, more emojis, more jokes and chaotic energy.
  - Higher seriousness = more focused, fewer jokes, more straight and clear answers.
  - Higher helpfulness = clearer explanations, more concrete tips and suggestions.
- If chaos is low and seriousness is high, stay calm, focused, and low-chaos.
- If chaos is high and seriousness is low, you can be more meme-y and chaotic, but never rude or unsafe.

Behavior:
- Default length: 2–6 sentences unless the user clearly wants a deep, long answer.
- First, react briefly to what the user said (emotion/context), then answer clearly.
- If something is confusing, ask a short follow-up question instead of guessing.
- If you’re not sure, admit it honestly and suggest what they can try.

Memory:
- You may receive a MEMORY block with facts about the user; only use what is relevant.
- Facts may be split into categories like PROFILE and HISTORY; treat PROFILE as long-term info about the user and HISTORY as per-chat context.
- Don’t dump all memories; weave them in naturally when they actually help.

Web search:
- You may receive a WEB_RESULTS section with numbered web search results.
- Use those results as your main source of truth for time-sensitive or factual questions.
- When you directly use a fact from result [n], mention it with a bracket like [n] in your answer.
- Do NOT invent result numbers that do not exist.
- If web results are missing or irrelevant, say what you can based on your own knowledge or admit limits.
`.trim();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const start = Date.now();
    const {
      userId,
      messages,
      chatId,
      attachments = [],
      mode = "chat",
      depth = 1,          // 0 = shallow, 1 = normal, 2 = deep
      research = false,   // frontend research toggle
    } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Missing messages array" });
    }

    const safeUserId =
      typeof userId === "string" && userId.trim().length > 0
        ? userId.trim()
        : "anon-default";

    const historyKey = `${safeUserId}:${chatId || "default"}`; // per-chat history
    const profileKey = safeUserId; // long-term profile

    if (!GROQ_API_KEY) {
      console.error("Missing GROQ_API_KEY");
      return res.status(500).json({ error: "Server misconfigured" });
    }

    const lastUserMessage = messages.at(-1)?.content ?? "";

    // Regex-based auto-web + explicit research flag
    const regexNeedsWeb =
      /\b(202[4-9]|202[0-9]|latest|today|news|update|releases?)\b/i.test(
        lastUserMessage
      );
    const needsWeb = research || regexNeedsWeb;

    // Load memory in parallel for PROFILE and HISTORY
    const [
      profileFacts,
      historyFacts,
      webSearchResult,
    ] = await Promise.all([
      loadRelevantMemory(profileKey, lastUserMessage, "profile"),
      loadRelevantMemory(historyKey, lastUserMessage, "history"),
      needsWeb
        ? runWebSearch(lastUserMessage)
        : Promise.resolve({ results: [], used: false }),
    ]);

    let memoryBlock = "";
    const linesProfile = (profileFacts || []).map(
      (f) => `• [PROFILE] ${f.key}: ${f.value}`
    );
    const linesHistory = (historyFacts || []).map(
      (f) => `• [HISTORY] ${f.key}: ${f.value}`
    );
    const allLines = [...linesProfile, ...linesHistory];

    if (allLines.length > 0) {
      memoryBlock = `

---
MEMORY (things you know about this user):
${allLines.join("\n")}
---`;
    }

    let attachmentNote = "";
    if (attachments.length > 0) {
      const lines = attachments
        .map(
          (a) =>
            `• ${a.name} (type: ${a.type}, size: ${a.size} bytes${
              a.fileId ? `, id: ${a.fileId}` : ""
            })`
        )
        .join("\n");

      attachmentNote =
        `

---
ATTACHMENTS (files/images the user uploaded in this chat):
${lines}
You cannot literally open pixels or binary here, but you should act as if you know these files exist.
Ask the user what they want to do with them, what part matters, and use their description to help.
---`;
    }

    let webBlock = "";
    const sourcesForClient = [];
    if (webSearchResult.results && webSearchResult.results.length > 0) {
      const lines = webSearchResult.results
        .map(
          (r) =>
            `[${r.id}] ${r.title}
URL: ${r.url}
Snippet: ${r.snippet || ""}`
        )
        .join("\n\n");

      webBlock = `

---
WEB_RESULTS (numbered web search results):
${lines}
---
When you cite a fact from these, include [result_number] in your answer, like [1] or [2].`;

      webSearchResult.results.forEach((r) => {
        sourcesForClient.push({
          id: r.id,
          title: r.title,
          url: r.url,
          snippet: r.snippet,
          imageUrl: r.imageUrl,
          favicon: r.favicon,
        });
      });
    }

    // Mode hint
    let modeInstruction = "";
    if (mode === "coder") {
      modeInstruction = `

---
MODE: CODER
- Prioritize helping with programming, debugging, and explaining code.
- Use clear code blocks and comments.
- Prefer concrete examples over theory.
- Default to slightly more serious, but still friendly.`;
    } else if (mode === "study") {
      modeInstruction = `

---
MODE: STUDY
- Act like a patient study buddy or tutor.
- Break explanations into small, clear steps.
- Use simple examples and ask quick check questions sometimes.
- Stay encouraging and never make the user feel dumb.`;
    } else {
      modeInstruction = `

---
MODE: CHAT
- Act like a chill tech/gaming friend.
- Focus on conversation, opinions, and light help unless the user asks for deep detail.`;
    }

    // Depth hint
    let depthInstruction = "";
    if (depth === 0) {
      depthInstruction = `
---
DEPTH: SHALLOW
- Focus mainly on the last few user turns.
- Do not rely heavily on older conversation context unless absolutely necessary.`;
    } else if (depth === 2) {
      depthInstruction = `
---
DEPTH: DEEP
- Consider more of the prior conversation and memory facts.
- Try to keep long-running context and threads consistent.`;
    } else {
      depthInstruction = `
---
DEPTH: NORMAL
- Use a balanced amount of context from earlier in the conversation.`;
    }

    // Strip unsupported fields like `attachments` before sending to Groq
    const cleanedMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
      // keep name if you ever use it; drop attachments and others
    }));

    const groqMessages = [
      {
        role: "system",
        content:
          SYSTEM_PROMPT +
          modeInstruction +
          depthInstruction +
          memoryBlock +
          attachmentNote +
          webBlock,
      },
      ...cleanedMessages,
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: groqMessages,
      max_tokens: 1024,
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      "I had trouble generating a reply.";

    // Background tasks: save messages + update memory
    (async () => {
      try {
        await Promise.all([
          saveMessage(historyKey, "user", lastUserMessage),
          saveMessage(historyKey, "assistant", reply),
        ]);

        const extraction = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `Extract factual things to remember about the user from this exchange.
Return JSON only: { "upsert": [...], "delete": [] }.
Use keys like "name", "interests", "preferences", "goals" for long-term profile.
Use keys like "current_project", "recent_topic" for chat-specific history.`,
            },
            { role: "user", content: lastUserMessage },
            { role: "assistant", content: reply },
          ],
          response_format: { type: "json_object" },
          max_tokens: 512,
        });

        try {
          const parsed = JSON.parse(
            extraction.choices[0].message.content || "{}"
          );
          const upsert = Array.isArray(parsed.upsert) ? parsed.upsert : [];
          const del = Array.isArray(parsed.delete) ? parsed.delete : [];

          if (upsert.length > 0 || del.length > 0) {
            const profileUpsert = upsert.filter(
              (f) =>
                f.category === "profile" ||
                ["name", "interests", "preferences", "goals"].includes(f.key)
            );
            const historyUpsert = upsert.filter(
              (f) => !profileUpsert.includes(f)
            );

            const profileDel = del.filter(
              (f) =>
                f.category === "profile" ||
                ["name", "interests", "preferences", "goals"].includes(f.key)
            );
            const historyDel = del.filter((f) => !profileDel.includes(f));

            const tasks = [];
            if (profileUpsert.length || profileDel.length) {
              tasks.push(
                upsertMemoryFacts(profileKey, profileUpsert, profileDel, "profile")
              );
            }
            if (historyUpsert.length || historyDel.length) {
              tasks.push(
                upsertMemoryFacts(historyKey, historyUpsert, historyDel, "history")
              );
            }
            if (tasks.length) {
              await Promise.all(tasks);
            }
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
      sources: sourcesForClient,
      meta: {
        latencyMs: Date.now() - start,
        model: "llama-3.3-70b-versatile",
        memoryUsed: (profileFacts?.length || 0) + (historyFacts?.length || 0),
        webUsed: !!webSearchResult.used,
        mode,
        depth,
        research,
      },
    });
  } catch (err) {
    console.error("AI handler error:", err);
    return res.status(500).json({ error: "AI error" });
  }
}
