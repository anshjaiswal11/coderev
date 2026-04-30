const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Repository = require('../models/Repository');
const GitHubService = require('../services/githubService');

const router = express.Router();

// List or search user's GitHub repos
router.get('/github', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+githubToken').lean();
    const gh = new GitHubService(user.githubToken);
    
    let repos;
    if (req.query.q) {
      repos = await gh.searchUserRepos(req.query.q);
    } else {
      repos = await gh.listRepos();
    }
    
    // The search endpoint returns { total_count, items }, listRepos returns [].
    // Normalize to consistent shape so the frontend always receives { items } for search.
    if (req.query.q) {
      if (!repos.items) repos = { items: repos };
      res.json(repos);
    } else {
      res.json({ repos });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Added explicit search route for /github/search just in case
router.get('/github/search', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+githubToken').lean();
    const gh = new GitHubService(user.githubToken);
    const repos = await gh.searchUserRepos(req.query.q);
    
    // the ghService searchUserRepos likely returns the raw GitHub API response containing { total_count, items }
    res.json(repos.items ? repos : { items: repos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List connected repos
router.get('/', auth, async (req, res) => {
  try {
    const repos = await Repository.find({ owner: req.user._id, active: true })
      .sort({ updatedAt: -1 }).lean();
    res.json({ repos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Connect a repo
router.post('/connect', auth, async (req, res) => {
  try {
    const { fullName } = req.body;
    const [owner, name] = fullName.split('/');

    const user = await User.findById(req.user._id).select('+githubToken').lean();
    const gh = new GitHubService(user.githubToken);
    const ghRepo = await gh.getRepo(owner, name);

    const repo = await Repository.findOneAndUpdate(
      { owner: req.user._id, fullName },
      {
        owner: req.user._id,
        githubRepoId: ghRepo.id,
        fullName,
        name: ghRepo.name,
        description: ghRepo.description,
        language: ghRepo.language,
        private: ghRepo.private,
        htmlUrl: ghRepo.html_url,
        defaultBranch: ghRepo.default_branch,
        active: true,
      },
      { upsert: true, new: true }
    );

    res.json({ repo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get repo details
router.get('/:id', auth, async (req, res) => {
  try {
    const repo = await Repository.findOne({ _id: req.params.id, owner: req.user._id }).lean();
    if (!repo) return res.status(404).json({ error: 'Repository not found' });
    res.json({ repo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List PRs for a repo
router.get('/:id/prs', auth, async (req, res) => {
  try {
    const repo = await Repository.findOne({ _id: req.params.id, owner: req.user._id }).lean();
    if (!repo) return res.status(404).json({ error: 'Repository not found' });

    const user = await User.findById(req.user._id).select('+githubToken').lean();
    const gh = new GitHubService(user.githubToken);
    const [owner, name] = repo.fullName.split('/');
    const prs = await gh.listPRs(owner, name, req.query.state || 'open');

    res.json({ prs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Disconnect a repo
router.delete('/:id', auth, async (req, res) => {
  try {
    await Repository.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { active: false }
    );
    res.json({ message: 'Repository disconnected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
