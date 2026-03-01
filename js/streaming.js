async function streamMihAIReply(payload, onChunk, onDone) {
  const response = await fetch("/api/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.body) {
    throw new Error("Streaming not supported");
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