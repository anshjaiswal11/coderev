const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Badge = require('../models/Badge');
const { BADGES } = require('../models/Badge');

const router = express.Router();

// Seed badges
router.post('/seed', async (req, res) => {
  try {
    for (const badge of BADGES) {
      await Badge.findOneAndUpdate({ slug: badge.slug }, badge, { upsert: true });
    }
    res.json({ message: 'Badges seeded', count: BADGES.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all badges
router.get('/', auth, async (req, res) => {
  try {
    const [all, user] = await Promise.all([
      Badge.find().lean(),
      User.findById(req.user._id).populate('badges').lean(),
    ]);
    const earned = new Set((user.badges || []).map(b => b.slug));
    res.json({ badges: all.map(b => ({ ...b, earned: earned.has(b.slug) })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check and award badges
router.post('/check', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('badges').lean();
    const allBadges = await Badge.find().lean();
    const earnedSlugs = new Set(user.badges.map(b => b.slug));
    const newBadges = [];

    for (const badge of allBadges) {
      if (earnedSlugs.has(badge.slug)) continue;
      let earned = false;

      if (badge.criteria.type === 'review_count' && user.reviewCount >= badge.criteria.threshold) earned = true;
      if (badge.criteria.type === 'fixed_issues' && user.fixedIssuesCount >= badge.criteria.threshold) earned = true;
      if (badge.criteria.type === 'streak' && user.streak >= badge.criteria.threshold) earned = true;

      if (earned) {
        await User.findByIdAndUpdate(req.user._id, { $addToSet: { badges: badge._id } });
        newBadges.push(badge);
      }
    }

    res.json({ newBadges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
