# Sam's Dashboard

## Git Workflow

### Auto-commit
After every turn, all changes are automatically committed and pushed to the `dev` branch via a Stop hook. No manual action needed.

### Push to Production
When the user says **"push to production"**, run these git commands in sequence (using the Bash tool):
1. `git checkout main`
2. `git pull origin main`
3. `git merge origin/dev --no-ff -m "Merge dev into main"`
4. `git push origin main`
5. `git checkout main` (stay on main, or switch back as needed)

Confirm success by reporting the pushed commit hash.
