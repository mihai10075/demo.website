function speak(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

function setupVoice() {
  const micBtn = document.getElementById("micBtn");

  if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
    micBtn.disabled = true;
    return;
  }

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  micBtn.onclick = () => recognition.start();

  recognition.onresult = e => {
    document.getElementById("messageInput").value =
      e.results[0][0].transcript;
  };
}