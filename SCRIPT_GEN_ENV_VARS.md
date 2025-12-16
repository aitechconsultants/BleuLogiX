# Script Generation Service - Environment Variables

## Required Variables

### `OPENAI_API_KEY`
- **Type**: String
- **Required**: Yes
- **Description**: Your OpenAI API key for accessing GPT models
- **Example**: `sk-proj-xxxxxxxxxxxxxxxxxxxxx`
- **Get it at**: https://platform.openai.com/api-keys

## Optional Variables (with defaults)

### `SCRIPT_GEN_MODEL`
- **Type**: String
- **Default**: `gpt-4-mini`
- **Options**: `gpt-4-turbo`, `gpt-4`, `gpt-4-mini`, `gpt-3.5-turbo`
- **Description**: OpenAI model to use for script generation
- **Note**: Smaller models are faster and cheaper; larger models are more capable

### `SCRIPT_GEN_MAX_TOKENS`
- **Type**: Number
- **Default**: `1200`
- **Range**: `100` - `4000`
- **Description**: Maximum tokens for OpenAI response
- **Note**: Higher values allow longer scripts but increase cost

### `SCRIPT_GEN_TIMEOUT_MS`
- **Type**: Number
- **Default**: `45000` (45 seconds)
- **Description**: Request timeout in milliseconds
- **Note**: Increase for slower connections or larger requests

### `SCRIPT_GEN_ENABLE_MOCK`
- **Type**: Boolean (string)
- **Default**: `false`
- **Values**: `"true"` or `"false"`
- **Description**: When true, returns deterministic mock scripts instead of calling OpenAI
- **Use case**: Local development, testing, demo mode

### `SCRIPT_GEN_RATE_LIMIT_PER_MIN`
- **Type**: Number
- **Default**: `20`
- **Description**: Maximum script generation requests per user per minute
- **Note**: Prevents abuse and manages API costs

### `SCRIPT_GEN_DEFAULT_LANGUAGE`
- **Type**: String
- **Default**: `en`
- **Options**: `en`, `es`, `fr`, `de`, `zh`, etc.
- **Description**: Default language for generated scripts
- **Note**: Can be overridden per request

## Setup Instructions

### For Local Development

1. **Create or update your `.env` file** in the root directory:

```bash
# Required
OPENAI_API_KEY=sk-proj-your-actual-key-here

# Optional - use defaults or customize
SCRIPT_GEN_MODEL=gpt-4-mini
SCRIPT_GEN_MAX_TOKENS=1200
SCRIPT_GEN_TIMEOUT_MS=45000
SCRIPT_GEN_ENABLE_MOCK=false
SCRIPT_GEN_RATE_LIMIT_PER_MIN=20
SCRIPT_GEN_DEFAULT_LANGUAGE=en
```

2. **For testing without OpenAI API key:**

Set `SCRIPT_GEN_ENABLE_MOCK=true` to use mock script generation:

```bash
SCRIPT_GEN_ENABLE_MOCK=true
OPENAI_API_KEY=placeholder  # Still required, but not used
```

3. **Restart the dev server:**

```bash
npm run dev
```

### For Production Deployment

Set environment variables in your deployment platform:

- **Fly.io**: Use `flyctl secrets set`
- **Railway**: Use the Railway dashboard or CLI
- **Netlify**: Use the Build & deploy settings
- **Vercel**: Use the Settings tab
- **Docker**: Pass via `-e` flag or `.env` file in container

Example for Fly.io:
```bash
flyctl secrets set OPENAI_API_KEY=sk-proj-your-key
flyctl secrets set SCRIPT_GEN_MODEL=gpt-4-mini
```

## Cost Estimation

Approximate costs for 1000 script generation requests:

| Model | Input Cost | Output Cost | Est. Total |
|-------|-----------|------------|-----------|
| gpt-3.5-turbo | $0.50 | $1.50 | $2.00 |
| gpt-4-mini | $0.15 | $0.60 | $0.75 |
| gpt-4-turbo | $10.00 | $30.00 | $40.00 |

**Example with default settings (gpt-4-mini, 1200 tokens per response):**
- ~500 input tokens + 700 output tokens per request
- Cost per request: ~$0.0015
- Cost per 1000 requests: ~$1.50

## Troubleshooting

### "OPENAI_API_KEY environment variable is required"
- Ensure `OPENAI_API_KEY` is set in your `.env` file or deployment environment
- Restart dev server after adding env vars

### Rate limit errors (429)
- Increase `SCRIPT_GEN_RATE_LIMIT_PER_MIN` if legitimate usage exceeds limit
- Check OpenAI account for API-wide rate limits

### Timeout errors
- Increase `SCRIPT_GEN_TIMEOUT_MS` if requests consistently timeout
- Check network connectivity to OpenAI API
- Try `SCRIPT_GEN_ENABLE_MOCK=true` to test locally

### Invalid JSON schema errors
- Usually indicates OpenAI response doesn't match expected format
- Try using a different `SCRIPT_GEN_MODEL`
- Check OpenAI API status

## Testing the Service

### Check health endpoint:
```bash
curl http://localhost:8080/api/script-gen/health
```

Should return:
```json
{"ok": true, "service": "script-gen"}
```

### Generate a script (requires authentication):
```bash
curl -X POST http://localhost:8080/api/script-gen/generate \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "TikTok",
    "video_length_sec": 30,
    "style": "UGC",
    "product_name": "My Awesome Product",
    "key_benefits": ["High Quality", "Affordable"],
    "differentiators": ["Innovative Design"],
    "audience": {
      "target": "Small business owners",
      "pain_points": ["Time", "Cost"]
    },
    "brand_voice": "Friendly and professional",
    "call_to_action": "Get started today"
  }'
```

## Database Setup

The service automatically creates required tables on first run:
- `script_gen_jobs` - Tracks all generation requests
- `script_gen_templates` - Stores prompt templates
- `script_gen_usage_daily` - Tracks daily usage per user

Default template is seeded automatically.
