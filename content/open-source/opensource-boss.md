## brief | Your first real contribution

**The scenario.** The open-source project `mapkit-community/tiles` (a map tile server) has a `good first issue`: *"The default zoom level in config.json should be 12, not 21 (typo)."* You are not a maintainer.

Your mission:

1. Fork the project and set up `origin` (your fork) and `upstream` (the project).
2. While you work, the maintainers merge other PRs. Make sure your branch is based on the **latest** upstream main when you open the PR.
3. Fix the issue on a well-named branch, push it to your fork, and open a PR to upstream that closes the issue.
4. A maintainer will ask for a small change. Push it.
5. After the maintainer merges, sync your fork's main and your local main with upstream, and delete your branch.

| Need | Tools |
|---|---|
| Fork | `gh repo fork --clone`, `git remote -v` |
| Stay current | `git fetch upstream`, `git rebase upstream/main` |
| Contribute | `git push -u origin <branch>`, `gh pr create --body "Fixes #N"` |
| Sync | `git merge --ff-only upstream/main`, `git push origin main` or `gh repo sync` |

## recap | What Open Source gave you

- A **fork** is your server-side copy of a project you cannot push to; the PR goes from your fork's branch to **upstream**.
- Remotes: **origin** = your fork, **upstream** = the original.
- Branch from **upstream/main**; keep your fork's main as a clean mirror; sync with fetch + fast-forward + push (or `gh repo sync`).
- Welcoming projects have README, LICENSE, CONTRIBUTING, a code of conduct and `good first issue` labels.

## lab | Fix the zoom default upstream
