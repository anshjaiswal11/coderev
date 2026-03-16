const express = require('express');
const auth = require('../middleware/auth');
const Review = require('../models/Review');
const Repository = require('../models/Repository');
const User = require('../models/User');

const router = express.Router();

// Aggregated Dashboard Data
router.get('/', auth, async (req, res) => {
  try {
    const { repoId } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const query = { requestedBy: req.user._id, status: 'completed' };
    if (repoId) query.repository = repoId;

    const reviews = await Review.find(query).lean();

    const byDate = {};
    const cats = {};
    const fileRisk = {};

    reviews.forEach(r => {
      // Trends
      if (r.createdAt >= since) {
        const d = r.createdAt.toISOString().split('T')[0];
        if (!byDate[d]) byDate[d] = { date: d, found: 0, fixed: 0, reviews: 0 };
        byDate[d].reviews++;
        byDate[d].found += r.totalIssues || 0;
        byDate[d].fixed += r.acceptedCount || 0; 
      }

      // Categories and Heatmap
      (r.issues || []).forEach(issue => {
        const c = issue.category || 'other';
        cats[c] = (cats[c] || 0) + 1;

        if (!issue.file) return;
        if (!fileRisk[issue.file]) fileRisk[issue.file] = { _id: issue.file, totalIssues: 0 };
        fileRisk[issue.file].totalIssues++;
      });
    });

    const trends = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
    const categoryDist = Object.entries(cats).map(([id, count]) => ({ _id: id, count })).sort((a,b) => b.count - a.count);
    const fileRisks = Object.values(fileRisk).sort((a, b) => b.totalIssues - a.totalIssues).slice(0, 30);

    res.json({ trends, categoryDist, fileRisks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard summary
router.get('/summary', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const [totalReviews, repos, user, recentReviews] = await Promise.all([
      Review.countDocuments({ requestedBy: userId }),
      Repository.find({ owner: userId, active: true }).lean(),
      User.findById(userId).lean(),
      Review.find({ requestedBy: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('repository', 'fullName name')
        .lean(),
    ]);

    const completedReviews = await Review.find({
      requestedBy: userId,
      status: 'completed',
    }).lean();

    const totalIssues = completedReviews.reduce((s, r) => s + (r.totalIssues || 0), 0);
    const avgRiskScore = completedReviews.length
      ? Math.round(completedReviews.reduce((s, r) => s + (r.riskScore || 0), 0) / completedReviews.length)
      : 0;
    const acceptedFixes = completedReviews.reduce((s, r) => s + (r.acceptedCount || 0), 0);

    res.json({
      totalReviews,
      totalRepos: repos.length,
      totalIssues,
      avgRiskScore,
      acceptedFixes,
      qualityScore: user?.qualityScore || 0,
      reviewCount: user?.reviewCount || 0,
      recentReviews,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Issue trends over time
router.get('/trends', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - Number(days));

    const reviews = await Review.find({
      requestedBy: req.user._id,
      status: 'completed',
      createdAt: { $gte: since },
    }).lean();

    // Group by date
    const byDate = {};
    reviews.forEach(r => {
      const d = r.createdAt.toISOString().split('T')[0];
      if (!byDate[d]) byDate[d] = { date: d, reviews: 0, issues: 0, errors: 0, warnings: 0 };
      byDate[d].reviews++;
      byDate[d].issues += r.totalIssues || 0;
      byDate[d].errors += r.errorCount || 0;
      byDate[d].warnings += r.warningCount || 0;
    });

    res.json({ trends: Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Issue categories breakdown
router.get('/categories', auth, async (req, res) => {
  try {
    const reviews = await Review.find({
      requestedBy: req.user._id,
      status: 'completed',
    }).lean();

    const cats = {};
    reviews.forEach(r => {
      (r.issues || []).forEach(issue => {
        const c = issue.category || 'other';
        cats[c] = (cats[c] || 0) + 1;
      });
    });

    res.json({
      categories: Object.entries(cats).map(([name, count]) => ({ name, count })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tech debt heatmap — riskiest files
router.get('/heatmap/:repoId', auth, async (req, res) => {
  try {
    const repo = await Repository.findOne({ _id: req.params.repoId, owner: req.user._id });
    if (!repo) return res.status(404).json({ error: 'Not found' });

    const reviews = await Review.find({
      repository: repo._id,
      status: 'completed',
    }).lean();

    const fileRisk = {};
    reviews.forEach(r => {
      (r.issues || []).forEach(issue => {
        if (!issue.file) return;
        if (!fileRisk[issue.file]) fileRisk[issue.file] = { file: issue.file, issues: 0, errors: 0, score: 0 };
        fileRisk[issue.file].issues++;
        if (issue.severity === 'error') fileRisk[issue.file].errors++;
        fileRisk[issue.file].score += issue.severity === 'error' ? 3 : issue.severity === 'warning' ? 1 : 0.5;
      });
    });

    const heatmap = Object.values(fileRisk)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);

    res.json({ heatmap });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Team leaderboard
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const users = await User.find({}, 'username displayName avatarUrl qualityScore reviewCount fixedIssuesCount badges')
      .sort({ qualityScore: -1 })
      .limit(20)
      .lean();

    res.json({ leaderboard: users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
