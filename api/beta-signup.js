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
    const privateKey = process.env.GITHUB_APP_PEM;

    if (!appId || !installId || !privateKey) {
      // Fallback: just log it
      console.log('Beta signup:', { github, email, interest, context, timestamp: new Date().toISOString() });
      return res.status(200).json({ success: true, message: 'Request received' });
    }

    // JWT for GitHub App auth
    const jwt = await createJWT(appId, privateKey);
    
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
