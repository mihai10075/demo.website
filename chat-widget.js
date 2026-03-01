/* =========================
   MihAI Ultra Frontend
=========================*/

let userId = localStorage.getItem("mihai_user")
  || "guest-" + crypto.randomUUID();

localStorage.setItem("mihai_user", userId);

let chats = JSON.parse(localStorage.getItem("mihai_chats") || "{}");
let currentChatId = null;

/* DOM */
const chatContainer = document.getElementById("chatContainer");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const chatList = document.getElementById("chatList");
const themeToggle = document.getElementById("themeToggle");
const voiceBtn = document.getElementById("voiceBtn");
const fileInput = document.getElementById("fileInput");

/* ===== Utility ===== */

function saveChats() {
  localStorage.setItem("mihai_chats", JSON.stringify(chats));
}

function scrollBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

/* ===== Chat Management ===== */

function createNewChat() {
  const id = "chat-" + crypto.randomUUID();
  chats[id] = { title: "New Chat", messages: [] };
  currentChatId = id;
  saveChats();
  renderChats();
  renderMessages();
}

function renderChats() {
  chatList.innerHTML = "";
  Object.entries(chats).forEach(([id, chat]) => {
    const div = document.createElement("div");
    div.className = "chat-item";
    div.textContent = chat.title;
    div.onclick = () => {
      currentChatId = id;
      renderMessages();
    };
    chatList.appendChild(div);
  });
}

function renderMessages() {
  chatContainer.innerHTML = "";
  if (!currentChatId) return;

  chats[currentChatId].messages.forEach(msg => {
    addMessage(msg.role, msg.content);
  });
}

function addMessage(role, content) {
  const div = document.createElement("div");
  div.className = "message " + role;
  div.textContent = content;
  chatContainer.appendChild(div);
  scrollBottom();
}

/* ===== File Upload ===== */

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  const text = await file.text();
  chats[currentChatId].messages.push({
    role: "system",
    content: "Document:\n" + text.slice(0, 12000)
  });

  alert("Document loaded into context.");
});

/* ===== Voice ===== */

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "en-US";

voiceBtn.onclick = () => recognition.start();

recognition.onresult = e => {
  messageInput.value = e.results[0][0].transcript;
  sendMessage();
};

function speak(text) {
  speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

/* ===== Send Message (Streaming) ===== */

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !currentChatId) return;

  messageInput.value = "";

  chats[currentChatId].messages.push({ role: "user", content: text });
  addMessage("user", text);

  const assistantDiv = document.createElement("div");
  assistantDiv.className = "message assistant";
  chatContainer.appendChild(assistantDiv);

  const response = await fetch("/api/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      chatId: currentChatId,
      messages: chats[currentChatId].messages
    })
  });

  const data = await response.json();
  assistantDiv.textContent = data.reply;

  chats[currentChatId].messages.push({
    role: "assistant",
    content: data.reply
  });

  speak(data.reply);

  if (chats[currentChatId].title === "New Chat") {
    chats[currentChatId].title = text.slice(0, 20);
  }

  saveChats();
  renderChats();
}

sendBtn.onclick = sendMessage;
messageInput.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

/* ===== Theme ===== */

if (localStorage.getItem("mihai_theme") === "light") {
  document.body.classList.add("light");
}

themeToggle.onclick = () => {
  document.body.classList.toggle("light");
  localStorage.setItem(
    "mihai_theme",
    document.body.classList.contains("light") ? "light" : "dark"
  );
};

/* ===== Init ===== */

if (Object.keys(chats).length === 0) {
  createNewChat();
} else {
  currentChatId = Object.keys(chats)[0];
  renderChats();
  renderMessages();
}
