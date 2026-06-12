const mongoose = require('mongoose');

/**
 * RepoVersion tracks every sync event coming from a GitHub webhook.
 * Each push / commit that we process gets a record here so the client
 * can request a change-list and display version history.
 */
const repoVersionSchema = new mongoose.Schema({
  // GitHub repository full name, e.g. "octocat/hello-world"
  repoFullName: {
    type: String,
    required: [true, 'Repository name is required'],
    index: true,
  },

  // Branch that was pushed to
  branch: {
    type: String,
    default: 'main',
  },

  // SHA of the HEAD commit after the push
  commitSha: {
    type: String,
    required: [true, 'Commit SHA is required'],
  },

  // Short human-readable message from the commit
  commitMessage: {
    type: String,
    default: '',
  },

  // GitHub user who pushed
  author: {
    type: String,
    default: '',
  },

  // Link to the commit / comparison on GitHub
  compareUrl: {
    type: String,
    default: '',
  },

  // CollabCode room this repo is linked to (optional, can be null)
  linkedRoomId: {
    type: String,
    default: null,
    index: true,
  },

  // Status of the sync processing
  status: {
    type: String,
    enum: ['received', 'processing', 'synced', 'failed'],
    default: 'received',
  },

  // Error message if status === 'failed'
  errorMessage: {
    type: String,
    default: '',
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Compound index: unique per repo + commitSha to avoid duplicate entries
repoVersionSchema.index({ repoFullName: 1, commitSha: 1 }, { unique: true });

const RepoVersion = mongoose.model('RepoVersion', repoVersionSchema);

module.exports = RepoVersion;
