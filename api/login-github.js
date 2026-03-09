// api/login-github.js
export default async function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;

  const redirectUri = "https://demo-website-one-ashy.vercel.app/api/github-callback";
  const state = "mihai-state"; // TODO: for real security, generate random per session

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=read:user&state=${encodeURIComponent(state)}`;

  res.writeHead(302, { Location: githubAuthUrl });
  res.end();
}
