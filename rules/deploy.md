# Deploy to Production

Run in sequence via Bash:

1. `git checkout main`
2. `git pull origin main`
3. `git merge origin/dev --no-ff -m "Merge dev into main"`
4. `git push origin main`
5. Stay on main

Confirm success by reporting the pushed commit hash.
