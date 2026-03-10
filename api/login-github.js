// api/login-github.js in *demo-website-one-ashy* project
export default async function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;

  const baseUrl = "https://demo-website-zf3z.vercel.app"; // NEW domain

  const redirectUri = `${baseUrl}/api/github-callback`;
  const state = "mihai-state";

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=read:user&state=${encodeURIComponent(state)}`;

  res.writeHead(302, { Location: githubAuthUrl });
  res.end();
}
