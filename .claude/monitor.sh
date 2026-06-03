#!/bin/bash
# Monitor table sizes and YouTube API quota, send macOS notifications

SUPABASE_URL="https://gtirvyrqfuuuxkkqaeap.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aXJ2eXJxZnV1dXhra3FhZWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODY3NjAsImV4cCI6MjA4ODY2Mjc2MH0.6rtA0WeUUAcuV_sNVrxAbaaviPxPwNakh_bk7uylAOo"

# Table row limits — warn if any table exceeds this
ROW_LIMIT=5000

TABLES="tasks shopping_list travel birthdays ideas pup_skills time_blocks auto_timeblocks auto_timeblock_overrides wr_recurring_rules wr_recurring_overrides"

# Check table sizes
for table in $TABLES; do
  count=$(curl -s -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Prefer: count=exact" -H "Range: 0-0" \
    -o /dev/null -w '' \
    "$SUPABASE_URL/rest/v1/$table?select=id" \
    -D - 2>/dev/null | grep -i content-range | sed 's/.*\///')
  count=$(echo "$count" | tr -d '[:space:]')
  if [ -n "$count" ] && [ "$count" -gt "$ROW_LIMIT" ] 2>/dev/null; then
    osascript -e "display notification \"$table has $count rows (limit: $ROW_LIMIT)\" with title \"Table Size Warning\""
  fi
done

# Check YouTube API quota usage
# The YT API doesn't expose quota directly, but we can check if cooldown is set (meaning quota was hit)
YT_API_URL="https://dev.sams-dashboard.pages.dev/api/yt"
response=$(curl -s -w "\n%{http_code}" "$YT_API_URL")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "502" ]; then
  osascript -e 'display notification "API returned 502 — quota may be exceeded" with title "YouTube API Warning"'
elif echo "$body" | grep -q '"partial":true'; then
  osascript -e 'display notification "Using RSS fallback — API quota likely exhausted" with title "YouTube API Warning"'
fi
