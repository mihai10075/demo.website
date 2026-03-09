// /hooks/useMihAiSearch.ts
// React hook to call /api/mihai-search from the frontend.

import { useState } from "react";

export type MihAiSource = {
  id: number;
  url: string;
  title: string;
  snippet?: string;
};

export type MihAiDebugInfo = {
  subqueries: string[];
  recursiveQueries?: string[];
  pagesRead: number;
  tookMs: number;
};

export function useMihAiSearch() {
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<MihAiSource[]>([]);
  const [debug, setDebug] = useState<MihAiDebugInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function askMihAi(message: string) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/mihai-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Request failed");
      }

      const data = await res.json();

      setAnswer(data.answer ?? null);
      setSources(data.sources ?? []);
      setDebug(data.debug ?? null);
    } catch (err: any) {
      console.error("MihAi request failed:", err);
      setError(err?.message || "Failed to contact MihAi");
    } finally {
      setLoading(false);
    }
  }

  return {
    askMihAi,
    answer,
    sources,
    debug,
    loading,
    error
  };
}
