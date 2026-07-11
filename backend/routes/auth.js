const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * Returns the frontend base URL.
 * Priority:
 *  1. FRONTEND_URL env var — only if it's NOT a localhost URL (so production always wins)
 *  2. Request origin header (if not from github.com)
 *  3. Referer header origin (if not from github.com)
 *  4. Hard fallback to localhost for local dev
 */
function getFrontendUrl(req) {
  const envUrl = process.env.FRONTEND_URL;
  if (envUrl && !isLocalhost(envUrl)) return envUrl;

  const origin = req.headers.origin;
  if (origin && !origin.includes('github.com') && !isLocalhost(origin) === false) {
    // Use origin even if localhost (for local dev)
    if (origin && !origin.includes('github.com')) return origin;
  }

  const referer = req.headers.referer;
  if (referer) {
    try {
      const parsedUrl = new URL(referer);
      if (parsedUrl.hostname !== 'github.com' && !parsedUrl.hostname.endsWith('.github.com')) {
        return parsedUrl.origin;
      }
    } catch {
      // Ignore invalid referer values
    }
  }

  // If FRONTEND_URL is a localhost URL, use it only in local dev
  if (envUrl) return envUrl;

  return 'http://localhost:5173';
}

/**
 * Returns the GitHub OAuth callback URL.
 * Priority:
 *  1. GITHUB_CALLBACK_URL env var — but ONLY if it's not a localhost URL in production
 *  2. Dynamically built from the request host (works on any deployment)
 */
function getGithubCallbackUrl(req) {
  const envUrl = process.env.GITHUB_CALLBACK_URL;
  // In production (non-localhost host), ignore localhost callback URLs to prevent redirect_uri_mismatch
  const reqHost = req.get('host') || '';
  const isProductionHost = !isLocalhost(reqHost);

  if (envUrl && !isLocalhost(envUrl)) return envUrl;

  // Dynamically build from request — requires `trust proxy` to get correct protocol
  return `${req.protocol}://${reqHost}/api/auth/github/callback`;
}

function isLocalhost(url) {
  try {
    const h = new URL(url).hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '::1';
  } catch {
    return url.includes('localhost') || url.includes('127.0.0.1');
  }
}

// Step 1: Redirect to GitHub OAuth
router.get('/github', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: 'GITHUB_CLIENT_ID is not configured on the server.' });
  }

  const callbackUrl = getGithubCallbackUrl(req);
  console.log('[OAuth] Initiating GitHub OAuth, callback:', callbackUrl);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: 'read:user user:email repo',
    state: Math.random().toString(36).substring(7),
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// Step 2: GitHub OAuth callback
router.get('/github/callback', async (req, res) => {
  const { code, error, error_description } = req.query;
  const frontendUrl = getFrontendUrl(req);
  const callbackUrl = getGithubCallbackUrl(req);

  console.log('[OAuth] Callback hit. code:', code ? '✅' : '❌', '| error:', error || 'none');
  console.log('[OAuth] frontendUrl:', frontendUrl, '| callbackUrl:', callbackUrl);

  if (error || !code) {
    console.error('[OAuth] Denied or missing code:', error, error_description);
    return res.redirect(`${frontendUrl}/login?error=oauth_denied`);
  }

  try {
    // Exchange code for access token
    const tokenRes = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: callbackUrl,
      },
      { headers: { Accept: 'application/json' } }
    );

    console.log('[OAuth] Token response:', JSON.stringify(tokenRes.data).substring(0, 200));

    const { access_token, error: tokenError, error_description: tokenErrDesc } = tokenRes.data;
    if (tokenError) {
      throw new Error(`GitHub token error: ${tokenError} — ${tokenErrDesc || ''}`);
    }
    if (!access_token) {
      throw new Error(`No access token received. GitHub response: ${JSON.stringify(tokenRes.data)}`);
    }

    // Fetch GitHub user profile
    const [profileRes, emailsRes] = await Promise.all([
      axios.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${access_token}`, 'X-GitHub-Api-Version': '2022-11-28' },
      }),
      axios.get('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${access_token}`, 'X-GitHub-Api-Version': '2022-11-28' },
      }),
    ]);

    const ghUser = profileRes.data;
    const primaryEmail = (Array.isArray(emailsRes.data) ? emailsRes.data.find(e => e.primary)?.email : null) || ghUser.email;

    console.log('[OAuth] GitHub user:', ghUser.login, '| email:', primaryEmail);

    // Upsert user in MongoDB
    const user = await User.findOneAndUpdate(
      { githubId: String(ghUser.id) },
      {
        githubId: String(ghUser.id),
        username: ghUser.login,
        displayName: ghUser.name || ghUser.login,
        email: primaryEmail,
        avatarUrl: ghUser.avatar_url,
        githubToken: access_token,
        profileUrl: ghUser.html_url,
        updatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('[OAuth] User upserted:', user._id.toString());

    // Issue JWT
    const token = jwt.sign(
      { userId: user._id, githubId: user.githubId },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Redirect to frontend with token
    const redirectTo = `${frontendUrl}/auth/callback?token=${token}`;
    console.log('[OAuth] Success — redirecting to:', redirectTo.substring(0, 80));
    res.redirect(redirectTo);
  } catch (err) {
    console.error('[OAuth] Error:', err.message);
    if (err.response?.data) {
      console.error('[OAuth] Response data:', JSON.stringify(err.response.data).substring(0, 500));
    }
    res.redirect(`${frontendUrl}/login?error=oauth_failed`);
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('badges')
      .lean();
    res.json({ user: { ...user, githubToken: undefined } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user settings
router.patch('/settings', auth, async (req, res) => {
  try {
    const { customPrompt, mutedCategories, strictMode } = req.body;

    const updateData = {
      $set: {
        'styleGuide.customPrompt': customPrompt,
        mutedCategories: mutedCategories || [],
      }
    };

    const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true })
      .populate('badges')
      .lean();

    res.json({ user: { ...user, githubToken: undefined, settings: { strictMode, customPrompt, mutedCategories } } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout (client-side only — just for confirmation)
router.post('/logout', auth, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
