// api/github-callback.js
const fetch = require("node-fetch");

module.exports = async function handler(req, res) {
  const { code, state } = req.query || {};

  if (!code) {
    res.status(400).send("Missing code");
    return;
  }

  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    // 1) Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("No access token", tokenData);
      res.status(500).send("GitHub auth failed");
      return;
    }

    // 2) Fetch user data
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "User-Agent": "mihai-login",
      },
    });

    const user = await userRes.json();
    const githubId = user.id;
    const githubLogin = user.login;

    if (!githubId) {
      console.error("No github id", user);
      res.status(500).send("GitHub user fetch failed");
      return;
    }

    const safeUserId = `gh_${githubId}`;

    // 3) Return HTML that saves userId to localStorage and redirects back to chat.html
    const redirectUrl = "https://demo-website-6ub1o4xo9-mihai10075s-projects.vercel.app/chat.html";

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(`
<!DOCTYPE html>
<html>
  <body>
    <script>
      try {
        localStorage.setItem("mihai_user_id", ${JSON.stringify(safeUserId)});
        localStorage.setItem("mihai_github_login", ${JSON.stringify(githubLogin)});
      } catch (e) {}
      window.location.href = ${JSON.stringify(redirectUrl)};
    </script>
  </body>
</html>
    `);
  } catch (e) {
    console.error("GitHub callback error", e);
    res.status(500).send("GitHub callback error");
  }
};
