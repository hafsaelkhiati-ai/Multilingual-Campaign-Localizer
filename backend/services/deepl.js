/**
 * ============================================================
 * services/deepl.js
 * DeepL API — Best-in-class machine translation
 * ============================================================
 * DeepL Free: 500,000 chars/month free
 * DeepL Pro:  from $5.49/month for higher volume
 *
 * Docs: https://www.deepl.com/docs-api
 * ============================================================
 */

const axios = require('axios');

// ─────────────────────────────────────────────────────────────
// ⬇ ADD YOUR DEEPL API KEY HERE
// Get it at: https://www.deepl.com/account/summary
// Free tier API endpoint: api-free.deepl.com
// Pro tier API endpoint:  api.deepl.com
// ─────────────────────────────────────────────────────────────
const DEEPL_API_KEY = process.env.DEEPL_API_KEY || 'YOUR_DEEPL_API_KEY_HERE';

// Change to 'https://api.deepl.com/v2/translate' if you have DeepL Pro
const DEEPL_ENDPOINT = process.env.DEEPL_ENDPOINT || 'https://api-free.deepl.com/v2/translate';

/**
 * Translate a copy object {headline, description, cta} to target language.
 *
 * @param {Object} copy - { headline, description, cta }
 * @param {string} targetLang - 'DE' | 'AR'
 * @returns {Object} - { headline, description, cta } in target language
 */
async function translateWithDeepL(copy, targetLang) {
  // Validate API key
  if (!DEEPL_API_KEY || DEEPL_API_KEY === 'YOUR_DEEPL_API_KEY_HERE') {
    throw new Error('DeepL API key not configured. Set DEEPL_API_KEY in your .env file.');
  }

  const texts = [copy.headline, copy.description, copy.cta];

  try {
    const response = await axios.post(
      DEEPL_ENDPOINT,
      null, // POST with params, not JSON body (DeepL uses form encoding)
      {
        params: {
          auth_key: DEEPL_API_KEY,
          // Send all 3 fields in one API call to save quota
          text: texts,
          target_lang: targetLang,
          source_lang: 'EN',
          // Preserve formatting tags (important for ad copy with symbols)
          tag_handling: 'xml',
          preserve_formatting: 1,
          // Formality only supported for some languages (DE, NL, FR, IT, ES, PT)
          // Arabic does not support formality param — DeepL ignores it gracefully
          formality: targetLang === 'DE' ? 'prefer_more' : 'default',
        },
        // DeepL expects array params to be sent as multiple 'text' query params
        paramsSerializer: (params) => {
          const parts = [];
          for (const [key, value] of Object.entries(params)) {
            if (Array.isArray(value)) {
              value.forEach(v => parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`));
            } else {
              parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
            }
          }
          return parts.join('&');
        },
      }
    );

    const translations = response.data.translations;

    return {
      headline: translations[0]?.text || copy.headline,
      description: translations[1]?.text || copy.description,
      cta: translations[2]?.text || copy.cta,
    };

  } catch (err) {
    // Helpful error messages for common DeepL errors
    if (err.response?.status === 403) {
      throw new Error('DeepL API key is invalid or expired. Check your key at deepl.com/account/summary');
    }
    if (err.response?.status === 456) {
      throw new Error('DeepL quota exceeded. Upgrade your plan at deepl.com/pro');
    }
    if (err.response?.status === 429) {
      throw new Error('DeepL rate limit hit. Wait a moment and retry.');
    }
    throw new Error(`DeepL translation failed: ${err.message}`);
  }
}

module.exports = { translateWithDeepL };
