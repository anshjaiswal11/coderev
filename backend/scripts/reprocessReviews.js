#!/usr/bin/env node
// Reprocess stored reviews that contain rawAIResponse but have empty issues/riskScore.

require('dotenv').config();
const connectDB = require('../config/database');
const Review = require('../models/Review');
const aiService = require('../services/aiService');

async function main() {
  await connectDB();
  console.log('Searching for reviews to reprocess...');

  // Find reviews with rawAIResponse present but no parsed issues or null riskScore
  const cursor = Review.find({ rawAIResponse: { $exists: true, $ne: null }, $or: [ { issues: { $size: 0 } }, { riskScore: { $in: [null, undefined] } }, { summary: /AI returned/ } ] }).cursor();

  let count = 0;
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    try {
      console.log(`Reprocessing review ${doc._id}...`);
      const parsed = await aiService.parseRawAIResponse(doc.rawAIResponse);

      // Normalize fields
      const issues = parsed.issues || [];
      const secretsDetected = parsed.secretsDetected || [];
      const suggestedTests = parsed.suggestedTests || [];
      const complianceFlags = parsed.complianceFlags || [];
      const suggestedChanges = parsed.suggestedChanges || [];

      const riskScore = (typeof parsed.riskScore === 'number') ? parsed.riskScore : (issues.length ? Math.min(90, issues.length * 10) : null);

      await Review.findByIdAndUpdate(doc._id, {
        summary: parsed.summary || doc.summary,
        issues,
        secretsDetected,
        suggestedTests,
        complianceFlags,
        suggestedChanges,
        riskScore,
        riskFactors: parsed.riskFactors || doc.riskFactors || null,
        totalIssues: issues.length,
        errorCount: issues.filter(i => i.severity === 'error').length,
        warningCount: issues.filter(i => i.severity === 'warning').length,
        infoCount: issues.filter(i => i.severity === 'info').length,
        rawAIError: parsed._rawAIError || doc.rawAIError,
        updatedAt: new Date(),
      });
      console.log(`Updated review ${doc._id}: issues=${issues.length} risk=${riskScore}`);
      count++;
    } catch (err) {
      console.error(`Failed to reprocess ${doc._id}:`, err.message);
    }
  }

  console.log(`Done. Reprocessed ${count} review(s).`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
