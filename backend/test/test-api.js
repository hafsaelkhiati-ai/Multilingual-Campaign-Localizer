/**
 * ============================================================
 * backend/test/test-api.js
 * Quick smoke test — run with: node backend/test/test-api.js
 * ============================================================
 * Tests the /api/localize endpoint with sample Crest copy.
 * Make sure the server is running first: npm start
 * ============================================================
 */

require('../config/env');
const axios = require('axios');

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

const TEST_PAYLOAD = {
  campaignName: 'Crest Summer Test',
  headline: 'Get 30% Off Premium Skincare Today',
  description: 'Shop our dermatologist-approved range. Free shipping over €50. Sign up for exclusive offers and get personalised recommendations.',
  cta: 'Shop Now',
  industry: 'beauty',
  formality: 'Sie',
  targetDE: true,
  targetAR: true,
};

async function runTest() {
  console.log('\n🧪 AGENT 03 — API Smoke Test');
  console.log('─'.repeat(50));

  // 1. Health check
  try {
    const health = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Health check:', health.data.status);
  } catch (err) {
    console.error('❌ Server not running. Start with: npm start');
    process.exit(1);
  }

  // 2. Localize
  console.log('\n📤 Sending test payload...');
  console.log('   Campaign:', TEST_PAYLOAD.campaignName);
  console.log('   Headline:', TEST_PAYLOAD.headline);

  const start = Date.now();

  try {
    const res = await axios.post(`${BASE_URL}/api/localize`, TEST_PAYLOAD);
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    const data = res.data;

    console.log(`\n✅ Localisation complete in ${elapsed}s\n`);

    if (data.de) {
      console.log('🇩🇪 GERMAN:');
      console.log('   Headline:', data.de.headline);
      console.log('   Desc:    ', data.de.description);
      console.log('   CTA:     ', data.de.cta);
      if (data.de.culturalNote) console.log('   Note:    ', data.de.culturalNote);
    }

    if (data.ar) {
      console.log('\n🇸🇦 ARABIC:');
      console.log('   Headline:', data.ar.headline);
      console.log('   Desc:    ', data.ar.description);
      console.log('   CTA:     ', data.ar.cta);
    }

    if (data.gdpr) {
      console.log('\n🛡️  GDPR Score:', data.gdpr.score);
      if (data.gdpr.flags?.length > 0) {
        console.log(`   ${data.gdpr.flags.length} issue(s) found:`);
        data.gdpr.flags.forEach(f => {
          console.log(`   [${f.risk.toUpperCase()}] "${f.phrase}"`);
          console.log(`         → ${f.suggestion}`);
        });
      } else {
        console.log('   No issues found ✓');
      }
    }

    console.log('\n✅ Test passed!\n');

  } catch (err) {
    console.error('\n❌ Test failed:', err.response?.data?.error || err.message);
    process.exit(1);
  }
}

runTest();
