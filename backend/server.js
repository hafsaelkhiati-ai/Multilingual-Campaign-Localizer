/**
 * ============================================================
 * AGENT 03 — Multilingual Campaign Localizer
 * Backend Server (Express.js)
 * ============================================================
 * Serves the frontend and exposes /api/localize endpoint.
 * Orchestrates: DeepL → Claude Adaptation → GDPR Scan
 * ============================================================
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { localizeHandler } = require('./routes/localize');

const app = express();

// ─── PORT ──────────────────────────────────────────────────
// Change this if your VPS already uses 3000
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Serve the frontend (index.html + static assets)
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── Rate limiting ─────────────────────────────────────────
// Prevents API abuse — 20 localizations per IP per hour
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { error: 'Too many requests. Please wait before trying again.' },
});
app.use('/api/', limiter);

// ─── Routes ────────────────────────────────────────────────
app.post('/api/localize', localizeHandler);

// Health check (useful for monitoring on VPS)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', agent: 'AGENT 03', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Fallback: serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ─── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 AGENT 03 Campaign Localizer running on port ${PORT}`);
  console.log(`   Local:  http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
