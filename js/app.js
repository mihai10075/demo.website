function createNewChat() {
  const id = "chat-" + crypto.randomUUID();
  state.chats[id] = { title: "New Chat", messages: [] };
  state.currentChatId = id;
  saveChats();
  renderChats();
  renderMessages();
}

async function autoGenerateTitle(chat) {
  if (chat.messages.length < 2) return;

  const { reply } = await callMihAIBackend({
    userId: state.userId,
    chatId: state.currentChatId,
    messages: [
      { role: "system", content: "Generate a short 3-5 word title." },
      ...chat.messages.slice(0, 4)
    ],
    model: state.selectedModel
  });

  chat.title = reply.replace(/["']/g, "");
  saveChats();
  renderChats();
}

async function sendMessage() {
  const input = document.getElementById("messageInput");
  const text = input.value.trim();
  if (!text || state.isLoading) return;

  input.value = "";
  const chat = state.chats[state.currentChatId];

  chat.messages.push({ role: "user", content: text });
  addMessage("user", text);

  const assistantDiv = addMessage("assistant", "");
  setLoading(true);

  await compressMemoryIfNeeded(chat);

  await streamMihAIReply(
    {
      userId: state.userId,
      chatId: state.currentChatId,
      messages: chat.messages,
      model: state.selectedModel
    },
    (partial) => {
      assistantDiv.innerHTML = renderMarkdown(partial);
    },
    async (finalText) => {
      chat.messages.push({ role: "assistant", content: finalText });

      if (chat.title === "New Chat") {
        await autoGenerateTitle(chat);
      }

      saveChats();
      if (state.voiceReplies) speak(finalText);
      setLoading(false);
    }
  );
}

/* INIT */

document.getElementById("sendBtn").onclick = sendMessage;
document.getElementById("newChatBtn").onclick = createNewChat;

if (Object.keys(state.chats).length === 0) {
  createNewChat();
} else {
  state.currentChatId = Object.keys(state.chats)[0];
  renderChats();
  renderMessages();
}

setupVoice();