const state = {
  userId: localStorage.getItem("mihai_user") || "guest-" + crypto.randomUUID(),
  authToken: localStorage.getItem("mihai_token") || null,
  chats: JSON.parse(localStorage.getItem("mihai_chats") || "{}"),
  currentChatId: null,
  voiceReplies: localStorage.getItem("mihai_voice") === "on",
  selectedModel: localStorage.getItem("mihai_model") || "default",
  isLoading: false
};

localStorage.setItem("mihai_user", state.userId);