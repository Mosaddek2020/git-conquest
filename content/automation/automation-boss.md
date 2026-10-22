## brief | Green builds only

**The scenario.** You lead the move to CI at *Sparrow*, a small company with an API repository (`sparrow/api`) that has no automation yet. `main` is protected: one approval and a passing check named **CI** are required, and right now nothing can merge because no check exists.

Your mission:

1. Add a CI workflow on a branch: it must run on `pull_request` (and `push` to `main`), install dependencies, run `npm run lint` and `npm test`.
2. The existing code has a leftover `console.log` that fails lint. Get the PR green and merged.
3. Then ship a feature (a `ping` endpoint in `ping.js`) through the gate. Your first attempt has a bug; let CI catch it, fix it, merge.
4. Store the deploy token as an Actions secret named `DEPLOY_TOKEN`.

In this repository, `npm run lint` fails on any `console.log` in a `.js` file, and `npm test` passes when `ping.js` returns `"pong"`.

| Need | Tools |
|---|---|
| Write the workflow | `mkdir -p .github/workflows`, `edit .github/workflows/ci.yml` |
| Ship | `git switch -c`, `git push -u`, `gh pr create`, `gh pr merge --squash` |
| Follow checks | `gh pr checks`, `gh run view`, `npm test`, `npm run lint` |
| Secrets | `gh secret set DEPLOY_TOKEN --body "…"` |

## recap | What GitHub Automation gave you

- **Workflows** in `.github/workflows/*.yml`: `on` events, `jobs` on runners, `steps` that `uses:` actions or `run:` commands.
- **Status checks** report each run on its commit; **required checks** plus reviews gate merges into `main`.
- **Secrets** live in Actions secrets and environment variables, never in code. A leaked secret must be **rotated**.
- **Dependabot**, **secret scanning** and **push protection** help keep dependencies and credentials safe.
- **GitHub Pages** hosts static sites from a repository.
- **Continuous delivery**: `needs:` orders jobs, `environment:` ties a job to staging or a protected production, branch filters deploy `main` to staging and `v*` tags to production after approval.
- **Rollbacks** redeploy the last good tag (`gh workflow run release.yml --ref v1.1.0`); then revert the cause, add a smoke test, and ship a patch release.

## lab | Bring CI to sparrow/api
