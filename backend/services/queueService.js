const Bull = require('bull');
const { getRedis } = require('../config/redis');
const { runAIReview } = require('./aiService');
const Review = require('../models/Review');
const Repository = require('../models/Repository');
const User = require('../models/User');

let reviewQueue = null;

/**
 * Parse a Redis URL into a host/port/password options object for Bull.
 * Bull's `redis` option does not accept a URL string directly.
 */
function parseRedisUrl(url) {
  try {
    const parsed = new URL(url);
    const opts = {
      host: parsed.hostname || '127.0.0.1',
      port: Number(parsed.port) || 6379,
    };
    if (parsed.password) opts.password = decodeURIComponent(parsed.password);
    if (parsed.username) opts.username = decodeURIComponent(parsed.username);
    // Support TLS for Upstash (rediss://)
    if (parsed.protocol === 'rediss:') opts.tls = {};
    return opts;
  } catch {
    return { host: '127.0.0.1', port: 6379 };
  }
}

function setupWebhookQueue(io) {
  const redis = getRedis();
  if (!redis) {
    console.warn('⚠️  Queue system disabled (no Redis)');
    return;
  }

  const redisOpts = parseRedisUrl(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
  reviewQueue = new Bull('code-review', { redis: redisOpts });

  reviewQueue.process('run-review', 3, async (job) => {
    const { reviewId } = job.data;
    const startTime = Date.now();

    const review = await Review.findById(reviewId).populate('repository');
    if (!review) throw new Error('Review not found');

    await Review.findByIdAndUpdate(reviewId, { status: 'processing' });
    io?.to(`user-${review.requestedBy}`).emit('review:processing', { reviewId });

    try {
      const repo = review.repository;
      const repoContext = repo.codebaseMemory?.architectureNotes || '';
      const user = await User.findById(review.requestedBy);
      const styleGuide = user?.styleGuide?.customPrompt || '';

      const result = await runAIReview({
        diff: review.diffContent,
        repoContext,
        styleGuide,
        files: review.filesChanged,
      });

      result.issues = result.issues || [];

      const errorCount = result.issues.filter(i => i.severity === 'error').length;
      const warningCount = result.issues.filter(i => i.severity === 'warning').length;
      const infoCount = result.issues.filter(i => i.severity === 'info').length;

      // Guard against null riskScore to prevent NaN in qualityScore
      const safeRiskScore = typeof result.riskScore === 'number' ? result.riskScore : 0;

      const summaryText = result.summary || (result._rawAIError ? `AI parse error: ${result._rawAIError}` : 'No summary generated');
      const parseError = result._rawAIError || result.rawAIError;
      const update = {
        $set: {
          status: 'completed',
          issues: result.issues,
          summary: summaryText,
          riskScore: result.riskScore,
          riskFactors: result.riskFactors,
          suggestedTests: result.suggestedTests || [],
          secretsDetected: result.secretsDetected || [],
          complianceFlags: result.complianceFlags || [],
          suggestedChanges: result.suggestedChanges || [],
          totalIssues: result.issues.length,
          errorCount,
          warningCount,
          infoCount,
          processingTime: Date.now() - startTime,
          aiModelsUsed: [process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4'],
          rawAIResponse: result._rawAIResponse || result.rawAIResponse || '',
        },
        $unset: {},
      };
      if (parseError) {
        update.$set.rawAIError = parseError;
        if (!result.issues.length) update.$set.errorMessage = `AI parse error: ${parseError}`;
        else update.$unset.errorMessage = '';
      } else {
        update.$unset.rawAIError = '';
        update.$unset.errorMessage = '';
      }
      if (!Object.keys(update.$unset).length) delete update.$unset;
      await Review.findByIdAndUpdate(reviewId, update);

      await Repository.findByIdAndUpdate(repo._id, {
        $inc: { totalReviews: 1, openIssues: result.issues.length },
      });

      // Use safe risk score so qualityScore is never NaN
      await User.findByIdAndUpdate(review.requestedBy, {
        $inc: { reviewCount: 1, qualityScore: Math.max(0, 100 - safeRiskScore) },
      });

      io?.to(`user-${review.requestedBy}`).emit('review:completed', {
        reviewId,
        totalIssues: result.issues.length,
        riskScore: result.riskScore,
        summary: result.summary,
      });

      return result;
    } catch (error) {
      await Review.findByIdAndUpdate(reviewId, {
        status: 'failed',
        errorMessage: error.message,
      });
      io?.to(`user-${review.requestedBy}`).emit('review:failed', { reviewId, error: error.message });
      throw error;
    }
  });

  reviewQueue.on('failed', (job, err) => {
    console.error(`Review job ${job.id} failed:`, err.message);
  });

  console.log('✅ Review queue ready');
}

async function enqueueReview(reviewId) {
  if (!reviewQueue) {
    // Fallback: run synchronously without queue
    setTimeout(() => processReviewDirectly(reviewId), 100);
    return;
  }
  await reviewQueue.add('run-review', { reviewId }, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  });
}

// Fallback direct processing (no Redis)
async function processReviewDirectly(reviewId) {
  const review = await Review.findById(reviewId).populate('repository');
  if (!review) return;

  await Review.findByIdAndUpdate(reviewId, { status: 'processing' });

  try {
    const result = await runAIReview({
      diff: review.diffContent || '',
      repoContext: review.repository?.codebaseMemory?.architectureNotes || '',
      files: review.filesChanged || [],
    });

    result.issues = result.issues || [];

    const errorCount = result.issues.filter(i => i.severity === 'error').length;
    const warningCount = result.issues.filter(i => i.severity === 'warning').length;
    const infoCount = result.issues.filter(i => i.severity === 'info').length;

    // Guard against null riskScore
    const safeRiskScore = typeof result.riskScore === 'number' ? result.riskScore : 0; // eslint-disable-line no-unused-vars

    const summaryText = result.summary || (result._rawAIError ? `AI parse error: ${result._rawAIError}` : 'No summary generated');
    const parseError = result._rawAIError || result.rawAIError;
    const update = {
      $set: {
        status: 'completed',
        issues: result.issues,
        summary: summaryText,
        riskScore: result.riskScore,
        riskFactors: result.riskFactors,
        suggestedTests: result.suggestedTests || [],
        secretsDetected: result.secretsDetected || [],
        complianceFlags: result.complianceFlags || [],
        suggestedChanges: result.suggestedChanges || [],
        totalIssues: result.issues.length,
        errorCount, warningCount, infoCount,
        aiModelsUsed: [process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4'],
        rawAIResponse: result._rawAIResponse || result.rawAIResponse || '',
      },
      $unset: {},
    };
    if (parseError) {
      update.$set.rawAIError = parseError;
      if (!result.issues.length) update.$set.errorMessage = `AI parse error: ${parseError}`;
      else update.$unset.errorMessage = '';
    } else {
      update.$unset.rawAIError = '';
      update.$unset.errorMessage = '';
    }
    if (!Object.keys(update.$unset).length) delete update.$unset;
    await Review.findByIdAndUpdate(reviewId, update);
  } catch (err) {
    await Review.findByIdAndUpdate(reviewId, { status: 'failed', errorMessage: err.message });
  }
}

module.exports = { setupWebhookQueue, enqueueReview };
