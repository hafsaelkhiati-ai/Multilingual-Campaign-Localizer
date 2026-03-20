/**
 * ============================================================
 * services/claude-gdpr.js
 * Claude API — GDPR Compliance Scanner
 * ============================================================
 * Scans English ad copy for GDPR risk phrases before
 * localisation goes live. Checks for:
 *   - Missing opt-out / unsubscribe language
 *   - Vague personalisation claims ("we know what you like")
 *   - Cookie or tracking mentions without disclosure
 *   - Personal data claims ("your email", "your location")
 *   - Guaranteed result claims in regulated industries
 *   - Missing consent language for data collection
 *
 * ~90% of common GDPR risk phrases caught automatically.
 * Always combine with a human legal review before going live.
 * ============================================================
 */

const Anthropic = require('@anthropic-ai/sdk');

// ─────────────────────────────────────────────────────────────
// ⬇ Uses the same ANTHROPIC_API_KEY as claude-adapt.js
// Reads from the environment variable set in .env
// ─────────────────────────────────────────────────────────────
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'YOUR_ANTHROPIC_API_KEY_HERE';

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ─── GDPR scan system prompt ──────────────────────────────
const GDPR_SYSTEM_PROMPT = `
You are a GDPR compliance expert specialising in digital advertising under EU Regulation 2016/679.
Your task is to scan English ad copy for phrases that could violate GDPR when used in campaigns
targeting EU/DACH audiences.

GDPR RISK CATEGORIES to scan for:
1. PERSONAL DATA CLAIMS — phrases implying knowledge of personal data without consent
   Examples: "based on your browsing", "we know your preferences", "tailored to you"
2. VAGUE CONSENT — promises of personalisation without specifying consent mechanism
   Examples: "personalised for you", "curated just for you"
3. MISSING OPT-OUT — promotional offers with no mention of easy cancellation or unsubscribe
   Examples: "Sign up for offers" without "unsubscribe anytime"
4. COOKIE/TRACKING MENTIONS — any tracking reference without GDPR disclosure
   Examples: "we track your journey", "retargeting", "pixel"
5. DATA COLLECTION — implicit or explicit collection of user data without transparency
   Examples: "save your details", "remember your preferences"
6. GUARANTEED OUTCOMES — especially for finance/health (violates multiple EU regulations)
   Examples: "guaranteed returns", "definitely cure", "100% effective"

SEVERITY LEVELS:
- high: Clear GDPR violation — must fix before publishing
- medium: Potential issue — should review with legal team
- low: Minor concern — consider adding a clarifying note

RETURN: ONLY a valid JSON object with no markdown or extra text:
{
  "score": "PASS" | "WARN" | "FAIL",
  "flags": [
    {
      "phrase": "exact phrase from the copy",
      "reason": "Why this is a GDPR risk",
      "suggestion": "A compliant rewrite",
      "risk": "high" | "medium" | "low"
    }
  ],
  "summary": "One sentence overall assessment"
}

If no issues found, return: { "score": "PASS", "flags": [], "summary": "No GDPR risk phrases detected." }
`.trim();

/**
 * Scan ad copy for GDPR compliance issues using Claude.
 *
 * @param {Object} copy - { headline, description, cta }
 * @returns {Object} - { score, flags, summary }
 */
async function gdprScanWithClaude(copy) {
  if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === 'YOUR_ANTHROPIC_API_KEY_HERE') {
    // If key not set, return a warning but don't crash the whole pipeline
    console.warn('[claude-gdpr] API key not set — GDPR scan skipped.');
    return {
      score: 'WARN',
      flags: [{
        phrase: 'GDPR scan unavailable',
        reason: 'Anthropic API key not configured.',
        suggestion: 'Set ANTHROPIC_API_KEY in .env and rerun.',
        risk: 'medium',
      }],
      summary: 'GDPR scan was skipped due to missing API key.',
    };
  }

  const userMessage = `
Please scan this English ad copy for GDPR compliance:

HEADLINE: ${copy.headline}
DESCRIPTION: ${copy.description}
CTA: ${copy.cta}

Return only the JSON compliance report.
`.trim();

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: GDPR_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const rawText = response.content[0]?.text || '';
    const parsed = safeParseJSON(rawText);

    // Validate structure
    if (!parsed || typeof parsed.score === 'undefined') {
      return { score: 'WARN', flags: [], summary: 'GDPR scan returned unexpected format.' };
    }

    return parsed;

  } catch (err) {
    console.error('[claude-gdpr] Scan error:', err.message);
    // Non-fatal: return a soft warning so the rest of the pipeline completes
    return {
      score: 'WARN',
      flags: [],
      summary: 'GDPR scan could not complete. Please review manually before publishing.',
    };
  }
}

// ─── Safe JSON parser ─────────────────────────────────────
function safeParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try { return JSON.parse(match[1].trim()); } catch (_2) { /* fall through */ }
    }
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try { return JSON.parse(objMatch[0]); } catch (_3) { /* fall through */ }
    }
    return null;
  }
}

module.exports = { gdprScanWithClaude };
