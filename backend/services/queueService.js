const Bull = require('bull');
const { getRedis } = require('../config/redis');
const { runAIReview } = require('./aiService');
const Review = require('../models/Review');
const Repository = require('../models/Repository');
const User = require('../models/User');

let reviewQueue = null;

function setupWebhookQueue(io) {
  const redis = getRedis();
  if (!redis) {
    console.warn('⚠️  Queue system disabled (no Redis)');
    return;
  }

  reviewQueue = new Bull('code-review', { redis: { port: 6379, host: '127.0.0.1' } });

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

      // Ensure issues array exists to avoid runtime errors when counting
      result.issues = result.issues || [];

      // Count by severity
      const errorCount = result.issues.filter(i => i.severity === 'error').length;
      const warningCount = result.issues.filter(i => i.severity === 'warning').length;
      const infoCount = result.issues.filter(i => i.severity === 'info').length;

      // Persist results; include raw AI response/error when present for debugging
      const summaryText = result.summary || (result._rawAIError ? `AI parse error: ${result._rawAIError}` : 'No summary generated');
      await Review.findByIdAndUpdate(reviewId, {
        status: 'completed',
        issues: result.issues,
        summary: summaryText,
        riskScore: result.riskScore,
        riskFactors: result.riskFactors,
        suggestedTests: result.suggestedTests || [],
        secretsDetected: result.secretsDetected || [],
        complianceFlags: result.complianceFlags || [],
        totalIssues: result.issues.length,
        errorCount,
        warningCount,
        infoCount,
        processingTime: Date.now() - startTime,
        aiModelsUsed: [process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4'],
        rawAIResponse: result._rawAIResponse || result.rawAIResponse || undefined,
        rawAIError: result._rawAIError || result.rawAIError || undefined,
        errorMessage: (!result.issues || result.issues.length === 0) && result._rawAIError ? `AI parse error: ${result._rawAIError}` : undefined,
      });

      // Update repo stats
      await Repository.findByIdAndUpdate(repo._id, {
        $inc: { totalReviews: 1, openIssues: result.issues.length },
      });

      // Update user stats
      await User.findByIdAndUpdate(review.requestedBy, {
        $inc: { reviewCount: 1, qualityScore: Math.max(0, 100 - result.riskScore) },
      });

      // Emit completion
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
    const { runAIReview: run } = require('./aiService');
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
  const { runAIReview } = require('./aiService');
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

    // Persist results for direct processing path (no queue)
    const summaryText = result.summary || (result._rawAIError ? `AI parse error: ${result._rawAIError}` : 'No summary generated');
    await Review.findByIdAndUpdate(reviewId, {
      status: 'completed',
      issues: result.issues,
      summary: summaryText,
      riskScore: result.riskScore,
      riskFactors: result.riskFactors,
      suggestedTests: result.suggestedTests || [],
      secretsDetected: result.secretsDetected || [],
      totalIssues: result.issues.length,
      errorCount, warningCount, infoCount,
      aiModelsUsed: [process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4'],
      rawAIResponse: result._rawAIResponse || result.rawAIResponse || undefined,
      rawAIError: result._rawAIError || result.rawAIError || undefined,
      errorMessage: (!result.issues || result.issues.length === 0) && result._rawAIError ? `AI parse error: ${result._rawAIError}` : undefined,
    });
  } catch (err) {
    await Review.findByIdAndUpdate(reviewId, { status: 'failed', errorMessage: err.message });
  }
}

module.exports = { setupWebhookQueue, enqueueReview };
