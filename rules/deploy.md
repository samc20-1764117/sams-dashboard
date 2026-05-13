# Deploy to Production

Run in sequence via Bash:

1. `git checkout main`
2. `git pull origin main`
3. `git merge origin/dev --no-ff -m "Merge dev into main"`
4. `git push origin main`
5. Stay on main

Confirm success by reporting the pushed commit hash.

# Deploy Notifications

Auto-deploy notification is set up via `.claude/watch-deploy.sh` + stop hook in `.claude/settings.json`.

**How it works:**
- Stop hook auto-commits, pushes to dev, then runs `watch-deploy.sh <commit>` in background
- Script polls Cloudflare (`wrangler pages deployment list`) every 10s, up to 5 min
- Sends macOS notification via `osascript display notification` when deploy completes
- Uses Script Editor as notification source (registered in DND allowed apps)

**Current limitation:** Banners don't appear on screen — notifications only show in Notification Center panel. Likely a macOS-level issue (banners not showing for ANY app). If resolved in future:
- `terminal-notifier` (brew installed) supports `-ignoreDnD` flag for DND bypass
- Script Editor is already in Focus → DND → Allowed Apps
- Script Editor notification settings: Desktop + Notification Center checked, Alert Style = Temporary (Banners)
- Full path: `/opt/homebrew/bin/terminal-notifier`

**To switch to terminal-notifier banners later**, update `.claude/watch-deploy.sh`:
```
/opt/homebrew/bin/terminal-notifier -title "Deployed" -message "" -ignoreDnD
```
