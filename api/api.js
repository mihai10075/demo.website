async function callMihAIBackend(payload) {
  const res = await fetch("/api/api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": state.authToken ? `Bearer ${state.authToken}` : ""
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error("Backend error");
  return res.json();
}

async function streamMihAIReply(payload, onChunk, onDone) {
  const response = await fetch("/api/api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": state.authToken ? `Bearer ${state.authToken}` : ""
    },
    body: JSON.stringify(payload)
  });

  if (!response.body) {
    const { reply } = await response.json();
    onDone(reply);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    fullText += chunk;
    onChunk(fullText);
  }

  onDone(fullText);
}