// api/mihai-chat-proxy.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import runMihAiSearch from "../lib/mihai-search";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  try {
    const {
      userId,
      messages,
    } = (req.body as any) ?? {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ ok: false, error: "Missing messages array" });
      return;
    }

    const lastUserMessage =
      [...messages]
        .reverse()
        .find(
          (m: any) =>
            m &&
            m.role === "user" &&
            typeof m.content === "string" &&
            m.content.trim().length > 0
        )?.content || "";

    const result = await runMihAiSearch(lastUserMessage, userId);

    const tookMs = Date.now() - start;

    res.status(200).json({
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
    console.error("MihAi proxy error:", err);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
}
