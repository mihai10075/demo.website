// /lib/page-reader.ts
// Fetch URLs on the server and return cleaned text content.

export type PageResult = {
  url: string;
  text: string;
};

function cleanHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<head[\s\S]*?>[\s\S]*?<\/head>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchAndCleanPages(urls: string[]): Promise<PageResult[]> {
  const pages: PageResult[] = [];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "MihAiBot/1.0 (+https://your-domain.example)"
        }
      });

      if (!res.ok) {
        console.error("Failed to fetch page (status):", url, res.status);
        continue;
      }

      const html = await res.text();
      const text = cleanHtml(html).slice(0, 10000); // cap length for token limits

      pages.push({ url, text });
    } catch (err) {
      console.error("Failed to fetch page:", url, err);
    }
  }

  return pages;
}
