export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://soma.gravicity.ai');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { github, email, interest, context } = req.body;

    if (!github || !email) {
      return res.status(400).json({ error: 'GitHub username and email required' });
    }

    // Create GitHub Issue via soma-agent[bot]
    // Generate install token from GitHub App
    const appId = process.env.GITHUB_APP_ID;
    const installId = process.env.GITHUB_INSTALL_ID;
    // PEM: try base64-encoded first (reliable for multiline), fallback to raw with newline fix
    const pemB64 = process.env.GITHUB_APP_PEM_B64;
    const rawPem = process.env.GITHUB_APP_PEM;
    const privateKey = pemB64
      ? Buffer.from(pemB64, 'base64').toString('utf-8')
      : rawPem ? rawPem.replace(/\\n/g, '\n') : null;

    if (!appId || !installId || !privateKey) {
      console.log('Beta signup (fallback — missing env vars):', {
        github, email, interest, context,
        timestamp: new Date().toISOString(),
        env: { hasAppId: !!appId, hasInstallId: !!installId, hasPem: !!rawPem, pemLen: rawPem?.length }
      });
      return res.status(200).json({ success: true, message: 'Request received — we\'ll follow up by email.' });
    }

    // JWT for GitHub App auth
    let jwt;
    try {
      jwt = await createJWT(appId, privateKey);
    } catch (jwtErr) {
      console.error('JWT creation failed:', jwtErr.message);
      console.log('Beta signup (JWT fail):', { github, email, timestamp: new Date().toISOString() });
      return res.status(200).json({ success: true, message: 'Request received — we\'ll follow up by email.' });
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
    const issueRes = await fetch('https://api.github.com/repos/meetsoma/soma-pro/issues', {
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
      return res.status(200).json({ success: true, message: 'Request submitted! We\'ll review and get back to you.' });
    } else {
      console.error('GitHub issue creation failed:', await issueRes.text());
      return res.status(200).json({ success: true, message: 'Request received' });
    }
  } catch (err) {
    console.error('Beta signup error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
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
