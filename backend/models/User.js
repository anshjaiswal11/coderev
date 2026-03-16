const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  githubId: { type: String, required: true, unique: true, index: true },
  username: { type: String, required: true },
  displayName: { type: String },
  email: { type: String },
  avatarUrl: { type: String },
  githubToken: { type: String }, // encrypted in production
  profileUrl: { type: String },

  // Style guide preferences
  styleGuide: {
    rules: [{ name: String, enabled: Boolean, severity: { type: String, enum: ['error', 'warning', 'info'], default: 'warning' } }],
    language: { type: String, default: 'javascript' },
    customPrompt: String,
  },

  // Gamification
  badges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
  qualityScore: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  fixedIssuesCount: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  lastActiveDate: Date,

  // Severity preferences (noise control)
  mutedCategories: [String],
  severityOverrides: { type: Map, of: String },

  plan: { type: String, enum: ['free', 'pro', 'team'], default: 'free' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.githubToken;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
