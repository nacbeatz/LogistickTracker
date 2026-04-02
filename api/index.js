const app = require('../backend/server');

module.exports = (req, res) => {
  // Vercel strips the /api prefix since this function lives in api/ directory.
  // Re-add it so Express routes (/api/auth, /api/shipments, etc.) match correctly.
  if (!req.url.startsWith('/api')) {
    req.url = `/api${req.url}`;
  }
  return app(req, res);
};
