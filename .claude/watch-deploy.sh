#!/bin/bash
COMMIT=$1
if [ -z "$COMMIT" ]; then exit 1; fi
for i in $(seq 1 30); do
  sleep 10
  STATUS=$(cd /Users/samanthacohn/Documents/sams-dashboard && npx wrangler pages deployment list --project-name sams-dashboard 2>/dev/null | grep "$COMMIT")
  if [ -n "$STATUS" ]; then
    if ! echo "$STATUS" | grep -q 'Building'; then
      /opt/homebrew/bin/terminal-notifier -remove ALL -group deploy 2>/dev/null
      /opt/homebrew/bin/terminal-notifier -title "Deployed" -message "" -group deploy
      exit 0
    fi
  fi
done
/opt/homebrew/bin/terminal-notifier -remove ALL -group deploy 2>/dev/null
/opt/homebrew/bin/terminal-notifier -title "Deploy failed" -message "" -group deploy
