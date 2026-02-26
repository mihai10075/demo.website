// POP + CONFETTI
const creatorTrigger = document.getElementById("creator-trigger");
const popSound = document.getElementById("pop-sound");

if (creatorTrigger && popSound) {
  creatorTrigger.addEventListener("click", () => {
    try {
      popSound.currentTime = 0;
      popSound.play();
    } catch (e) {
      console.log("sound blocked until user interacts", e);
    }

    const duration = 800;
    const end = Date.now() + duration;
    (function frame() {
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { y: 0.6 },
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  });
}

// VIDEO SEARCH
const searchInput = document.getElementById("search-input");
const videoItems = document.querySelectorAll(".video-item");

if (searchInput) {
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase().trim();

    videoItems.forEach((item) => {
      const title = item.dataset.title.toLowerCase();
      if (title.includes(query) || query === "") {
        item.style.display = "";
      } else {
        item.style.display = "none";
      }
    });
  });
}

// SUPABASE + COMMENTS
const supabaseUrl = "https://rhmnbnzyahasydfshhkc.supabase.co";
const supabaseKey = "sb_publishable_zxfOSKAYtecmcxpFfQ9NRQ_Q3MPxL4I";

const { createClient } = supabase;
const supa = createClient(supabaseUrl, supabaseKey);

async function getCurrentUser() {
  const { data, error } = await supa.auth.getUser();
  if (error) {
    // This usually just means "no session yet"
    console.warn("getUser warning:", error.message);
    return null;
  }
  return data.user;
}

async function loadComments() {
  const user = await getCurrentUser();

  const { data, error } = await supa
    .from("Comments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("loadComments error:", error);
    return;
  }

  const container = document.getElementById("comments");
  if (!container) return;
  container.innerHTML = "";

  data.forEach((row) => {
    const item = document.createElement("div");
    item.style.padding = "6px 0";
    item.style.borderBottom = "1px solid rgba(148,163,184,0.2)";
    const who = row.username || row.user_email || "Anon";
    const textSpan = document.createElement("span");
    textSpan.textContent = `${who}: ${row.content}`;
    item.appendChild(textSpan);

    if (user && user.id === row.user_id) {
      const btn = document.createElement("button");
      btn.textContent = "Delete";
      btn.style.cssText =
        "margin-left:8px;padding:2px 8px;border-radius:999px;border:none;background:#ef4444;color:white;font-size:12px;cursor:pointer;";
      btn.onclick = () => deleteComment(row.id);
      item.appendChild(btn);
    }

    container.appendChild(item);
  });
}

async function deleteComment(id) {
  if (!confirm("Delete this comment?")) return;

  const user = await getCurrentUser();
  if (!user) {
    alert("You must be logged in.");
    return;
  }

  const { error } = await supa.from("Comments").delete().eq("id", id);

  if (error) {
    console.error("delete error:", error);
    alert("Failed to delete comment");
    return;
  }

  loadComments();
}

function attachLoginHandlers() {
  const loginBtn = document.getElementById("login-btn");
  const googleBtn = document.getElementById("google-login-btn");

  if (loginBtn) {
    loginBtn.onclick = async () => {
      const email = prompt("Enter your email to login and comment:");
      if (!email) return;
      const { error } = await supa.auth.signInWithOtp({ email });
      if (error) alert(error.message);
      else alert("Check your email for the login link, then refresh the page.");
    };
  }

  if (googleBtn) {
    googleBtn.onclick = async () => {
      const { error } = await supa.auth.signInWithOAuth({
        provider: "google",
      });
      if (error) alert(error.message);
    };
  }
}

function renderAuthInfoLoggedOut() {
  const info = document.getElementById("auth-info");
  if (!info) return;
  info.innerHTML = `
    Not logged in –
    <button id="login-btn" type="button" style="padding:4px 10px;border-radius:999px;border:none;background:var(--accent-soft);color:#020617;cursor:pointer;">Login with email</button>
    <button id="google-login-btn" type="button" style="margin-left:8px;padding:4px 10px;border-radius:999px;border:none;background:#fff;color:#000;cursor:pointer;font-size:12px;">Login with Google</button>
  `;
  attachLoginHandlers();
}

async function updateAuthInfo() {
  const info = document.getElementById("auth-info");
  if (!info) return;

  const user = await getCurrentUser();
  if (user) {
    info.textContent = `Logged in as: ${user.email} – you can post comments.`;
  } else {
    renderAuthInfoLoggedOut();
  }
}

async function submitComment(event) {
  event.preventDefault();

  const textarea = document.getElementById("comment-input");
  const commentText = textarea.value.trim();
  if (!commentText) return;

  const user = await getCurrentUser();
  if (!user) {
    alert("You must be logged in to comment.");
    return;
  }

  const { error } = await supa.from("Comments").insert({
    user_id: user.id,
    username: user.email,
    content: commentText,
  });

  if (error) {
    console.error("insert error:", error);
    alert("Failed to post comment");
    return;
  }

  textarea.value = "";
  await loadComments();
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("comment-form");
  if (form) {
    form.addEventListener("submit", submitComment);
  }
  updateAuthInfo();
  loadComments();
});
