/**
 * GitHub Sync configuration.
 * Reads from environment variables and exposes a single config object.
 */

const gitConfig = {
  // GitHub OAuth App credentials (for user-level repo access)
  clientId: process.env.GITHUB_CLIENT_ID || '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  redirectUri:
    process.env.GITHUB_REDIRECT_URI ||
    'http://localhost:5000/api/github/callback',

  // Webhook secret used to verify GitHub payloads (HMAC-SHA256)
  webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',

  // GitHub API base URL (useful for GitHub Enterprise)
  apiBase: process.env.GITHUB_API_BASE || 'https://api.github.com',

  // Default branch to track
  defaultBranch: process.env.GITHUB_DEFAULT_BRANCH || 'main',

  // Rate-limiting — max webhook requests per minute per IP
  rateLimitMax: parseInt(process.env.GITHUB_RATE_LIMIT_MAX, 10) || 60,
};

/**
 * Returns true when all required credentials are present.
 */
gitConfig.isConfigured = function isConfigured() {
  return Boolean(
    this.clientId &&
      this.clientSecret &&
      this.webhookSecret
  );
};

module.exports = gitConfig;
