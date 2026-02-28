// chat-widget.js
const form = document.getElementById("chat-form");
const input = document.getElementById("chat-input");
const chatBox = document.getElementById("chat-box");

const STORAGE_KEY = "demo_website_ai_chat";

// add a message (user, ai, or typing)
function addMessage(text, who) {
  const div = document.createElement("div");

  if (who === "ai-typing") {
    div.className = "chat-msg chat-msg-ai chat-msg-ai-typing";
  } else {
    div.className = `chat-msg chat-msg-${who}`;
  }

  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// smooth typing for AI reply
async function typeMessage(text) {
  const div = document.createElement("div");
  div.className = "chat-msg chat-msg-ai";
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;

  let i = 0;
  const speed = 18; // ms per character

  while (i < text.length) {
    div.textContent = text.slice(0, i + 1);
    chatBox.scrollTop = chatBox.scrollHeight;
    i++;
    await new Promise((r) => setTimeout(r, speed));
  }
}

// save chat history to localStorage
function saveChatHistory() {
  const messages = Array.from(chatBox.querySelectorAll(".chat-msg")).map(
    (el) => ({
      text: el.textContent,
      who: el.classList.contains("chat-msg-user") ? "user" : "ai",
    })
  );
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch (e) {
    console.error("Failed to save chat history", e);
  }
}

// load chat history on page load
function loadChatHistory() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const messages = JSON.parse(raw);
    messages.forEach((msg) => addMessage(msg.text, msg.who));
  } catch (e) {
    console.error("Failed to load chat history", e);
  }
}

// run once on page load
loadChatHistory();

// Rex mascot confetti + pop (middle avatar)
const aiMascot = document.getElementById("ai-mascot");
if (aiMascot) {
  aiMascot.addEventListener("click", () => {
    const rect = aiMascot.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    if (window.confetti) {
      window.confetti({
        particleCount: 120,
        spread: 80,
        origin: { x, y },
      });
    }

    const pop = document.getElementById("pop-sound");
    if (pop) {
      pop.currentTime = 0;
      pop.play().catch(() => {});
    }
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  // user message
  addMessage(text, "user");
  saveChatHistory();
  input.value = "";

  // typing indicator
  addMessage("…", "ai-typing");

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    const data = await res.json();

    // remove typing bubble
    const typing = chatBox.querySelector(".chat-msg-ai-typing");
    if (typing) typing.remove();

    if (!res.ok || !data.reply) {
      addMessage("sorry, the ai scuffed out. try again later.", "ai");
      saveChatHistory();
      return;
    }

    // smooth typing instead of instant message
    await typeMessage(data.reply);
    saveChatHistory();
  } catch (err) {
    console.error(err);
    const typing = chatBox.querySelector(".chat-msg-ai-typing");
    if (typing) typing.remove();
    addMessage("network issue, try again.", "ai");
    saveChatHistory();
  }
});
