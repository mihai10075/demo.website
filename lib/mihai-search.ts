// /lib/mihai-search.ts
// MihAi search engine: intent classification, query planning,
// (stub) web search, page fetching, and Groq LLM synthesis.

import Groq from "groq-sdk";
import { fetchAndCleanPages } from "./page-reader";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!
});

if (!process.env.GROQ_API_KEY) {
  console.warn("Warning: GROQ_API_KEY is not set. MihAi search will fail without it.");
}

type Source = {
  id: number;
  url: string;
  title: string;
  snippet?: string;
  score?: number;
};

type SearchResult = {
  url: string;
  title: string;
  snippet: string;
  publishedAt?: string;
};

type Page = {
  url: string;
  text: string;
};

export type MihAiResult = {
  answer: string;
  sources: Source[];
  subqueries: string[];
  recursiveQueries: string[];
  pagesRead: number;
};

type Intent =
  | "lookup"
  | "tutorial"
  | "comparison"
  | "debugging"
  | "research";

type Depth = "light" | "deep";

function classifyIntent(message: string): Intent {
  const lower = message.toLowerCase();

  if (lower.includes("compare") || lower.includes(" vs ")) return "comparison";
  if (lower.includes("how to") || lower.includes("tutorial")) return "tutorial";
  if (lower.includes("error") || lower.includes("exception") || lower.includes("bug")) {
    return "debugging";
  }
  if (lower.includes("research") || lower.includes("study")) return "research";

  return "lookup";
}

function decideDepth(intent: Intent): Depth {
  if (intent === "research") return "deep";
  if (intent === "comparison" || intent === "tutorial") return "light";
  return "light";
}

/**
 * Very simple query optimizer. You can improve this later.
 */
function optimizeQueries(message: string, intent: Intent): string[] {
  const base = message.trim();

  const queries: string[] = [
    base,
    `${base} explanation`,
    `${base} guide`,
    `${base} latest information`
  ];

  if (intent === "debugging") {
    queries.push(`${base} fix`);
    queries.push(`${base} stackoverflow solution`);
  }

  return queries.slice(0, 6);
}

/**
 * Stub search function.
 * TODO: Replace this with a real search API (Tavily, SerpAPI, custom endpoint, etc.)
 */
async function searchWeb(query: string): Promise<SearchResult[]> {
  if (!process.env.SERPER_API_KEY) {
    console.warn("SERPER_API_KEY is not set; searchWeb will return no results.");
    return [];
  }

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        q: query,
        num: 10
      })
    });

    if (!res.ok) {
      console.error("Serper search failed:", res.status, await res.text());
      return [];
    }

    const data = await res.json();

    const results: SearchResult[] = [];

    // Organic results (normal web pages)
    if (Array.isArray(data.organic)) {
      for (const item of data.organic) {
        results.push({
          url: item.link,
          title: item.title || item.link,
          snippet: item.snippet || "",
          publishedAt: item.date || undefined
        });
      }
    }

    return results;
  } catch (err) {
    console.error("Serper search error:", err);
    return [];
  }
}


function authorityScore(url: string): number {
  const u = url.toLowerCase();
  if (u.includes("wikipedia")) return 0.9;
  if (u.includes("github")) return 0.85;
  if (u.includes("stack overflow") || u.includes("stackoverflow")) return 0.8;
  if (u.includes(".edu") || u.includes(".gov")) return 0.9;
  return 0.6;
}

function recencyScore(date?: string): number {
  if (!date) return 0.5;

  const diff = Date.now() - new Date(date).getTime();
  const days = diff / (1000 * 60 * 60 * 24);

  if (days < 30) return 1;
  if (days < 365) return 0.8;

  return 0.5;
}

function rankResults(results: SearchResult[]): SearchResult[] {
  return results
    .map((r) => ({
      ...r,
      score: authorityScore(r.url) * 0.5 + recencyScore(r.publishedAt) * 0.5
    }))
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 6);
}

/**
 * Generate extra follow-up queries for "deep" research.
 * For now it’s simple and based on the original question only.
 */
function generateFollowupQueries(_pages: Page[], originalQuery: string): string[] {
  const queries: string[] = [];
  queries.push(`${originalQuery} detailed explanation`);
  queries.push(`${originalQuery} pros and cons`);
  queries.push(`${originalQuery} examples`);
  return queries.slice(0, 3);
}

/**
 * Use Groq (Llama) to synthesize a structured research report.
 */
async function synthesizeResearchReport(
  message: string,
  pages: Page[],
  sources: Source[]
): Promise<string> {
  const combined = pages
    .map((p, idx) => `Source [${idx + 1}] (${p.url}):\n${p.text.slice(0, 2000)}`)
    .join("\n\n");

  const systemPrompt = `
You are MihAi, a web-enhanced research assistant.
Write a structured research report with:
- Summary
- Key Findings (bulleted)
- Detailed Analysis
- Sources list with numbered citations [1], [2], etc.
Be honest about uncertainty. If information is weak or conflicting, say so.
`;

  const userPrompt = `
User question:
${message}

Research content:
${combined}

Sources metadata:
${sources.map((s) => `[${s.id}] ${s.title} - ${s.url}`).join("\n")}
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-70b-versatile", // change to the model you actually use
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.4
  });

  const content = completion.choices[0]?.message?.content;
  return content ?? "I could not generate a research report.";
}

/**
 * Main entrypoint used by the API route.
 */
export async function runMihAiSearch(
  message: string,
  userId?: string
): Promise<MihAiResult> {
  const intent = classifyIntent(message);
  const depth = decideDepth(intent);

  const subqueries = optimizeQueries(message, intent);

  let allResults: SearchResult[] = [];

  // First wave of searches
  for (const q of subqueries) {
    const results = await searchWeb(q);
    allResults.push(...results);
  }

  // Rank and pick top URLs
  let ranked = rankResults(allResults);
  let urls = ranked.map((r) => r.url);

  // Fetch pages for the ranked URLs
  let pages = await fetchAndCleanPages(urls);

  // Optional deep / recursive research
  const recursiveQueries: string[] = [];
  if (depth === "deep") {
    const followups = generateFollowupQueries(pages, message);
    recursiveQueries.push(...followups);

    for (const q of followups) {
      const results = await searchWeb(q);
      allResults.push(...results);
    }

    // Re-rank after adding recursive results
    ranked = rankResults(allResults);
    urls = ranked.map((r) => r.url);
    pages = await fetchAndCleanPages(urls);
  }

  const sources: Source[] = ranked.map((r, i) => ({
    id: i + 1,
    url: r.url,
    title: r.title,
    snippet: r.snippet
  }));

  const answer = await synthesizeResearchReport(message, pages, sources);

  return {
    answer,
    sources,
    subqueries,
    recursiveQueries,
    pagesRead: pages.length
  };
}
