/**
 * ============================================================
 * services/claude-adapt.js
 * Claude API — Cultural Adaptation Layer
 * ============================================================
 * Takes DeepL-translated copy and refines it for:
 *   - German: formal Sie / informal du, no superlatives,
 *             direct benefit statements, brand trust cues
 *   - Arabic: RTL-friendly phrasing, cultural sensitivity,
 *             formal Modern Standard Arabic tone
 *
 * Docs: https://docs.anthropic.com/en/api/getting-started
 * ============================================================
 */

const Anthropic = require('@anthropic-ai/sdk');

// ─────────────────────────────────────────────────────────────
// ⬇ ADD YOUR ANTHROPIC API KEY HERE
// Get it at: https://console.anthropic.com/settings/keys
// ─────────────────────────────────────────────────────────────
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'YOUR_ANTHROPIC_API_KEY_HERE';

// Initialise the Anthropic client
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ─── Language-specific system prompts ─────────────────────
const SYSTEM_PROMPTS = {
  DE: (formality, industry) => `
You are a senior German copywriter and cultural adaptation expert for digital advertising.
Your task: refine machine-translated German ad copy for a ${industry} brand.

FORMALITY: Use "${formality}" form consistently throughout. Never mix them.
${formality === 'Sie' ? 'Sie = formal, used for B2B, finance, professional services. More trust-building.' : 'Du = informal, used for youth brands, lifestyle, DTC. More approachable.'}

GERMAN COPY RULES:
- Germans value directness, precision, and concrete benefits over hype
- Avoid superlatives like "best", "amazing", "incredible" — they reduce trust
- Use compound nouns and professional vocabulary where natural
- CTA should be action-oriented and clear (e.g. "Jetzt kaufen", "Mehr erfahren")
- Headline should lead with the benefit, not the brand
- Keep ad copy concise — Germans dislike padding

RETURN: Only a JSON object with this exact shape (no markdown, no extra text):
{
  "headline": "...",
  "description": "...",
  "cta": "...",
  "culturalNote": "One sentence explaining the main adaptation made"
}
`.trim(),

  AR: (_, industry) => `
You are a senior Arabic copywriter and cultural adaptation expert for digital advertising.
Your task: refine machine-translated Arabic ad copy for a ${industry} brand targeting MENA consumers.

ARABIC COPY RULES:
- Use Modern Standard Arabic (فصحى) — universally understood across all Arab countries
- Be culturally respectful — avoid references that could be considered immodest or inappropriate
- Arabic consumers respond to trust signals, quality emphasis, and family/community values
- Avoid overly aggressive sales language — subtlety and respect are more effective
- Numbers and prices: use Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩) where natural
- CTA should feel helpful, not pushy (e.g. "تسوق الآن", "اكتشف المزيد")
- Headlines work best when they open with a question or a promise

RETURN: Only a JSON object with this exact shape (no markdown, no extra text):
{
  "headline": "...",
  "description": "...",
  "cta": "...",
  "culturalNote": "One sentence in English explaining the main adaptation made"
}
`.trim(),
};

/**
 * Use Claude to culturally adapt translated copy.
 *
 * @param {Object} translated - { headline, description, cta }
 * @param {string} language - 'DE' | 'AR'
 * @param {Object} opts - { formality, industry }
 * @returns {Object} - { headline, description, cta, culturalNote }
 */
async function adaptWithClaude(translated, language, opts = {}) {
  if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === 'YOUR_ANTHROPIC_API_KEY_HERE') {
    throw new Error('Anthropic API key not configured. Set ANTHROPIC_API_KEY in your .env file.');
  }

  const { formality = 'Sie', industry = 'ecommerce' } = opts;
  const systemPrompt = SYSTEM_PROMPTS[language]?.(formality, industry);

  if (!systemPrompt) {
    // If language not supported by adaptation, return translated as-is
    return translated;
  }

  const userMessage = `
Here is the machine-translated ad copy for a ${industry} campaign:

HEADLINE: ${translated.headline}
DESCRIPTION: ${translated.description}
CTA: ${translated.cta}

Please refine this for the target audience. Remember to return ONLY the JSON object.
`.trim();

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', // Best model for nuanced copywriting
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const rawText = response.content[0]?.text || '';

    // Parse JSON from Claude's response
    const adapted = safeParseJSON(rawText, translated);
    return adapted;

  } catch (err) {
    if (err.status === 401) {
      throw new Error('Anthropic API key is invalid. Check your key at console.anthropic.com');
    }
    if (err.status === 529) {
      throw new Error('Anthropic API is overloaded. Please retry in a moment.');
    }
    console.error('[claude-adapt] Error:', err.message);
    // Graceful fallback: return the DeepL translation without Claude adaptation
    return { ...translated, culturalNote: 'Claude adaptation unavailable — showing DeepL translation.' };
  }
}

// ─── Safe JSON parser ─────────────────────────────────────
// Handles cases where Claude wraps JSON in markdown code blocks
function safeParseJSON(text, fallback) {
  try {
    // Try direct parse first
    return JSON.parse(text);
  } catch (_) {
    // Strip markdown code blocks if present
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch (_2) { /* fall through */ }
    }
    // Try to extract JSON object from text
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]);
      } catch (_3) { /* fall through */ }
    }
    // Last resort: return fallback
    console.warn('[claude-adapt] Could not parse JSON, using fallback.');
    return fallback;
  }
}

module.exports = { adaptWithClaude };
