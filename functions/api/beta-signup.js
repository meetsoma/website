// Beta signup — creates a GitHub Issue as soma-agent[bot].
// Cloudflare Pages Function (converted from the Vercel serverless handler,
// s01-016071 — soma-site-off-vercel, S1 = CF). Routes: /api/beta-signup
// Requires nodejs_compat compatibility flag (see wrangler.jsonc) for
// crypto.createSign + Buffer.
// Secrets (Pages env): GITHUB_APP_ID, GITHUB_INSTALL_ID, GITHUB_APP_PEM_B64
// (preferred) or GITHUB_APP_PEM. Missing creds → graceful fallback: logs the
// signup and still returns success (form never appears broken).
export async function onRequest({ request, env }) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://soma.gravicity.ai',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const { github, email, interest, context } = await request.json();

    if (!github || !email) {
      return json({ error: 'GitHub username and email required' }, 400);
    }

    // Create GitHub Issue via soma-agent[bot]
    // Generate install token from GitHub App
    const appId = env.GITHUB_APP_ID;
    const installId = env.GITHUB_INSTALL_ID;
    // PEM: try base64-encoded first (reliable for multiline), fallback to raw with newline fix
    const pemB64 = env.GITHUB_APP_PEM_B64;
    const rawPem = env.GITHUB_APP_PEM;
    const privateKey = pemB64
      ? Buffer.from(pemB64, 'base64').toString('utf-8')
      : rawPem ? rawPem.replace(/\\n/g, '\n') : null;

    if (!appId || !installId || !privateKey) {
      console.log('Beta signup (fallback — missing env vars):', {
        github, email, interest, context,
        timestamp: new Date().toISOString(),
        env: { hasAppId: !!appId, hasInstallId: !!installId, hasPem: !!rawPem, pemLen: rawPem?.length }
      });
      return json({ success: true, message: 'Request received — we\'ll follow up by email.' });
    }

    // JWT for GitHub App auth
    let jwt;
    try {
      jwt = await createJWT(appId, privateKey);
    } catch (jwtErr) {
      console.error('JWT creation failed:', jwtErr.message);
      console.log('Beta signup (JWT fail):', { github, email, timestamp: new Date().toISOString() });
      return json({ success: true, message: 'Request received — we\'ll follow up by email.' });
    }

    // Get installation token
    const tokenRes = await fetch(`https://api.github.com/app/installations/${installId}/access_tokens`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Accept': 'application/vnd.github+json',
      },
    });
    const { token } = await tokenRes.json();

    // Create issue in a private repo for tracking
    const issueRes = await fetch('https://api.github.com/repos/meetsoma/soma-agent/issues', {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github+json',
      },
      body: JSON.stringify({
        title: `Beta Access Request: @${github}`,
        body: [
          `**GitHub:** [@${github}](https://github.com/${github})`,
          `**Email:** ${email}`,
          `**Interest:** ${interest || 'not specified'}`,
          `**Context:** ${context || 'not provided'}`,
          `**Submitted:** ${new Date().toISOString()}`,
          '',
          '---',
          'To approve: add to meetsoma/beta-testers team and close this issue.',
        ].join('\n'),
        labels: ['beta-request'],
      }),
    });

    if (issueRes.ok) {
      const issue = await issueRes.json();
      return json({
        success: true,
        message: 'Request submitted! We\'ll review and get back to you.',
        issueUrl: issue.html_url,
        issueNumber: issue.number,
      });
    } else {
      console.error('GitHub issue creation failed:', await issueRes.text());
      return json({ success: true, message: 'Request received' });
    }
  } catch (err) {
    console.error('Beta signup error:', err);
    return json({ error: 'Something went wrong' }, 500);
  }
}

// Simple JWT creation for GitHub App
async function createJWT(appId, pem) {
  const crypto = await import('crypto');
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ iat: now - 60, exp: now + 600, iss: appId })).toString('base64url');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(pem, 'base64url');
  return `${header}.${payload}.${signature}`;
}
