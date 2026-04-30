const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const Repository = require('../models/Repository');
const Review = require('../models/Review');
const { enqueueReview } = require('../services/queueService');

const router = express.Router();

/**
 * Verify GitHub webhook HMAC-SHA256 signature.
 * Uses req.rawBody (raw Buffer attached by server.js middleware) so the
 * signature is computed over the exact bytes GitHub sent — not over
 * JSON.stringify(req.body), which can differ in key ordering.
 */
function verifySignature(req) {
  const sig = req.headers['x-hub-signature-256'];
  if (!sig || !process.env.GITHUB_WEBHOOK_SECRET) return true; // skip when secret not configured
  const rawBody = req.rawBody;
  if (!rawBody) return false; // if raw body is missing, fail safely
  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

router.post('/github', async (req, res) => {
  if (!verifySignature(req)) return res.status(401).json({ error: 'Invalid signature' });

  const event = req.headers['x-github-event'];
  const payload = req.body;

  res.status(200).json({ received: true });

  try {
    if (event === 'pull_request' && ['opened', 'synchronize'].includes(payload.action)) {
      const fullName = payload.repository.full_name;
      const repo = await Repository.findOne({ fullName, webhookActive: true }).populate('owner');
      if (!repo) return;

      const user = repo.owner;
      const prNumber = payload.pull_request.number;

      const GitHubService = require('../services/githubService');
      const User2 = require('../models/User');
      const fullUser = await User2.findById(user._id).select('+githubToken').lean();
      const gh = new GitHubService(fullUser.githubToken);
      const [owner, name] = fullName.split('/');

      const [diff, files] = await Promise.all([
        gh.getPRDiff(owner, name, prNumber),
        gh.getPRFiles(owner, name, prNumber),
      ]);

      const review = await Review.create({
        repository: repo._id,
        requestedBy: user._id,
        prNumber,
        prTitle: payload.pull_request.title,
        prUrl: payload.pull_request.html_url,
        branch: payload.pull_request.head.ref,
        baseBranch: payload.pull_request.base.ref,
        commitSha: payload.pull_request.head.sha,
        diffContent: diff,
        filesChanged: files.map(f => f.filename),
        status: 'pending',
      });

      await enqueueReview(review._id.toString());
    }
  } catch (err) {
    console.error('Webhook processing error:', err.message);
  }
});

module.exports = router;
