const N8N_API_KEY = process.env.N8N_API_KEY || 'mlts-n8n-webhook-key-2026-change-in-production';

const webhookAuth = (req, res, next) => {
  const apiKey =
    req.headers['x-api-key'] ||
    req.headers['x-webhook-key'] ||
    req.query.apiKey;

  if (!apiKey || apiKey !== N8N_API_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or missing API key. Provide via x-api-key header or apiKey query param.'
    });
  }

  next();
};

module.exports = { webhookAuth };
