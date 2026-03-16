const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  line: Number,
  endLine: Number,
  file: String,
  category: {
    type: String,
    enum: ['bug', 'security', 'performance', 'style', 'best-practice', 'test', 'complexity'],
  },
  severity: { type: String, enum: ['error', 'warning', 'info'], default: 'warning' },
  title: String,
  description: String,
  suggestion: String,  // AI-generated fix
  patchCode: String,   // Ready-to-apply code patch
  cweid: String,       // CWE security ID
  owaspCategory: String,
  // Feedback
  accepted: { type: Boolean, default: null },
  dismissed: { type: Boolean, default: false },
  dismissReason: String,
});

const reviewSchema = new mongoose.Schema({
  repository: { type: mongoose.Schema.Types.ObjectId, ref: 'Repository', required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // GitHub PR/commit data
  prNumber: Number,
  prTitle: String,
  prUrl: String,
  commitSha: String,
  branch: String,
  baseBranch: String,
  diffContent: String,
  filesChanged: [String],

  // AI Review results
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  issues: [issueSchema],
  summary: String,
  aiModelsUsed: [String],  // multi-model consensus

  // Risk scoring
  riskScore: { type: Number, min: 0, max: 100 },
  riskFactors: {
    blastRadius: Number,    // files affected
    complexity: Number,     // cyclomatic complexity delta
    churnScore: Number,     // how often these files change
    securityFlags: Number,
  },

  // Test suggestions
  suggestedTests: [{
    functionName: String,
    testCode: String,
    framework: String,
  }],

  // Secrets detected
  secretsDetected: [{
    file: String,
    line: Number,
    type: String,  // API_KEY, PASSWORD, etc.
    masked: String,
  }],

  // Compliance
  complianceFlags: [{
    standard: String,  // HIPAA, PCI, SOC2
    rule: String,
    file: String,
    line: Number,
  }],

  // Stats
  totalIssues: { type: Number, default: 0 },
  errorCount: { type: Number, default: 0 },
  warningCount: { type: Number, default: 0 },
  infoCount: { type: Number, default: 0 },
  acceptedCount: { type: Number, default: 0 },
  dismissedCount: { type: Number, default: 0 },

  processingTime: Number,  // ms
  errorMessage: String,
  // Raw AI response and parsing error (useful for debugging when model returns non-JSON)
  rawAIResponse: String,
  rawAIError: String,
  // AI quality rating and suggested high-level changes
  aiRating: { type: Number, min: 0, max: 100 },
  suggestedChanges: [{
    type: String, // e.g., 'security', 'performance', 'refactor', 'test', 'style'
    title: String,
    description: String,
    codeExample: String,
  }],
}, { timestamps: true });

reviewSchema.index({ repository: 1, createdAt: -1 });
reviewSchema.index({ requestedBy: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
