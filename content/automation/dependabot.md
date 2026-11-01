## story | The library everyone forgot

The storefront had shipped the same `lodash` version for three years. Nobody touched `package.json` because "it works". Then a security researcher published a command-injection bug in exactly that version, and a scanner bot found the shop within days.

GitHub had been warning them all along: a **Dependabot alert** sat on the Security tab, and Dependabot had even opened a pull request with the fix. Nobody owned it. Dependabot is only useful if someone reads its alerts, merges its PRs, and records *why* when they decide not to.

## model | Alerts, security updates, version updates

```diagram
dependabot
```

- **Dependabot alerts**: GitHub matches your manifests (`package.json`, lock files, and so on) against the GitHub Advisory Database and raises an alert for each vulnerable dependency, with a severity, the affected range and the first patched version.
- **Security updates**: for an open alert, Dependabot opens a PR that bumps the package to the patched version. Your CI runs on it like any other PR.
- **Version updates**: with `.github/dependabot.yml`, Dependabot also keeps dependencies current on a schedule, security issue or not.
- Alerts close themselves when the default branch no longer has the vulnerable version. If you decide not to fix one, **dismiss it with a reason**: `fix_started`, `inaccurate`, `no_bandwidth`, `not_used` or `tolerable_risk`.

## commands | Working through the queue

```term
$ gh api repos/{owner}/{repo}/dependabot/alerts \
    --jq '.[] | {number, package: .dependency.package.name, severity: .security_advisory.severity}'
{"number":2,"package":"minimist","severity":"critical"}
{"number":1,"package":"lodash","severity":"high"}
$ gh pr list                                  # Dependabot's PRs
$ gh pr checks 1 && gh pr merge 1 --squash --delete-branch
$ gh api -X PATCH repos/{owner}/{repo}/dependabot/alerts/2 \
    -f state=dismissed -f dismissed_reason=not_used \
    -f dismissed_comment="Only scripts/legacy-build.js uses it; never shipped"
```

`.github/dependabot.yml` for weekly npm version updates:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
```

## analogy | A recall notice in the post

Your car maker writes: "the airbag in your model may fail; bring it in, the fix is free". The alert is the letter; the security update is the free appointment, already booked. You can ignore the letter, but someone should decide that on purpose, and write down why.

## team | Owning dependency hygiene

- **Give Dependabot an owner** (a rotation works) and a target: critical and high within days.
- Require **green CI** on Dependabot PRs and skim the changelog for major versions; bots do not read release notes.
- Use `groups:` in dependabot.yml to bundle related bumps (all `eslint-*` packages, say), so review stays manageable.
- **Dismiss honestly.** "not_used" is fine when the code is really unreachable; revisit dismissed alerts each quarter.
- Delete code you do not ship. `scripts/legacy-build.js` should not be the reason an alert exists.

## traps | Dependabot traps

**Merging bot PRs without CI.** An upgrade can break the build as easily as a human change.

**Dismissing to make the badge green.** The vulnerability is still there; you have only hidden it.

**Version updates without a limit.** Fifteen open PRs every Monday get ignored. Set `open-pull-requests-limit` and use groups.

**Forgetting lock files.** If the lock file still pins the old version, the fix never ships. Dependabot updates both; hand-made bumps must too.

## lab | Two alerts and a schedule

`you/storefront` has Dependabot alerts turned on, and two security PRs are waiting. List the alerts through the API, merge the lodash fix after checking CI, dismiss the minimist alert with a proper reason, then add a weekly version-update schedule and merge the first update it opens.
