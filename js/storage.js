function saveChats() {
  localStorage.setItem("mihai_chats", JSON.stringify(state.chats));
}

function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}