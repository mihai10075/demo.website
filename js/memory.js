async function compressMemoryIfNeeded(chat) {
  const totalTokens = chat.messages.reduce(
    (sum, m) => sum + estimateTokens(m.content),
    0
  );

  if (totalTokens < 4000) return;

  const summaryPrompt = [
    { role: "system", content: "Summarize this conversation for memory compression." },
    ...chat.messages
  ];

  const { reply } = await callMihAIBackend({
    userId: state.userId,
    chatId: state.currentChatId,
    messages: summaryPrompt,
    model: state.selectedModel
  });

  chat.messages = [
    { role: "system", content: "Conversation summary memory: " + reply }
  ];

  saveChats();
}