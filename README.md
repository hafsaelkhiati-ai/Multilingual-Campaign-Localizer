# AGENT 03 — Multilingual Campaign Localizer
> EN → DE + AR | DeepL + Claude | GDPR Compliance

## Project Structure

```
agent03-campaign-localizer/
├── frontend/
│   └── index.html              ← UI (paste copy, see results)
├── backend/
│   ├── server.js               ← Express server entry point
│   ├── config/
│   │   └── env.js              ← Loads .env variables
│   ├── routes/
│   │   └── localize.js         ← POST /api/localize handler
│   ├── services/
│   │   ├── deepl.js            ← DeepL translation API
│   │   ├── claude-adapt.js     ← Claude cultural adaptation
│   │   └── claude-gdpr.js      ← Claude GDPR compliance scan
│   └── test/
│       └── test-api.js         ← Smoke test script
├── .env.example                ← Copy to .env and add your keys
├── .gitignore
├── package.json
└── DEPLOYMENT-GUIDE.txt        ← Step-by-step VPS setup
```

## Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your DeepL and Anthropic API keys

# 3. Start server
npm start

# 4. Open browser
open http://localhost:3000
```

## API Keys Needed

| Service | Where to get | Cost |
|---------|-------------|------|
| DeepL | deepl.com/account/summary | Free (500k chars/mo) |
| Anthropic (Claude) | console.anthropic.com/settings/keys | ~$0.01/localisation |

## API Reference

### POST /api/localize

**Request:**
```json
{
  "campaignName": "Summer Sale 2025",
  "headline": "Get 30% Off Premium Skincare",
  "description": "Shop dermatologist-approved. Free shipping over €50.",
  "cta": "Shop Now",
  "industry": "beauty",
  "formality": "Sie",
  "targetDE": true,
  "targetAR": true
}
```

**Response:**
```json
{
  "success": true,
  "de": {
    "headline": "30 % Rabatt auf Premium-Hautpflege",
    "description": "Kaufen Sie dermatologisch geprüfte Produkte...",
    "cta": "Jetzt kaufen",
    "culturalNote": "Used formal Sie form and removed superlatives."
  },
  "ar": {
    "headline": "وفر 30% على العناية الفاخرة بالبشرة",
    "description": "تسوق منتجاتنا المعتمدة طبياً...",
    "cta": "تسوق الآن",
    "culturalNote": "Adapted to Modern Standard Arabic with trust-building tone."
  },
  "gdpr": {
    "score": "WARN",
    "flags": [
      {
        "phrase": "personalised recommendations",
        "reason": "Implies data profiling without consent",
        "suggestion": "Add 'based on your consent' or remove",
        "risk": "medium"
      }
    ],
    "summary": "1 medium-risk phrase found. Review before publishing."
  }
}
```

## Deployment

See `DEPLOYMENT-GUIDE.txt` for full VPS setup instructions.
