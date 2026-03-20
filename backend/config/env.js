/**
 * ============================================================
 * backend/config/env.js
 * Load environment variables from .env file
 * ============================================================
 * This file must be required at the very top of server.js
 * BEFORE any other imports that use process.env
 * ============================================================
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

// Validate required keys are present at startup
const REQUIRED_KEYS = ['DEEPL_API_KEY', 'ANTHROPIC_API_KEY'];

const missing = REQUIRED_KEYS.filter(key =>
  !process.env[key] || process.env[key].startsWith('your_')
);

if (missing.length > 0) {
  console.warn('\n⚠️  WARNING: Missing or placeholder API keys detected:');
  missing.forEach(key => console.warn(`   - ${key}`));
  console.warn('   Edit your .env file to add the real keys.\n');
}
