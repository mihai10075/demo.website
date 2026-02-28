const fetch = require("node-fetch");

const GROQ_API_KEY = process.env.GROQ_API_KEY;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing message" });
    }

    // 1) Call Groq's OpenAI-compatible chat endpoint
    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content:
                "You are a friendly, chill AI for demo.website. Keep answers short, casual, and helpful.",
            },
            { role: "user", content: message },
          ],
        }),
      }
    );

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("Groq API error:", groqResponse.status, errorText);
      return res
        .status(500)
        .json({ error: "AI error from Groq", details: errorText });
    }

    const data = await groqResponse.json();

    const reply =
      data.choices?.[0]?.message?.content ||
      "I had trouble generating a reply.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Groq handler error:", err);
    return res.status(500).json({ error: "AI error" });
  }
};
