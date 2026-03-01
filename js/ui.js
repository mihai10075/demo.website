const chatContainer = document.getElementById("chatContainer");
const chatList = document.getElementById("chatList");

function scrollBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function setLoading(isLoading) {
  state.isLoading = isLoading;
  document.getElementById("sendBtn").disabled = isLoading;
  document.getElementById("messageInput").disabled = isLoading;
}

function addMessage(role, content) {
  const div = document.createElement("div");
  div.className = "message " + role;
  div.innerHTML = renderMarkdown(content);
  chatContainer.appendChild(div);
  scrollBottom();
  return div;
}

function renderChats() {
  chatList.innerHTML = "";

  Object.entries(state.chats).forEach(([id, chat]) => {
    const wrapper = document.createElement("div");
    wrapper.className = "chat-item-wrapper";

    const title = document.createElement("div");
    title.className = "chat-item" + (id === state.currentChatId ? " active" : "");
    title.textContent = chat.title;

    title.onclick = () => {
      state.currentChatId = id;
      renderChats();
      renderMessages();
    };

    const rename = document.createElement("button");
    rename.textContent = "✏️";
    rename.onclick = (e) => {
      e.stopPropagation();
      const newName = prompt("Rename chat:", chat.title);
      if (newName) {
        chat.title = newName;
        saveChats();
        renderChats();
      }
    };

    const del = document.createElement("button");
    del.textContent = "🗑";
    del.onclick = (e) => {
      e.stopPropagation();
      if (confirm("Delete chat?")) {
        delete state.chats[id];
        saveChats();
        state.currentChatId = Object.keys(state.chats)[0] || null;
        renderChats();
        renderMessages();
      }
    };

    wrapper.appendChild(title);
    wrapper.appendChild(rename);
    wrapper.appendChild(del);
    chatList.appendChild(wrapper);
  });
}

function renderMessages() {
  chatContainer.innerHTML = "";
  const chat = state.chats[state.currentChatId];
  if (!chat) return;
  chat.messages.forEach(m => addMessage(m.role, m.content));
}