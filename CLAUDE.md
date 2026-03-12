# Sam's Dashboard

## Git Workflow

### Auto-commit
After every turn, all changes are automatically committed and pushed to the `dev` branch via a Stop hook. No manual action is required.

After each successful push to `dev`, update the Dev indicator in the bottom left of the dashboard. The Dev button should display:

dev - X

Where X is a randomly generated number (e.g., dev - 12, dev - 47, dev - 3). This is used as a visual confirmation that the latest changes were successfully pushed to the dev branch.

### Push to Production
When the user says **"push to production"**, run these git commands in sequence using the Bash tool:

1. git checkout main
2. git pull origin main
3. git merge origin/dev --no-ff -m "Merge dev into main"
4. git push origin main
5. git checkout main (stay on main or switch back as needed)

After pushing, confirm success by reporting the pushed commit hash.