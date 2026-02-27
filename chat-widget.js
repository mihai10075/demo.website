// chat-widget.js
const form = document.getElementById("chat-form");
const input = document.getElementById("chat-input");
const chatBox = document.getElementById("chat-box");

function addMessage(text, who) {
  const div = document.createElement("div");
  div.className = `chat-msg chat-msg-${who}`;
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  addMessage(text, "user");
  input.value = "";
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
      return;
    }

    addMessage(data.reply, "ai");
  } catch (err) {
    console.error(err);
    const typing = chatBox.querySelector(".chat-msg-ai-typing");
    if (typing) typing.remove();
    addMessage("network issue, try again.", "ai");
  }
});
