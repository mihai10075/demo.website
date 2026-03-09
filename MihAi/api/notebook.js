// pages/api/notebook.js
const BASE44_APP_URL = "https://mihai-memory-core.base44.app";

async function saveNotebook(userKey, content) {
  try {
    const res = await fetch(`${BASE44_APP_URL}/functions/upsertMemory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: userKey,
        category: "notebook",
        upsert: [
          {
            key: "notebook",
            value: content,
          },
        ],
        delete: [],
      }),
    });
    return await res.json();
  } catch (e) {
    console.error("[saveNotebook]", e.message);
    return null;
  }
}

async function loadNotebook(userKey) {
  try {
    const res = await fetch(`${BASE44_APP_URL}/functions/queryMemory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: userKey,
        category: "notebook",
        message: "load notebook",
        limit: 1,
      }),
    });
    const { facts = [] } = await res.json();
    const fact = facts.find((f) => f.key === "notebook");
    return fact?.value || "";
  } catch (e) {
    console.error("[loadNotebook]", e.message);
    return "";
  }
}

export default async function handler(req, res) {
  const { userId, chatId } = req.query || {};
  const safeUserId =
    typeof userId === "string" && userId.trim().length > 0
      ? userId.trim()
      : null;
  const safeChatId =
    typeof chatId === "string" && chatId.trim().length > 0
      ? chatId.trim()
      : null;

  if (!safeUserId || !safeChatId) {
    return res.status(400).json({ error: "Missing userId or chatId" });
  }

  const notebookKey = `${safeUserId}:${safeChatId}:notebook`;

  if (req.method === "GET") {
    const content = await loadNotebook(notebookKey);
    return res.status(200).json({ ok: true, content });
  }

  if (req.method === "POST") {
    const { content = "" } = req.body || {};
    await saveNotebook(notebookKey, String(content || ""));
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
