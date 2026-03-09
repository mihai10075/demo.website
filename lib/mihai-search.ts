// /api/mihai-search.ts
// Vercel Serverless Function: receives { message, userId? } and returns MihAi result.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runMihAiSearch } from "../lib/mihai-search";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, userId } = req.body ?? {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing or invalid message" });
    }

    const result = await runMihAiSearch(message, userId);

    const tookMs = Date.now() - start;

    return res.status(200).json({
      answer: result.answer,
      sources: result.sources,
      debug: {
        subqueries: result.subqueries,
        recursiveQueries: result.recursiveQueries ?? [],
        pagesRead: result.pagesRead,
        tookMs
      }
    });
  } catch (err) {
    console.error("MihAi search error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
