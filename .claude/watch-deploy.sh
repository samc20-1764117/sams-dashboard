#!/bin/bash
COMMIT=$1
if [ -z "$COMMIT" ]; then exit 1; fi
for i in $(seq 1 30); do
  sleep 10
  STATUS=$(cd /Users/samanthacohn/Documents/sams-dashboard && npx wrangler pages deployment list --project-name sams-dashboard 2>/dev/null | grep "$COMMIT")
  if [ -n "$STATUS" ]; then
    if ! echo "$STATUS" | grep -q 'Building'; then
      osascript -e 'display notification "Deploy live — ready to check changes" with title "Cloudflare"'
      exit 0
    fi
  fi
done
osascript -e 'display notification "Deploy may have failed or timed out" with title "Cloudflare"'
