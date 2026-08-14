# Deploy to Production

Run in sequence via Bash:

1. `git checkout main`
2. `git pull origin main`
3. `git merge origin/dev --no-ff -m "Merge dev into main"`
4. `git push origin main`
5. Stay on main

Confirm success by reporting the pushed commit hash.

# Branch gotcha (dev deploys ONLY from `dev`)

Cloudflare dev builds from the `dev` branch. Symptom of a deploy gap: code edits "do nothing" no matter how often the user refreshes, because commits aren't reaching `origin/dev`.

**Do NOT trust `git branch --show-current` alone** — the session can be on `dev` yet still not deploy. Reliable check is **unpushed commits**: `git log origin/dev..dev --oneline` (anything listed = committed but NOT on the deployed branch). Root cause seen 2026-06-25: the Stop hook in `.claude/settings.json` was hardcoded to `git push origin HEAD:ipad` (stale `ipad` target) while the session was on `dev`, so every auto-commit pushed to `ipad` and `origin/dev` stayed frozen. Fixed to `git push origin HEAD:dev`. If it recurs, re-check that hook's push target matches `dev`.

Fix a gap manually: confirm fast-forward (`git merge-base --is-ancestor origin/dev HEAD`), then `git push origin HEAD:dev`. Always verify live before telling the user it's fixed: `curl -s "https://dev.sams-dashboard.pages.dev/<file>?x=$(date +%s)" | grep -c "<unique string from the edit>"` (poll until >0 — Cloudflare build takes ~30-60s).

**`git log origin/dev..dev` checks the wrong ref if the LOCAL `dev` branch is stale** (seen 2026-08-14: local `dev` was frozen since 2026-07-08 while work happened on local `main` and got pushed straight to `origin/dev` via `HEAD:dev` every time — comparing against local `dev` showed a huge false gap). The reliable check is always against the remote ref directly: `git fetch origin dev && git log origin/dev..main --oneline` (or whichever local branch HEAD actually is).

**Gitlink/submodule breaks the Cloudflare clone step entirely** (root cause of a full session's worth of "my changes aren't showing up," 2026-08-14). Symptom: builds fail immediately, build log shows `fatal: No url found for submodule path '<path>' in .gitmodules` right after `Cloning repository...` — every push after the bad commit lands on `origin/dev` fine (git-level checks all pass) but NOTHING deploys, because Cloudflare can't even check out the repo. Cause: `git add -A` (in the Stop hook) swept up a directory that has its own `.git` folder (e.g. a Claude Code skill installed with `git clone`) as a dangling gitlink — valid to git locally, but with no `.gitmodules` entry telling Cloudflare where to fetch it from. Diagnose: `git ls-tree HEAD <suspect-path>` — mode `160000` = gitlink. Fix: `git rm -r --cached <path>` (untrack without deleting the local files) + add the path to `.gitignore` so `git add -A` never re-adds it. **Never `git clone` (or let a tool clone) anything into this repo's tree** — see memory `feedback_no_git_clone_into_repo`.

**Diagnosing "deploy succeeded but user still doesn't see it"**: don't stop at confirming the git push — confirm the LIVE deployment actually matches. `curl` each changed file directly (`https://dev.sams-dashboard.pages.dev/<file>?x=$(date +%s)`) and grep for a string unique to the latest commit; if an older file's marker is present but a newer one isn't, the deploy is stuck partway through history (compare against `git log -p -- <file>` to find exactly which commit is live) — almost always the gitlink issue above, not a caching problem.

**Cache-busting version strings must be bumped by hand — nothing does this automatically.** `index.html` hardcodes `?v=` query params on `styles.css`/`core.js`/`overview.js`/`features.js` (`<script src="overview.js?v=20260814a">` etc.) plus `window._BUILD` and `version.json`'s `v` field (compared on load; mismatch triggers `location.reload()`). A successful deploy with an UNCHANGED version string means browsers that already cached the old URL keep serving old code indefinitely — this looks identical to "the deploy didn't work" from the user's side. **Whenever `styles.css`, `core.js`, `overview.js`, or `features.js` changes, bump that file's `?v=` in `index.html` AND `version.json`'s `v` AND `window._BUILD` (keep all three in sync, e.g. `YYYYMMDD` + a letter suffix for same-day revisions) in the same commit.** Verify with the live-content curl check above, not just a git push confirmation.

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
