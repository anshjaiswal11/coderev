const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  icon: String,  // emoji or icon name
  color: String,
  criteria: {
    type: { type: String, enum: ['review_count', 'fixed_issues', 'streak', 'zero_errors', 'security_expert', 'custom'] },
    threshold: Number,
  },
});

// Seed default badges
const BADGES = [
  { slug: 'first-review', name: 'First Review', description: 'Completed your first AI code review', icon: '🔍', color: '#6366f1', criteria: { type: 'review_count', threshold: 1 } },
  { slug: 'review-10', name: 'Review Veteran', description: '10 code reviews completed', icon: '⚡', color: '#f59e0b', criteria: { type: 'review_count', threshold: 10 } },
  { slug: 'review-100', name: 'Review Master', description: '100 code reviews completed', icon: '🏆', color: '#f59e0b', criteria: { type: 'review_count', threshold: 100 } },
  { slug: 'security-expert', name: 'Security Expert', description: 'Fixed 10+ security issues', icon: '🛡️', color: '#ef4444', criteria: { type: 'security_expert', threshold: 10 } },
  { slug: 'bug-squasher', name: 'Bug Squasher', description: 'Fixed 50 bugs', icon: '🐛', color: '#10b981', criteria: { type: 'fixed_issues', threshold: 50 } },
  { slug: 'zero-hero', name: 'Zero Hero', description: '5 consecutive reviews with zero errors', icon: '✨', color: '#8b5cf6', criteria: { type: 'zero_errors', threshold: 5 } },
  { slug: 'streak-7', name: 'Week Warrior', description: '7-day review streak', icon: '🔥', color: '#f97316', criteria: { type: 'streak', threshold: 7 } },
];

module.exports = mongoose.model('Badge', badgeSchema);
module.exports.BADGES = BADGES;
