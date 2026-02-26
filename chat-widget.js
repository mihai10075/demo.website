(function() {
  const CONFIG = {
    API_URL: 'https://gcbyo62g--chat.functions.blink.new', // or add /chat if your route is /chat
    WIDGET_ID: 'polyglot-widget'
  };

  let history = [];
  let isOpen = false;

  function init() {
    // Create widget container
    const container = document.createElement('div');
    container.id = CONFIG.WIDGET_ID;
    document.body.appendChild(container);

    container.innerHTML = `
      <div class="chat-bubble" id="chat-bubble">
        <svg viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
      </div>
      <div class="chat-panel" id="chat-panel">
        <div class="chat-header">
          <h3>Polyglot AI</h3>
          <button class="close-btn" id="close-chat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="chat-messages" id="chat-messages">
          <div class="message ai">
            Hello! I'm Polyglot. I can help you in 100+ languages, assist with code,
            and search the web. How can I help today?
          </div>
        </div>
        <div class="chat-input-area">
          <form id="chat-form" class="chat-input-container">
            <input type="text" id="chat-input" placeholder="Type a message..." autocomplete="off">
            <button type="submit" class="send-btn" id="send-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      </div>
    `;

    const bubble = document.getElementById('chat-bubble');
    const panel = document.getElementById('chat-panel');
    const closeBtn = document.getElementById('close-chat');
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    const messagesContainer = document.getElementById('chat-messages');

    bubble.addEventListener('click', () => toggleChat());
    closeBtn.addEventListener('click', () => toggleChat(false));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = input.value.trim();
      if (!message || panel.classList.contains('loading')) return;

      addMessage(message, 'user');
      input.value = '';

      panel.classList.add('loading');
      const sendBtn = document.getElementById('send-btn');
      sendBtn.disabled = true;
      const loadingId = addLoadingIndicator();

      try {
        const response = await fetch(CONFIG.API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, history })
        });

        const data = await response.json();

        removeLoadingIndicator(loadingId);
        panel.classList.remove('loading');
        sendBtn.disabled = false;

        if (data.error) {
          addMessage('Sorry, I encountered an error. Please try again.', 'ai');
        } else {
          addMessage(data.reply, 'ai');
          history = data.history;
        }
      } catch (error) {
        console.error('Chat Error:', error);
        removeLoadingIndicator(loadingId);
        addMessage('Connection error. Please check your internet.', 'ai');
      }
    });

    function toggleChat(force) {
      isOpen = force !== undefined ? force : !isOpen;
      panel.classList.toggle('open', isOpen);
    }

    function addMessage(text, role) {
      const msgDiv = document.createElement('div');
      msgDiv.className = `message ${role}`;

      const formattedText = text
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        .replace(/\n/g, '<br>');

      msgDiv.innerHTML = formattedText;
      messagesContainer.appendChild(msgDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function addLoadingIndicator() {
      const id = 'loading-' + Date.now();
      const loader = document.createElement('div');
      loader.id = id;
      loader.className = 'message ai typing-indicator';
      loader.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
      messagesContainer.appendChild(loader);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      return id;
    }

    function removeLoadingIndicator(id) {
      const loader = document.getElementById(id);
      if (loader) loader.remove();
    }
  }

  // Load CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'chat-widget.css';
  document.head.appendChild(link);

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
