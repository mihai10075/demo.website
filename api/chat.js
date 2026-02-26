export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { message } = req.body || {};

  if (!message) {
    res.status(400).json({ error: 'No message provided' });
    return;
  }

  // TEMP DUMMY AI: just echoes back the message with a fun prefix
  res.status(200).json({
    reply: `Demo.website brain says: ${message}`,
  });
}
