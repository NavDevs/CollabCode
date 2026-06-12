const RepoVersion = require('../models/RepoVersion');
const WorkspaceFile = require('../models/WorkspaceFile');
const yjsService = require('./yjs.service');
const gitConfig = require('../config/gitConfig');

/**
 * GitHub Service
 *
 * Handles incoming webhook payloads, persists sync events, and
 * provides helpers for the GitHub OAuth token exchange.
 */

// ─── Webhook Processing ──────────────────────────────────────────────────────

/**
 * Process a "push" event from GitHub.
 * Docs: https://docs.github.com/en/webhooks/webhook-events-and-payloads#push
 *
 * @param {object} payload - Parsed webhook JSON body
 * @returns {Promise<object>} - The created RepoVersion document
 */
const handlePushEvent = async (payload) => {
  const repoFullName = payload.repository?.full_name;
  const branch = (payload.ref || '').replace('refs/heads/', '');
  const headCommit = payload.head_commit || {};
  const commitSha = payload.after || headCommit.id || '';
  const commitMessage = headCommit.message || '';
  const author =
    payload.sender?.login || headCommit.author?.username || 'unknown';
  const compareUrl = payload.compare || '';

  if (!repoFullName || !commitSha) {
    throw new Error('Push payload missing repository or commit SHA.');
  }

  // Ignore branch-deletion events (after is all zeros)
  if (/^0+$/.test(commitSha)) {
    console.log(`GitHub sync: branch deletion on ${repoFullName}, skipping.`);
    return null;
  }

  // Upsert so duplicate deliveries don't create duplicate records
  const version = await RepoVersion.findOneAndUpdate(
    { repoFullName, commitSha },
    {
      repoFullName,
      branch,
      commitSha,
      commitMessage,
      author,
      compareUrl,
      status: 'synced',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(
    `GitHub sync: stored push ${commitSha.slice(0, 7)} on ${repoFullName} [${branch}]`
  );

  return version;
};

/**
 * Route a webhook payload to the correct handler based on the event type.
 *
 * @param {string} event - GitHub event type from X-GitHub-Event header
 * @param {object} payload - Parsed webhook JSON body
 * @returns {Promise<object>}
 */
const processWebhookEvent = async (event, payload) => {
  switch (event) {
    case 'push':
      return handlePushEvent(payload);

    case 'ping':
      // GitHub sends a "ping" event when the webhook is first configured
      console.log(
        `GitHub ping received for ${payload.repository?.full_name || 'unknown repo'}`
      );
      return { status: 'pong' };

    case 'repository':
      console.log(`GitHub repository event: ${payload.action}`);
      return { status: 'acknowledged', action: payload.action };

    default:
      console.log(`GitHub event "${event}" not handled — ignoring.`);
      return { status: 'ignored', event };
  }
};

// ─── OAuth Helpers ────────────────────────────────────────────────────────────

/**
 * Build the GitHub OAuth authorization URL for the user to log in.
 * Scopes: "repo" gives read/write access to private & public repos.
 *
 * @param {string} state - CSRF state token
 * @returns {string} - Full authorization URL
 */
const getAuthorizationUrl = (state) => {
  const params = new URLSearchParams({
    client_id: gitConfig.clientId,
    redirect_uri: gitConfig.redirectUri,
    scope: 'repo',
    state,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
};

/**
 * Exchange the OAuth authorization code for an access token.
 *
 * @param {string} code - Authorization code from GitHub callback
 * @returns {Promise<string>} - Access token
 */
const exchangeCodeForToken = async (code) => {
  const response = await fetch(
    'https://github.com/login/oauth/access_token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: gitConfig.clientId,
        client_secret: gitConfig.clientSecret,
        code,
        redirect_uri: gitConfig.redirectUri,
      }),
    }
  );

  const data = await response.json();

  if (data.error) {
    throw new Error(
      `GitHub OAuth error: ${data.error_description || data.error}`
    );
  }

  return data.access_token;
};

// ─── Version Query Helpers ────────────────────────────────────────────────────

/**
 * Get recent sync versions for a repository.
 *
 * @param {string} repoFullName - e.g. "octocat/hello-world"
 * @param {number} limit - Max records to return (default 20)
 * @returns {Promise<Array>}
 */
const getVersionsForRepo = async (repoFullName, limit = 20) => {
  return RepoVersion.find({ repoFullName })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

/**
 * Get all repos that have been synced (for the dashboard / overview).
 *
 * @returns {Promise<Array>}
 */
const getSyncedRepos = async () => {
  return RepoVersion.aggregate([
    { $group: { _id: '$repoFullName', lastSync: { $max: '$createdAt' } } },
    { $sort: { lastSync: -1 } },
  ]);
};

/**
 * Fetch user profile from GitHub API.
 *
 * @param {string} accessToken
 * @returns {Promise<object>}
 */
const getUserProfile = async (accessToken) => {
  const response = await fetch(`${gitConfig.apiBase}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'User-Agent': 'CollabCode',
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`GitHub profile fetch failed: ${response.statusText} - ${errText}`);
  }

  return response.json();
};

/**
 * Fetch list of repos for the authenticated user.
 *
 * @param {string} accessToken
 * @returns {Promise<Array>}
 */
const getUserRepos = async (accessToken) => {
  const response = await fetch(`${gitConfig.apiBase}/user/repos?sort=updated&per_page=100`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'User-Agent': 'CollabCode',
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`GitHub repos fetch failed: ${response.statusText} - ${errText}`);
  }

  return response.json();
};

/**
 * Commit and push a single file's content to a repo.
 *
 * @param {string} accessToken
 * @param {string} repoFullName
 * @param {string} path
 * @param {string} content
 * @param {string} commitMessage
 * @param {string} branch
 * @returns {Promise<object>}
 */
const pushFileToRepo = async (accessToken, repoFullName, path, content, commitMessage, branch = 'main') => {
  const fileUrl = `${gitConfig.apiBase}/repos/${repoFullName}/contents/${path}?ref=${branch}`;
  let sha = null;

  try {
    const getRes = await fetch(fileUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'User-Agent': 'CollabCode',
      },
    });
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
    }
  } catch (err) {
    console.log('Error fetching file SHA (assuming new file):', err.message);
  }

  const putUrl = `${gitConfig.apiBase}/repos/${repoFullName}/contents/${path}`;
  const body = {
    message: commitMessage || 'Update via CollabCode',
    content: Buffer.from(content).toString('base64'),
    branch,
  };

  if (sha) {
    body.sha = sha;
  }

  const putRes = await fetch(putUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'CollabCode',
    },
    body: JSON.stringify(body),
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`GitHub push failed: ${putRes.statusText} - ${errText}`);
  }

  return putRes.json();
};

const importRepoToWorkspace = async (roomId, repoFullName, branch, accessToken) => {
  const treeUrl = `${gitConfig.apiBase}/repos/${repoFullName}/git/trees/${branch}?recursive=1`;
  const treeRes = await fetch(treeUrl, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'User-Agent': 'CollabCode' }
  });
  if (!treeRes.ok) throw new Error('Failed to fetch repository tree');
  const treeData = await treeRes.json();
  
  const files = treeData.tree.filter(item => item.type === 'blob');
  const IGNORE = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.tar', '.gz'];
  const IGNORE_DIRS = ['node_modules/', '.git/', 'dist/', 'build/'];
  const validFiles = files.filter(f => {
    if (IGNORE_DIRS.some(dir => f.path.includes(dir))) return false;
    if (IGNORE.some(ext => f.path.toLowerCase().endsWith(ext))) return false;
    return true;
  });

  const toProcess = validFiles.slice(0, 100);

  // cleanup in-memory yjs docs
  await yjsService.cleanupRoomDocs(roomId);
  await WorkspaceFile.deleteMany({ roomId });

  const getLanguageFromExt = (path) => {
    const ext = path.split('.').pop().toLowerCase();
    const map = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', html: 'html', css: 'css', json: 'json', md: 'markdown', go: 'go' };
    return map[ext] || 'plaintext';
  };

  await Promise.all(toProcess.map(async (f) => {
    try {
      const blobRes = await fetch(f.url, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'User-Agent': 'CollabCode' }
      });
      if (!blobRes.ok) return;
      const blobData = await blobRes.json();
      const content = Buffer.from(blobData.content, 'base64').toString('utf8');
      
      const normalizedPath = f.path.startsWith('/') ? f.path : '/' + f.path;
      await WorkspaceFile.create({
        roomId,
        path: normalizedPath,
        name: f.path.split('/').pop(),
        language: getLanguageFromExt(f.path),
        content,
      });
    } catch (err) {
      console.error(`Failed to import file ${f.path}`, err);
    }
  }));
  return { imported: toProcess.length };
};

const pushWorkspaceToRepo = async (roomId, repoFullName, commitMessage, branch, accessToken) => {
  const headers = { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'User-Agent': 'CollabCode' };
  
  await yjsService.flushRoomDocs(roomId);
  const files = await WorkspaceFile.find({ roomId });
  if (!files || files.length === 0) throw new Error('Workspace is empty');

  // 1. Get branch ref
  const refRes = await fetch(`${gitConfig.apiBase}/repos/${repoFullName}/git/ref/heads/${branch}`, { headers });
  if (!refRes.ok) throw new Error(`Branch ${branch} not found`);
  const refData = await refRes.json();
  const latestCommitSha = refData.object.sha;

  // 2. Get base tree
  const commitRes = await fetch(`${gitConfig.apiBase}/repos/${repoFullName}/git/commits/${latestCommitSha}`, { headers });
  const commitData = await commitRes.json();
  const baseTreeSha = commitData.tree.sha;

  // 3. Create blobs for workspace files
  const treeItems = await Promise.all(files.map(async (file) => {
    const blobRes = await fetch(`${gitConfig.apiBase}/repos/${repoFullName}/git/blobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content: file.content || '', encoding: 'utf-8' })
    });
    const blobData = await blobRes.json();
    let p = file.path.startsWith('/') ? file.path.slice(1) : file.path;
    return {
      path: p,
      mode: '100644',
      type: 'blob',
      sha: blobData.sha
    };
  }));

  // 4. Create new Tree
  const newTreeRes = await fetch(`${gitConfig.apiBase}/repos/${repoFullName}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems })
  });
  const newTreeData = await newTreeRes.json();
  const newTreeSha = newTreeData.sha;

  // 5. Create Commit
  const newCommitRes = await fetch(`${gitConfig.apiBase}/repos/${repoFullName}/git/commits`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: commitMessage || 'Update workspace via CollabCode',
      tree: newTreeSha,
      parents: [latestCommitSha]
    })
  });
  const newCommitData = await newCommitRes.json();
  const newCommitSha = newCommitData.sha;

  // 6. Update Ref
  const updateRefRes = await fetch(`${gitConfig.apiBase}/repos/${repoFullName}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ sha: newCommitSha, force: false })
  });
  
  if (!updateRefRes.ok) {
    const errText = await updateRefRes.text();
    throw new Error(`Failed to update branch ref: ${errText}`);
  }

  return await updateRefRes.json();
};

module.exports = {
  processWebhookEvent,
  handlePushEvent,
  getAuthorizationUrl,
  exchangeCodeForToken,
  getUserProfile,
  getUserRepos,
  pushFileToRepo,
  getVersionsForRepo,
  getSyncedRepos,
  importRepoToWorkspace,
  pushWorkspaceToRepo,
};
