// pages/api/memory.js
const BASE44_APP_URL = "https://mihai-memory-core.base44.app";

async function queryFacts(userId, category) {
  try {
    const res = await fetch(`${BASE44_APP_URL}/functions/queryMemory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        category,
        message: "list memory facts",
        limit: 32,
      }),
    });
    const { facts = [] } = await res.json();
    return facts;
  } catch (e) {
    console.error("[queryFacts]", e.message);
    return [];
  }
}

async function upsertFacts(userId, category, upsert = [], del = []) {
  try {
    const res = await fetch(`${BASE44_APP_URL}/functions/upsertMemory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        category,
        upsert,
        delete: del,
      }),
    });
    return await res.json();
  } catch (e) {
    console.error("[upsertFacts]", e.message);
    return null;
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

  if (!safeUserId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const historyKey = safeChatId
    ? `${safeUserId}:${safeChatId}`
    : `${safeUserId}:default`;

  if (req.method === "GET") {
    const [profile, history] = await Promise.all([
      queryFacts(safeUserId, "profile"),
      queryFacts(historyKey, "history"),
    ]);
    return res.status(200).json({ ok: true, profile, history });
  }

  if (req.method === "POST") {
    const { profile = {}, history = {} } = req.body || {};
    const tasks = [];

    if (profile.upsert || profile.delete) {
      tasks.push(
        upsertFacts(
          safeUserId,
          "profile",
          profile.upsert || [],
          profile.delete || []
        )
      );
    }
    if (history.upsert || history.delete) {
      tasks.push(
        upsertFacts(
          historyKey,
          "history",
          history.upsert || [],
          history.delete || []
        )
      );
    }

    if (tasks.length) {
      await Promise.all(tasks);
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
