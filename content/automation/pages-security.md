## story | The key that was found in four minutes

A developer at a small company pushed a commit containing a live payment API key to a public repository. Four minutes later, automated bots scanning GitHub had found it and started making charges. GitHub's **secret scanning** also detected it and notified the payment provider, which revoked the key, but not before a costly afternoon.

The lesson the team wrote on the wall: **a secret that touched a public commit is a leaked secret. Rotate first, then clean up.**

## model | Secrets in the GitHub world

| Tool | What it does |
|---|---|
| **Actions secrets** | encrypted values (API keys, tokens) available to workflows as `${{ secrets.NAME }}`, never printed in logs |
| **Secret scanning** | GitHub scans pushes for known key formats and alerts you (and often the provider) |
| **Push protection** | blocks a push that contains a detected secret before it lands |
| **Dependabot alerts** | warns when a dependency has a known vulnerability |
| **Dependabot updates** | opens PRs to update dependencies (`.github/dependabot.yml`) |
| **Code scanning** | static analysis (e.g. CodeQL) for vulnerable code patterns |

A safe pattern for configuration: code reads secrets from **environment variables**; locally they come from an ignored `.env` file; in CI they come from Actions secrets; in production from the hosting platform's secret store.

## model | GitHub Pages

**GitHub Pages** hosts a static website (HTML, CSS, JS) straight from a repository, free, at `https://<user>.github.io/<repo>`. You enable it in Settings → Pages, and publish either from a branch/folder (`main` / `docs/`) or with an Actions workflow that builds the site and deploys it. Documentation sites, portfolios and project landing pages often live there.

## commands | Handling secrets properly

```term
$ git log -S "sk_live" --oneline              # find where a key entered history
$ edit config.js                              # read it from process.env instead
$ echo ".env" >> .gitignore                   # never commit the real values
$ gh secret set PAYMENT_KEY --body "…"        # store it for workflows
$ gh secret list
```

In a workflow:

```text
      - run: npm run deploy
        env:
          PAYMENT_KEY: ${{ secrets.PAYMENT_KEY }}
```

Dependabot configuration (`.github/dependabot.yml`):

```text
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
```

## analogy | Keys, safes and locksmiths

Hard-coding a key in your code is taping your house key to the front door. An environment variable is keeping it in your pocket. Actions secrets are a bank safe deposit box that only your robots can open. And when a key is copied, the right move is not to hide the copy: it is to **call the locksmith and change the lock** (rotate).

## team | Incident playbook for a leaked secret

1. **Rotate** the secret immediately (revoke the old one, issue a new one).
2. **Check logs** at the provider for misuse.
3. **Remove** it from the code; read it from the environment.
4. Store the new value in a **secret store** (Actions secrets, vault).
5. Optionally **rewrite history** (`git filter-repo`) and ask everyone to re-clone, but remember: anyone may already have a copy, which is why step 1 comes first.
6. Add **prevention**: push protection, pre-commit secret scanning.

## traps | Security traps

**"I deleted it in the next commit."** It is still in history and in every clone.

**Printing secrets in workflow logs** with `echo`. GitHub masks known secrets, but do not rely on it.

**Ignoring Dependabot alerts.** Old dependencies are one of the most common ways apps get breached.

## lab | Contain a leaked key

A payment key was committed to your project. Find it, rotate it, move it into a secret, stop it from happening again, and turn on Dependabot updates.
