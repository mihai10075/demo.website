// /api/mihai-search.ts
// Vercel Serverless Function: chat-style payload -> MihAI search -> { reply, sources }

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runMihAiSearch } from "../lib/mihai-search";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const {
      userId,
      chatId,
      mode,
      depth,
      research,
      messages,
      attachments,
    } = (req.body as any) ?? {};

    // Basic validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ ok: false, error: "Missing messages array" });
    }

    // Build a single prompt string from the messages for the search layer
    const lastUserMessage =
      [...messages]
        .reverse()
        .find((m: any) => m && m.role === "user" && typeof m.content === "string")
        ?.content || "";

    let extraContext = "";
    if (mode) extraContext += `\nMODE: ${mode.toUpperCase()}`;
    if (typeof depth === "number") extraContext += `\nDEPTH: ${depth}`;
    if (research) extraContext += `\nRESEARCH_MODE: ON`;
    if (attachments && attachments.length) {
      extraContext += `\nATTACHMENTS: ${attachments.length} attached file(s)/image(s).`;
    }
    if (chatId) extraContext += `\nCHAT_ID: ${chatId}`;

    const combinedMessage = `${lastUserMessage}${extraContext}`;

    const result = await runMihAiSearch(combinedMessage, userId);

    const tookMs = Date.now() - start;

    return res.status(200).json({
      ok: true,
      reply: result.answer,
      sources: result.sources ?? [],
      debug: {
        subqueries: result.subqueries,
        recursiveQueries: result.recursiveQueries ?? [],
        pagesRead: result.pagesRead,
        tookMs,
      },
    });
  } catch (err) {
    console.error("MihAi search error:", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
}
