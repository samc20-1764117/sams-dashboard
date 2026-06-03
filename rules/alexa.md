# Alexa Integration

## Architecture
- Cloudflare Pages Function at `functions/api/alexa.js`
- Validates Alexa Application ID from request body against `ALEXA_SKILL_ID` env var
- Uses Supabase REST API with service role key (`SUPABASE_KEY` env var)
- Insert-only — no destructive operations

## Intents

### AddTaskIntent
- Slot: `TaskName` (SearchQuery) — free-form task description
- Always sets due date to today (edit in dashboard if needed)
- Inserts into `tasks` with `category: 'Home'`, `done: false`, `important: false`

### AddShoppingIntent
- Slot: `ItemName` (SearchQuery) — free-form item name
- Inserts into `shopping_list` with `done: false`, no store (assign in dashboard)

### LogPupSessionIntent
- Slot: `PupTraining` (SearchQuery) — single phrase like "Mochi practiced sit"
- Server parses pup name from first word, strips filler words (practiced/did/trained)
- Matches remaining text against `pup_skills` table (partial, case-insensitive)
- Inserts into `pup_skill_sessions` with `skill_id`, `day_date: today`, `done: true`

## Alexa SearchQuery Limitation
- `AMAZON.SearchQuery` cannot be combined with other slots in the same utterance
- That's why each intent uses a single SearchQuery slot and parses server-side

## Env Vars (Cloudflare Pages Settings)
- `ALEXA_SKILL_ID` — your skill's Application ID (starts with `amzn1.ask.skill.`)
- `SUPABASE_KEY` — Supabase service role key (NOT the anon key)

## Alexa Developer Console Setup
1. Go to developer.amazon.com → Alexa Skills Kit
2. Create Custom Skill → "Sam Dashboard"
3. Interaction Model tab → JSON Editor → paste `alexa-skill/interactionModel.json`
4. Endpoint tab → HTTPS → `https://sams-dashboard.pages.dev/api/alexa`
   - Select "My development endpoint is a sub-domain of a domain that has a wildcard certificate"
5. Copy the Skill ID from the top of the skill page (starts with `amzn1.ask.skill.`)
6. Add it as `ALEXA_SKILL_ID` env var in Cloudflare Pages settings
7. Build Model → Test tab → enable testing
8. Test with: "tell my dashboard to add milk to shopping list"

## Testing with curl
```bash
curl -X POST https://dev.sams-dashboard.pages.dev/api/alexa \
  -H "Content-Type: application/json" \
  -d '{"session":{"application":{"applicationId":"YOUR_SKILL_ID"}},"request":{"type":"IntentRequest","intent":{"name":"AddShoppingIntent","slots":{"ItemName":{"value":"milk"}}}}}'
```

## Input Sanitization
- All slot values trimmed and capped at 200 chars
- Null/non-string values return null (treated as missing)
