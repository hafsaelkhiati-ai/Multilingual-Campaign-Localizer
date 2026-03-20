/**
 * ============================================================
 * routes/localize.js
 * Core API endpoint: POST /api/localize
 * ============================================================
 * Pipeline:
 *   1. Validate input
 *   2. DeepL → translate EN to DE / AR
 *   3. Claude → culturally adapt the translations
 *   4. Claude → GDPR compliance scan
 *   5. Return unified JSON response
 * ============================================================
 */

const { translateWithDeepL } = require('../services/deepl');
const { adaptWithClaude } = require('../services/claude-adapt');
const { gdprScanWithClaude } = require('../services/claude-gdpr');

// ─── Input validation ──────────────────────────────────────
function validatePayload(body) {
  const { headline, description, cta } = body;
  const errors = [];
  if (!headline || headline.trim().length < 2) errors.push('headline is required');
  if (!description || description.trim().length < 5) errors.push('description is required');
  if (!cta || cta.trim().length < 1) errors.push('cta is required');
  if (!body.targetDE && !body.targetAR) errors.push('at least one target language required');
  return errors;
}

// ─── Main handler ──────────────────────────────────────────
async function localizeHandler(req, res) {
  try {
    const errors = validatePayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }

    const {
      campaignName = 'Untitled',
      headline,
      description,
      cta,
      industry = 'ecommerce',
      formality = 'Sie',
      targetDE = true,
      targetAR = true,
    } = req.body;

    const inputCopy = { headline, description, cta };
    const result = {};

    // ── STEP 1 & 2: Translate + Adapt ──────────────────────
    const jobs = [];

    if (targetDE) {
      jobs.push(
        (async () => {
          // 1. DeepL translation to German
          const translated = await translateWithDeepL(inputCopy, 'DE');
          // 2. Claude cultural adaptation (Sie/du, tone, idioms)
          const adapted = await adaptWithClaude(translated, 'DE', { formality, industry });
          result.de = adapted;
        })()
      );
    }

    if (targetAR) {
      jobs.push(
        (async () => {
          // 1. DeepL translation to Arabic
          const translated = await translateWithDeepL(inputCopy, 'AR');
          // 2. Claude cultural adaptation (RTL, tone, idioms)
          const adapted = await adaptWithClaude(translated, 'AR', { industry });
          result.ar = adapted;
        })()
      );
    }

    // Run translations in parallel for speed
    await Promise.all(jobs);

    // ── STEP 3: GDPR compliance scan ───────────────────────
    // Scans the ORIGINAL English copy for GDPR risk phrases.
    // (The translated copy inherits these risks from the source.)
    const gdpr = await gdprScanWithClaude(inputCopy);
    result.gdpr = gdpr;

    // ── STEP 4: Return ─────────────────────────────────────
    return res.json({
      success: true,
      campaignName,
      ...result,
      meta: {
        processedAt: new Date().toISOString(),
        languages: [targetDE && 'DE', targetAR && 'AR'].filter(Boolean),
        model: 'claude-sonnet-4-20250514 + DeepL',
      },
    });

  } catch (err) {
    console.error('[localizeHandler] Error:', err.message);
    return res.status(500).json({
      error: err.message || 'Internal server error. Check your API keys and try again.',
    });
  }
}

module.exports = { localizeHandler };
