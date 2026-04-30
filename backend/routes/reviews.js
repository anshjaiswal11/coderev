const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Repository = require('../models/Repository');
const Review = require('../models/Review');
const GitHubService = require('../services/githubService');
const { enqueueReview } = require('../services/queueService');
const { generateAutoFix } = require('../services/aiService');

const router = express.Router();

// Generate code suggestion for a high-level suggested change
router.post('/:id/suggest-change', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { suggestionIndex } = req.body;
    const review = await Review.findById(id).populate('repository');
    if (!review) return res.status(404).json({ error: 'Review not found' });

    const suggestion = (review.suggestedChanges || [])[suggestionIndex];
    if (!suggestion) return res.status(400).json({ error: 'Suggestion not found' });

    const repo = review.repository;
    const user = await User.findById(review.requestedBy).select('+githubToken').lean();
    const gh = new GitHubService(user.githubToken);

    // Fetch a few repository files to provide context (best-effort)
    const files = [];
    try {
      const [ownerName, repoName] = (repo.fullName || '').split('/');
      const tree = await gh.getRepoTree(ownerName, repoName, repo.defaultBranch || 'HEAD');
      if (tree && tree.tree) {
        for (const item of tree.tree.slice(0, 50)) {
          if (item.type !== 'blob') continue;
          try {
            const content = await gh.getFileContent(ownerName, repoName, item.path, repo.defaultBranch);
            if (typeof content === 'string') files.push({ path: item.path, content });
          } catch (e) { /* ignore */ }
        }
      }
    } catch (e) { /* ignore */ }

    const aiService = require('../services/aiService');
    let suggestionPatch;
    try {
      suggestionPatch = await aiService.generateSuggestedChange({ suggestion, files, repoName: repo.fullName });
    } catch (e) {
      console.error('suggest-change failed:', e.message || e);
      return res.status(500).json({ error: 'Failed to generate suggestion', details: e.response?.data || e.message || e.stack });
    }
    return res.json({ suggestion: suggestionPatch });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Create a pull request from an AI-generated patch (creates a new branch and file)
router.post('/:id/create-pr', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { filePath, content, branchName, prTitle, prBody } = req.body;
    if (!filePath || !content || !branchName || !prTitle) return res.status(400).json({ error: 'filePath, content, branchName and prTitle are required' });

    const review = await Review.findById(id).populate('repository');
    if (!review) return res.status(404).json({ error: 'Review not found' });

    const repo = review.repository;
    const user = await User.findById(review.requestedBy).select('+githubToken').lean();
    const gh = new GitHubService(user.githubToken);

    const [owner, name] = (repo.fullName || '').split('/');

    // Get base branch ref sha
    const base = repo.defaultBranch || 'main';
    const baseRef = await gh.getRef(owner, name, `heads/${base}`);
    const baseSha = baseRef.object?.sha || baseRef?.sha;

    try {
      // Create new branch
      await gh.createRef(owner, name, branchName, baseSha);

      // Create file on new branch
      await gh.createOrUpdateFile(owner, name, filePath, content, branchName, `Automated fix: ${filePath}`);

      // Create PR
      const pr = await gh.createPullRequest(owner, name, prTitle, branchName, base, prBody || 'Automated changes suggested by CodeRev');

      return res.json({ pr });
    } catch (e) {
      console.error('create-pr failed:', e.response?.data || e.message || e);
      return res.status(500).json({ error: 'Failed to create pull request', details: e.response?.data || e.message || e.stack });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message, details: err.stack });
  }
});

// Repo-wide scan: analyze the whole repository (or branch) and create a review
router.post('/repo-scan', auth, async (req, res) => {
  try {
    const { repoId, ref } = req.body;
    const repo = await Repository.findOne({ _id: repoId, owner: req.user._id });
    if (!repo) return res.status(404).json({ error: 'Repository not found' });

    const user = await User.findById(req.user._id).select('+githubToken').lean();
    const gh = new GitHubService(user.githubToken);
    const [owner, name] = repo.fullName.split('/');

    // Get tree and fetch files (skip very large files and binaries)
    const tree = await gh.getRepoTree(owner, name, ref || repo.defaultBranch || 'HEAD');
    const files = [];
    if (tree && tree.tree) {
      for (const item of tree.tree) {
        if (item.type !== 'blob') continue;
        // skip large files
        if (item.size && item.size > 150000) continue;
        try {
          const content = await gh.getFileContent(owner, name, item.path, ref || repo.defaultBranch);
          // basic binary check
          if (typeof content !== 'string') continue;
          files.push({ path: item.path, content });
        } catch (e) {
          // ignore failures to fetch individual files
        }
      }
    }

    // Create a pending Review document and run the heavy AI work in background
    const review = await Review.create({
      repository: repo._id,
      requestedBy: req.user._id,
      prTitle: `Repo scan: ${repo.fullName}`,
      diffContent: `Repo snapshot with ${files.length} files (truncated)`,
      filesChanged: files.map(f => f.path),
      status: 'pending',
      totalIssues: 0,
    });

    // Respond immediately so UI isn't blocked
    res.status(201).json({ review, summary: 'Scan queued', totalFiles: files.length });

    // Run scan asynchronously — don't block the HTTP response
    (async () => {
      try {
        const aiService = require('../services/aiService');
        const result = await aiService.runRepoReview({ repoName: repo.fullName, files, repoContext: repo.codebaseMemory?.architectureNotes || '' });

        // Persist results (provide fallback summary if AI didn't emit one)
        const summaryText = result.summary || (result._rawAIError ? `AI parse error: ${result._rawAIError}` : 'No summary generated');
        await Review.findByIdAndUpdate(review._id, {
          status: 'completed',
          issues: result.issues || [],
          summary: summaryText,
          riskScore: result.riskScore,
          riskFactors: result.riskFactors || {},
          suggestedTests: result.suggestedTests || [],
          secretsDetected: result.secretsDetected || [],
          complianceFlags: result.complianceFlags || [],
          totalIssues: (result.issues || []).length,
          rawAIResponse: result._rawAIResponse || result.rawAIResponse || undefined,
          rawAIError: result._rawAIError || result.rawAIError || undefined,
          aiRating: result.aiRating,
          suggestedChanges: result.suggestedChanges || [],
        });

        // Update repository memory / stats
        repo.codebaseMemory = repo.codebaseMemory || {};
        repo.codebaseMemory.architectureNotes = (result.architectureNotes || repo.codebaseMemory.architectureNotes || '').slice(0, 4000);
        repo.codebaseMemory.lastAnalyzed = new Date();
        await repo.save();

        // Emit websocket event so clients update (join-user or join-review)
        try {
          const io = req.app.get('io');
          io?.to(`user-${req.user._id}`).emit('review:completed', { reviewId: review._id.toString(), totalIssues: (result.issues || []).length, riskScore: result.riskScore, summary: summaryText });
          io?.to(`review-${review._id.toString()}`).emit('review:completed', { reviewId: review._id.toString(), totalIssues: (result.issues || []).length, riskScore: result.riskScore, summary: summaryText });
        } catch (emitErr) {
          console.warn('Failed to emit review:completed websocket event', emitErr.message);
        }
      } catch (bgErr) {
        console.error('Background repo-scan failed:', bgErr.message);
        await Review.findByIdAndUpdate(review._id, { status: 'failed', errorMessage: bgErr.message });
        try {
          const io = req.app.get('io');
          io?.to(`user-${req.user._id}`).emit('review:failed', { reviewId: review._id.toString(), error: bgErr.message });
          io?.to(`review-${review._id.toString()}`).emit('review:failed', { reviewId: review._id.toString(), error: bgErr.message });
        } catch (emitErr) {
          console.warn('Failed to emit review:failed websocket event', emitErr.message);
        }
      }
    })();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── IMPORTANT: /manual must be declared before /:id to avoid Express matching
// "manual" as an ObjectId parameter and returning 404.

// Manual review (paste diff)
router.post('/manual', auth, async (req, res) => {
  try {
    const { repoId, diffContent, title } = req.body;
    if (!diffContent) return res.status(400).json({ error: 'diffContent is required' });

    const repo = repoId
      ? await Repository.findOne({ _id: repoId, owner: req.user._id })
      : null;

    const review = await Review.create({
      repository: repo?._id,
      requestedBy: req.user._id,
      prTitle: title || 'Manual Review',
      diffContent,
      filesChanged: [],
      status: 'pending',
    });

    await enqueueReview(review._id.toString());
    res.status(201).json({ review });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a review from a PR
router.post('/', auth, async (req, res) => {
  try {
    const { repoId, prNumber, prTitle, prUrl, commitSha, branch, baseBranch } = req.body;

    const repo = await Repository.findOne({ _id: repoId, owner: req.user._id });
    if (!repo) return res.status(404).json({ error: 'Repository not found' });

    const user = await User.findById(req.user._id).select('+githubToken').lean();
    const gh = new GitHubService(user.githubToken);
    const [owner, name] = repo.fullName.split('/');

    // Fetch diff from GitHub
    let diffContent = '';
    let filesChanged = [];

    if (prNumber) {
      const [diff, files] = await Promise.all([
        gh.getPRDiff(owner, name, prNumber),
        gh.getPRFiles(owner, name, prNumber),
      ]);
      diffContent = diff;
      filesChanged = files.map(f => f.filename);
    } else if (commitSha) {
      diffContent = await gh.getCommitDiff(owner, name, commitSha);
    }

    const review = await Review.create({
      repository: repo._id,
      requestedBy: req.user._id,
      prNumber,
      prTitle,
      prUrl,
      commitSha,
      branch,
      baseBranch,
      diffContent,
      filesChanged,
      status: 'pending',
    });

    // Queue for async AI processing
    await enqueueReview(review._id.toString());

    res.status(201).json({ review });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List reviews
router.get('/', auth, async (req, res) => {
  try {
    const { repoId, page = 1, limit = 20 } = req.query;
    const query = { requestedBy: req.user._id };
    if (repoId) query.repository = repoId;

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('repository', 'fullName name language')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Review.countDocuments(query),
    ]);

    res.json({ reviews, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single review
router.get('/:id', auth, async (req, res) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, requestedBy: req.user._id })
      .populate('repository', 'fullName name language htmlUrl')
      .lean();
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json({ review });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept/dismiss an issue
router.patch('/:id/issues/:issueId', auth, async (req, res) => {
  try {
    const { accepted, dismissed, dismissReason } = req.body;
    const review = await Review.findOne({ _id: req.params.id, requestedBy: req.user._id });
    if (!review) return res.status(404).json({ error: 'Review not found' });

    const issue = review.issues.id(req.params.issueId);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    if (accepted !== undefined) issue.accepted = accepted;
    if (dismissed !== undefined) issue.dismissed = dismissed;
    if (dismissReason) issue.dismissReason = dismissReason;

    // Update counters
    review.acceptedCount = review.issues.filter(i => i.accepted === true).length;
    review.dismissedCount = review.issues.filter(i => i.dismissed === true).length;

    await review.save();

    // If accepted, increment user's fixed count
    if (accepted) {
      await User.findByIdAndUpdate(req.user._id, { $inc: { fixedIssuesCount: 1 } });
    }

    res.json({ issue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate auto-fix for an issue
router.post('/:id/issues/:issueId/autofix', auth, async (req, res) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, requestedBy: req.user._id })
      .populate('repository');
    if (!review) return res.status(404).json({ error: 'Review not found' });

    const issue = review.issues.id(req.params.issueId);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    const user = await User.findById(req.user._id).select('+githubToken').lean();
    const gh = new GitHubService(user.githubToken);
    const [owner, name] = review.repository.fullName.split('/');

    let fileContent = '';
    try {
      fileContent = await gh.getFileContent(owner, name, issue.file, review.commitSha || review.branch);
    } catch (e) { /* file might not exist */ }

    const fix = await generateAutoFix({
      issue,
      fileContent,
      language: review.repository.language,
    });

    issue.patchCode = fix;
    await review.save();

    res.json({ fix, issueId: req.params.issueId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
