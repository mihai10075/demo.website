const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const celebrateBtn = document.getElementById("celebrateBtn");

let isTyping = false;

// Helper: scroll chat to bottom
function scrollChat() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Helper: add a chat message
function addMessage(content, role = "ai") {
  const msg = document.createElement("div");
  msg.className = "chat-msg " + (role === "user" ? "chat-msg-user" : "chat-msg-ai");
  msg.textContent = content;
  chatBox.appendChild(msg);
  scrollChat();
}

// Typing indicator
function addTypingIndicator() {
  const typing = document.createElement("div");
  typing.id = "typingIndicator";
  typing.className = "chat-msg chat-msg-ai";
  typing.textContent = "MihAI is typing...";
  chatBox.appendChild(typing);
  scrollChat();
}

function removeTypingIndicator() {
  const typing = document.getElementById("typingIndicator");
  if (typing) typing.remove();
}

// Handle sending user message
async function sendMessage() {
  const message = userInput.value.trim();
  if (!message || isTyping) return;
  
  addMessage(message, "user");
  userInput.value = "";
  
  isTyping = true;
  addTypingIndicator();

  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, userId: localStorage.getItem("userId") || "anon" })
    });

    const data = await res.json();
    removeTypingIndicator();
    isTyping = false;

    // Animate reply character by character
    const reply = data.reply || "Oops, something went wrong 😅";
    animateReply(reply);
  } catch (err) {
    removeTypingIndicator();
    isTyping = false;
    addMessage("Error contacting AI backend 😭");
    console.error(err);
  }
}

// Animate AI message text
function animateReply(text) {
  const msg = document.createElement("div");
  msg.className = "chat-msg chat-msg-ai";
  chatBox.appendChild(msg);
  scrollChat();

  let i = 0;
  const interval = setInterval(() => {
    msg.textContent += text[i];
    i++;
    scrollChat();
    if (i >= text.length) clearInterval(interval);
  }, 20);
}

// Celebrate confetti
celebrateBtn.addEventListener("click", () => {
  confetti();
});

// Enter key sends message
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

// Send button
sendBtn.addEventListener("click", sendMessage);

// Confetti animation
function confetti() {
  const colors = ["#38bdf8", "#f97316", "#22c55e", "#facc15"];
  for (let i = 0; i < 80; i++) {
    const particle = document.createElement("div");
    particle.style.position = "fixed";
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    particle.style.width = particle.style.height = `${Math.random() * 6 + 4}px`;
    particle.style.left = `${Math.random() * window.innerWidth}px`;
    particle.style.top = `-${Math.random() * 20}px`;
    particle.style.borderRadius = "50%";
    particle.style.opacity = 0.8;
    particle.style.zIndex = 9999;
    particle.style.pointerEvents = "none";
    document.body.appendChild(particle);

    let fall = 0;
    const fallInterval = setInterval(() => {
      fall += Math.random() * 4 + 2;
      particle.style.top = fall + "px";
      particle.style.transform = `rotate(${fall * 3}deg)`;
      if (fall > window.innerHeight) {
        particle.remove();
        clearInterval(fallInterval);
      }
    }, 16);
  }
}

// Initialize user ID
if (!localStorage.getItem("userId")) {
  localStorage.setItem("userId", "user-" + Math.floor(Math.random() * 1e6));
}