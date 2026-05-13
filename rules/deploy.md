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

**Banners now working.** Root cause of earlier banner issues: System Settings → Notifications → "when mirroring or sharing the display" was set to "Notifications Off". Changed to allow notifications.

**Key setup:**
- Script Editor is in Focus → DND → Allowed Apps (notifications bypass DND)
- Script Editor notification settings: Desktop + Notification Center checked, Alert Style = Temporary (Banners)
- `terminal-notifier` (brew installed, `/opt/homebrew/bin/terminal-notifier`) also available but NOT in DND allowed apps — won't show with DND on
- No way to auto-clear Script Editor notifications programmatically — they accumulate in notification center. User clears manually.

**Future ideas (not yet implemented):**
- Notification if YouTube API quota is running low
- Notification if Supabase tables grow unexpectedly large
