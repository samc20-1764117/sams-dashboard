# Alexa Integration

## Architecture
- Cloudflare Pages Function at `functions/api/alexa.js`
- Validates `X-Alexa-Token` header against `ALEXA_SECRET` env var
- Uses Supabase REST API with service role key (`SUPABASE_KEY` env var)
- Insert-only — no destructive operations

## Intents

### AddTaskIntent
- Slots: `TaskName` (SearchQuery), `TaskDate` (DATE, optional — defaults today)
- Inserts into `tasks` with `category: 'Home'`, `done: false`, `important: false`

### AddShoppingIntent
- Slots: `ItemName` (SearchQuery), `StoreName` (SearchQuery, optional)
- Inserts into `shopping_list` with `done: false`

### LogPupSessionIntent
- Slots: `PupName` (custom PUP_NAME: Mochi/Sunny), `SkillName` (SearchQuery)
- Queries `pup_skills` table, matches by pup name (exact) + skill name (partial, case-insensitive)
- Inserts into `pup_skill_sessions` with `skill_id`, `day_date: today`, `done: true`

## Env Vars (Cloudflare Pages Settings)
- `ALEXA_SECRET` — shared secret token for request validation
- `SUPABASE_KEY` — Supabase service role key (NOT the anon key)

## Alexa Developer Console Setup
1. Go to developer.amazon.com → Alexa Skills Kit
2. Create Custom Skill → "Sam Dashboard"
3. Interaction Model tab → JSON Editor → paste `alexa-skill/interactionModel.json`
4. Endpoint tab → HTTPS → `https://sams-dashboard.pages.dev/api/alexa`
   - Select "My development endpoint is a sub-domain of a domain that has a wildcard certificate"
5. In the skill's HTTPS request headers, add `X-Alexa-Token` with the value matching `ALEXA_SECRET`
6. Build Model → Test tab → enable testing
7. Test with: "Alexa, tell my dashboard to add milk to shopping list"

## Testing with curl
```bash
curl -X POST https://dev.sams-dashboard.pages.dev/api/alexa \
  -H "Content-Type: application/json" \
  -H "X-Alexa-Token: YOUR_SECRET" \
  -d '{"request":{"type":"IntentRequest","intent":{"name":"AddShoppingIntent","slots":{"ItemName":{"value":"milk"},"StoreName":{"value":"HEB"}}}}}'
```

## Input Sanitization
- All slot values trimmed and capped at 200 chars
- Null/non-string values return null (treated as missing)
