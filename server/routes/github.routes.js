const express = require('express');
const crypto = require('crypto');
const {
  captureRawBody,
  verifyWebhookSignature,
} = require('../middleware/gitHubAuth');
const githubService = require('../services/githubService');
const versionControl = require('../utils/versionControl');
const gitConfig = require('../config/gitConfig');
const auth = require('../middleware/auth');
const Room = require('../models/Room');
const User = require('../models/User');

const router = express.Router();

// ─── Webhook Endpoint ─────────────────────────────────────────────────────────
// IMPORTANT: This must use the raw-body parser BEFORE express.json()
// so the HMAC signature can be verified against the original bytes.

/**
 * POST /api/github/webhook
 *
 * Receives webhook events from GitHub (push, ping, repository, etc.).
 * The raw body is captured for signature verification, then parsed.
 */
router.post(
  '/webhook',
  express.json({ verify: captureRawBody }),
  verifyWebhookSignature,
  async (req, res) => {
    try {
      const event = req.headers['x-github-event'];
      const deliveryId = req.headers['x-github-delivery'];

      console.log(
        `GitHub webhook received: event=${event} delivery=${deliveryId}`
      );

      const result = await githubService.processWebhookEvent(event, req.body);

      return res.status(200).json({
        status: 'ok',
        event,
        deliveryId,
        result,
      });
    } catch (error) {
      console.error('GitHub webhook error:', error.message);
      return res.status(500).json({ error: 'Webhook processing failed.' });
    }
  }
);

// ─── OAuth Flow ───────────────────────────────────────────────────────────────

/**
 * GET /api/github/auth
 *
 * Initiates the GitHub OAuth flow by redirecting the user to GitHub.
 * Query parameter `token` contains the JWT token.
 */
router.get('/auth', auth, (req, res) => {
  if (!gitConfig.isConfigured()) {
    return res
      .status(503)
      .json({ error: 'GitHub integration is not configured.' });
  }

  // Generate a CSRF state token tied to the user's ID
  const state = `${req.user._id.toString()}_${crypto.randomBytes(8).toString('hex')}`;

  const url = githubService.getAuthorizationUrl(state);
  return res.redirect(url);
});

/**
 * GET /api/github/callback
 *
 * GitHub OAuth callback. Exchanges the authorization code for an access token,
 * fetches user details from GitHub, and updates the user record.
 */
router.get('/callback', async (req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.redirect(`${clientUrl}/dashboard?github=error&msg=missing_code`);
    }

    const userId = state ? state.split('_')[0] : null;
    if (!userId) {
      return res.redirect(`${clientUrl}/dashboard?github=error&msg=invalid_state`);
    }

    const accessToken = await githubService.exchangeCodeForToken(code);
    const profile = await githubService.getUserProfile(accessToken);

    await User.findByIdAndUpdate(userId, {
      githubId: profile.id.toString(),
      githubUsername: profile.login,
      githubAccessToken: accessToken,
    });

    return res.redirect(`${clientUrl}/dashboard?github=connected`);
  } catch (error) {
    console.error('GitHub OAuth callback error:', error.message);
    return res.redirect(`${clientUrl}/dashboard?github=error`);
  }
});

/**
 * POST /api/github/disconnect
 *
 * Disconnects the user's GitHub integration.
 */
router.post('/disconnect', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      githubId: null,
      githubUsername: null,
      githubAccessToken: null,
    });
    return res.status(200).json({ message: 'GitHub disconnected successfully.' });
  } catch (error) {
    console.error('GitHub disconnect error:', error.message);
    return res.status(500).json({ error: 'Failed to disconnect GitHub.' });
  }
});

// ─── Version History / Repos API ──────────────────────────────────────────────

/**
 * GET /api/github/repos
 *
 * Returns GitHub repositories for the authenticated user (from their GitHub account).
 */
router.get('/repos', auth, async (req, res) => {
  try {
    if (!req.user.githubAccessToken) {
      return res.status(200).json({ repos: [] });
    }
    const repos = await githubService.getUserRepos(req.user.githubAccessToken);
    return res.status(200).json({ repos });
  } catch (error) {
    console.error('Get user repos error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch GitHub repositories.' });
  }
});

/**
 * POST /api/github/push
 *
 * Commits and pushes the current code to a GitHub repo.
 */
router.post('/push', auth, async (req, res) => {
  try {
    const { repoFullName, path, content, commitMessage, branch } = req.body;

    if (!repoFullName || !path) {
      return res.status(400).json({ error: 'Repository and path are required.' });
    }

    if (content === undefined || content === null) {
      return res.status(400).json({ error: 'Content payload is missing.' });
    }
    
    if (content.trim() === '') {
      return res.status(400).json({ error: 'Please write some code in the editor before pushing!' });
    }

    if (!req.user.githubAccessToken) {
      return res.status(401).json({ error: 'GitHub account is not connected.' });
    }

    const result = await githubService.pushFileToRepo(
      req.user.githubAccessToken,
      repoFullName,
      path,
      content,
      commitMessage,
      branch || 'main'
    );

    return res.status(200).json({ message: 'Code pushed successfully.', result });
  } catch (error) {
    console.error('GitHub push error:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to push to GitHub.' });
  }
});

/**
 * GET /api/github/versions/:repoFullName
 *
 * Returns version history for a specific repo (tracked by webhook).
 */
router.get('/versions/:repoFullName', auth, async (req, res) => {
  try {
    const repoFullName = decodeURIComponent(req.params.repoFullName);
    const limit = parseInt(req.query.limit, 10) || 20;

    const versions = await githubService.getVersionsForRepo(repoFullName, limit);
    return res.status(200).json({ versions });
  } catch (error) {
    console.error('Get versions error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch versions.' });
  }
});

/**
 * GET /api/github/room/:roomId/versions
 *
 * Returns version history linked to a specific CollabCode room.
 */
router.get('/room/:roomId/versions', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 20;

    const versions = await versionControl.getRoomVersionHistory(roomId, limit);
    return res.status(200).json({ versions });
  } catch (error) {
    console.error('Get room versions error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch room versions.' });
  }
});

// ─── Health / Config Check ────────────────────────────────────────────────────

/**
 * GET /api/github/status
 *
 * Returns configuration and connection status for the logged-in user.
 */
router.get('/status', auth, (req, res) => {
  return res.status(200).json({
    configured: gitConfig.isConfigured(),
    clientId: gitConfig.clientId ? `${gitConfig.clientId.slice(0, 4)}...` : null,
    connected: !!req.user.githubAccessToken,
    username: req.user.githubUsername,
  });
});

/**
 * POST /api/github/room/:roomId/import
 * Imports a GitHub repository into a CollabCode workspace.
 */
router.post('/room/:roomId/import', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { repoFullName, branch } = req.body;
    
    if (!repoFullName) {
      return res.status(400).json({ error: 'Repository is required.' });
    }

    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ error: 'Room not found.' });

    const owner = await User.findById(room.ownerId);
    if (!owner || !owner.githubAccessToken) {
      return res.status(401).json({ error: 'The room owner has not connected their GitHub account.' });
    }

    const result = await githubService.importRepoToWorkspace(
      roomId,
      repoFullName,
      branch || 'main',
      owner.githubAccessToken
    );

    // Save the repo name to the room
    room.githubRepo = repoFullName;
    await room.save();

    return res.status(200).json({ message: 'Repository imported successfully', result, room });
  } catch (error) {
    console.error('GitHub import error:', error);
    return res.status(500).json({ error: error.message || 'Failed to import repository.' });
  }
});

/**
 * POST /api/github/room/:roomId/push-all
 * Pushes the entire workspace to GitHub as a single commit.
 */
router.post('/room/:roomId/push-all', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { repoFullName, branch, commitMessage } = req.body;
    
    if (!repoFullName) {
      return res.status(400).json({ error: 'Repository is required.' });
    }

    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ error: 'Room not found.' });

    const owner = await User.findById(room.ownerId);
    if (!owner || !owner.githubAccessToken) {
      return res.status(401).json({ error: 'The room owner has not connected their GitHub account.' });
    }

    const result = await githubService.pushWorkspaceToRepo(
      roomId,
      repoFullName,
      commitMessage,
      branch || 'main',
      owner.githubAccessToken
    );

    return res.status(200).json({ message: 'Workspace pushed successfully', result });
  } catch (error) {
    console.error('GitHub push-all error:', error);
    return res.status(500).json({ error: error.message || 'Failed to push workspace.' });
  }
});

module.exports = router;
