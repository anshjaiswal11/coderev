const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Step 1: Redirect to GitHub OAuth
router.get('/github', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_CALLBACK_URL,
    scope: 'read:user user:email repo',
    state: Math.random().toString(36).substring(7),
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// Step 2: GitHub OAuth callback
router.get('/github/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_denied`);
  }

  try {
    // Exchange code for access token
    const tokenRes = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_CALLBACK_URL,
      },
      { headers: { Accept: 'application/json' } }
    );

    const { access_token } = tokenRes.data;
    if (!access_token) throw new Error('No access token received');

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
    const primaryEmail = emailsRes.data.find(e => e.primary)?.email || ghUser.email;

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

    // Issue JWT
    const token = jwt.sign(
      { userId: user._id, githubId: user.githubId },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (err) {
    console.error('GitHub OAuth error:', err.message);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
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

    // We add strictMode to settings if we want to store it, 
    // but the User model doesn't explicitly have it. We can add it dynamically or update existing fields.
    const updateData = {
      $set: {
        'styleGuide.customPrompt': customPrompt,
        mutedCategories: mutedCategories || [],
      }
    };

    const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true })
      .populate('badges')
      .lean();

    // Return updated user object
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
