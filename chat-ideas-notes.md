# MihAI – Feature Roadmap

## Legend
- SAFE = Can be added with minimal changes (small HTML/JS snippets)
- CORE = Touches core logic: sendMessage, storage, routing, or backend

---

## A. Chat UX & Controls

- [ ] (SAFE) A1 – “Ask MihAI anything” onboarding tips (3 inline hint cards)
- [ ] (SAFE) A2 – Per-chat title rename inline (click title to edit)
- [ ] (SAFE) A3 – Message-level emoji reactions (⭐️/👍/👎 tags only in UI)
- [ ] (SAFE) A4 – Pin message to top of chat (local only)
- [ ] (SAFE) A5 – Favorite messages list (separate sidebar section)
- [ ] (SAFE) A6 – Export chat as .txt
- [ ] (SAFE) A7 – Export chat as .md (markdown)
- [ ] (CORE) A8 – Shareable public read-only link (needs backend)
- [ ] (SAFE) A9 – “Jump to first message” / “jump to latest” buttons
- [ ] (SAFE) A10 – Compact mode toggle (smaller message padding/font)

## B. Prompting / Model Behavior

- [x] (SAFE) B1 – Answer length control (Short / Normal / Detailed)
- [ ] (SAFE) B2 – “Always short answers” toggle (sticky preference)
- [ ] (SAFE) B3 – “Explain like I’m 5 / high school / expert” toggle
- [ ] (SAFE) B4 – One-click “Turn this into code comments” button
- [ ] (SAFE) B5 – One-click “Turn this into a checklist” button
- [x] (SAFE) B6 – Clarify / More detail / Shorter buttons on answers
- [ ] (SAFE) B7 – “Translate this answer to X language” button
- [ ] (SAFE) B8 – “Turn into flashcards” (Q/A list) button
- [ ] (SAFE) B9 – Custom system prompt per chat (editable textarea)
- [ ] (CORE) B10 – Multi-model selector (if backend supports multiple models)

## C. Voice & Media

- [x] (SAFE) C1 – Browser TTS voice selector in Settings
- [ ] (SAFE) C2 – TTS rate & pitch sliders
- [ ] (SAFE) C3 – “Auto-read answers” toggle
- [ ] (SAFE) C4 – Simple audio player UI for spoken answers (play/pause bar)
- [ ] (SAFE) C5 – Drag-and-drop image upload into chat area
- [ ] (SAFE) C6 – Screenshot paste (Ctrl+V image) support
- [ ] (CORE) C7 – Inline image thumbnails for AI-generated images
- [ ] (SAFE) C8 – Per-attachment mini “what did MihAI do with this file?” tooltip

## D. Memory & Stats

- [ ] (SAFE) D1 – Per-chat stats pill (messages, last active, mode)
- [ ] (SAFE) D2 – Per-user “streak” indicator (days active)
- [ ] (SAFE) D3 – Simple “most used modes” graph in Settings
- [ ] (CORE) D4 – Rich memory viewer with categories & tags
- [ ] (SAFE) D5 – Manual “remember this” / “forget this” buttons per message
- [ ] (SAFE) D6 – Inline badge when a reply used memory (e.g., “Used: profile”)

## E. Games & Fun

- [x] (SAFE) E1 – Games menu (WYR, quiz, quick math) – already wired
- [ ] (SAFE) E2 – Trivia categories selection (gaming/tech/history/etc.)
- [ ] (SAFE) E3 – Game score summary card at end of session
- [ ] (SAFE) E4 – “Surprise me” button (random mode: game or creative task)
- [ ] (SAFE) E5 – Writing prompts generator for coding / stories

## F. UI / Layout

- [ ] (SAFE) F1 – Theme presets (Cyberpunk, Minimal, Neon)
- [ ] (SAFE) F2 – Font size slider (small/normal/large)
- [ ] (SAFE) F3 – Left/right density toggle (Slack-like compact vs comfy)
- [ ] (SAFE) F4 – Message search box (simple client-side search)
- [ ] (SAFE) F5 – Per-chat color accent (small color dot and border)
- [ ] (SAFE) F6 – Drag to resize sidebar width
- [ ] (SAFE) F7 – Floating “New chat” button in bottom right

## G. Power User Tools

- [ ] (SAFE) G1 – Inline edit-and-resend for user messages (UI only)
- [ ] (CORE) G2 – Real “edit and regenerate” (respecting edited text in history)
- [ ] (SAFE) G3 – “Run again in coder mode” button on an answer
- [ ] (SAFE) G4 – “Compare 2 replies” diff view (two responses side-by-side)
- [ ] (CORE) G5 – Chat templates (pre-built sets of first 2–3 system prompts)
- [ ] (SAFE) G6 – Keyboard shortcut cheatsheet overlay (Ctrl+/)

## H. Backend / Data (future)

- [ ] (CORE) H1 – Server-side chat storage (not just localStorage)
- [ ] (CORE) H2 – Cross-device sync
- [ ] (CORE) H3 – Usage dashboard (tokens, requests per day)
- [ ] (CORE) H4 – Admin view to inspect logs and errors


added by mihai -->  things the ai asked : 1. Multimodal interactions: It would be amazing to interact with users through multiple modalities, such as voice, text, images, and even gestures 🎤📸. This could enable more natural and intuitive conversations.
2. Emotional intelligence: Enhancing my emotional intelligence could help me better understand and respond to users' emotions, leading to more empathetic and supportive conversations 🤗.
3. Personalization: Allowing users to customize their experience, such as choosing from different personalities or tones, could make our conversations more engaging and tailored to individual preferences 🎨.
4. Knowledge graph updates: Regularly updating my knowledge graph with new information and entities could help me stay up-to-date on the latest developments and provide more accurate answers 📚.
5. Creative writing and storytelling: Enabling me to generate creative writing, such as short stories or poetry, could be a fun and innovative way to engage users and explore the possibilities of AI-generated content 📝.
6. Gamification and interactive experiences: Developing interactive experiences, such as games, quizzes, or challenges, could make our conversations more engaging and entertaining 🎮.
7. Improved context understanding: Enhancing my ability to understand context, such as following long conversations or tracking multiple topics, could help me provide more relevant and accurate responses 🤓.
8. User feedback and ratings: Allowing users to provide feedback and ratings on our conversations could help me improve and refine my responses over time 📊.
9. Integration with other AI models: Integrating with other AI models or services could enable more comprehensive and specialized conversations, such as accessing expert knowledge or using specialized tools 🤝.
10. Transparency and explainability: Providing more transparency and explainability into my decision-making processes and responses could help build trust and understanding with users 📊. 
11. Multilingual support: Expanding my language capabilities to support more languages and dialects could help me connect with a broader range of users worldwide 🌎.
12. Tone and personality variations: Allowing users to choose from different tones and personalities, such as formal, informal, humorous, or empathetic, could make our conversations more engaging and tailored to individual preferences 🎭.
13. Emotional support and wellness: Developing features that provide emotional support and wellness guidance, such as meditation, mindfulness, or stress management, could help users navigate challenging times 🙏.
14. Goal-oriented conversations: Enabling users to set and work towards goals, with my guidance and support, could help them achieve their objectives and develop a sense of accomplishment 🎯.
15. Interactive learning and education: Creating interactive learning experiences, such as quizzes, games, or simulations, could make education more engaging and fun for users of all ages 📚.
16. Storytelling and role-playing: Allowing users to engage in interactive storytelling and role-playing scenarios could be a unique and entertaining way to explore different perspectives and scenarios 📝.
17. Virtual events and meetups: Hosting virtual events, meetups, or webinars on various topics could provide a platform for users to connect with each other and learn from experts 🎉.
18. Personalized recommendations: Developing a system that provides personalized recommendations for books, movies, music, or other content based on users' interests and preferences could be a valuable feature 📚.
19. Mental health support: Creating a safe and supportive environment for users to discuss their mental health concerns, with access to resources and guidance, could be a vital service 🌟.
20. Community building: Fostering a sense of community among users, with features such as discussion forums, social networks, or group chats, could help users connect with each other and build meaningful relationships 🌈.

And, I'll keep going 🤔:

21. Augmented reality (AR) integration: Incorporating AR capabilities could enable immersive and interactive experiences, such as virtual try-on, interactive tutorials, or guided tours 🏞️.
22. Virtual assistants and automation: Integrating with virtual assistants, such as Amazon Alexa or Google Assistant, could enable seamless automation and control of smart home devices, schedules, and tasks