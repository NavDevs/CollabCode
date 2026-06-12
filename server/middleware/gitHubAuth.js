const crypto = require('crypto');
const gitConfig = require('../config/gitConfig');

/**
 * Express middleware that verifies GitHub webhook payloads.
 *
 * GitHub sends an `X-Hub-Signature-256` header with every webhook delivery.
 * The value looks like: sha256=<hex-digest>
 *
 * We compute HMAC-SHA256 of the raw request body using our webhook secret
 * and compare it with the signature GitHub sent.
 *
 * IMPORTANT: This middleware must be applied BEFORE express.json() on the
 * webhook route, because we need the raw body to compute the signature.
 * We attach the parsed body to `req.body` after verification.
 */

// Capture the raw body for signature verification
const captureRawBody = (req, res, buf) => {
  req.rawBody = buf.toString('utf8');
};

/**
 * Verify the webhook signature.
 * Use this as route-level middleware:
 *   router.post('/webhook', verifyWebhookSignature, handler)
 */
const verifyWebhookSignature = (req, res, next) => {
  const signature = req.headers['x-hub-signature-256'];

  if (!signature) {
    console.warn('GitHub webhook: missing X-Hub-Signature-256 header');
    return res.status(401).json({ error: 'Missing webhook signature.' });
  }

  const secret = gitConfig.webhookSecret;
  if (!secret) {
    console.error('GitHub webhook: GITHUB_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured.' });
  }

  // Compute expected signature
  const rawBody = req.rawBody || JSON.stringify(req.body);
  const expected =
    'sha256=' +
    crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  // Use timingSafeEqual to prevent timing attacks
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    console.warn('GitHub webhook: signature mismatch');
    return res.status(401).json({ error: 'Invalid webhook signature.' });
  }

  next();
};

module.exports = { captureRawBody, verifyWebhookSignature };
