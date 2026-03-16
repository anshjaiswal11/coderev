const mongoose = require('mongoose');

const repoSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  githubRepoId: { type: Number, required: true },
  fullName: { type: String, required: true }, // owner/repo
  name: { type: String, required: true },
  description: String,
  language: String,
  private: { type: Boolean, default: false },
  htmlUrl: String,
  defaultBranch: { type: String, default: 'main' },

  // Webhook
  webhookId: Number,
  webhookActive: { type: Boolean, default: false },

  // Codebase memory — AI learns patterns
  codebaseMemory: {
    patterns: [{ pattern: String, frequency: Number, lastSeen: Date }],
    namingConventions: [String],
    architectureNotes: String,
    lastAnalyzed: Date,
  },

  // Tech debt heatmap data
  riskFiles: [{
    path: String,
    riskScore: Number,
    issues: Number,
    lastModified: Date,
  }],

  // Stats
  totalReviews: { type: Number, default: 0 },
  openIssues: { type: Number, default: 0 },
  resolvedIssues: { type: Number, default: 0 },

  active: { type: Boolean, default: true },
}, { timestamps: true });

repoSchema.index({ owner: 1, fullName: 1 }, { unique: true });

module.exports = mongoose.model('Repository', repoSchema);
