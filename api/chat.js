export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { message } = req.body || {};

    if (!message) {
      res.status(400).json({ error: 'No message provided' });
      return;
    }

    // IMPORTANT: put your real OpenAI API key here or (better) in an env var
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      res.status(500).json({ error: 'OPENAI_API_KEY not set on server' });
      return;
    }

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content:
              "You are a friendly, slightly chaotic helper living inside Demo.website. Keep answers fairly short, avoid saying you're Polyglot, and don't introduce yourself every time.",
          },
          {
            role: 'user',
            content: message,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!openaiRes.ok) {
  const errorText = await openaiRes.text();
  console.error('OpenAI error:', errorText);
  res.status(500).json({ error: 'AI request failed' });
  return;
}


    const data = await openaiRes.json();
    const reply =
      data.choices?.[0]?.message?.content?.trim() ||
      "My brain glitched for a sec. Try again.";

    // This shape matches what your frontend expects when there's no stream
    res.status(200).json({ reply });
  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
