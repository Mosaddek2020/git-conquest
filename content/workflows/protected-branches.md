## story | The Friday push to main

At a fast-growing startup, an engineer pushed a "quick fix" straight to `main` on a Friday evening, skipping review and tests. It took the checkout down for two hours.

On Monday the team turned on **branch protection** for `main`: no direct pushes, every change through a pull request, at least one approving review, and passing CI checks before merge. The same mistake became impossible.

## model | What protection rules can require

On GitHub (Settings → Branches / Rulesets), a protected branch can require:

| Rule | Effect |
|---|---|
| Require a pull request before merging | direct pushes are rejected |
| Required approvals (e.g. 1 or 2) | merge blocked until enough reviewers approve |
| Dismiss stale approvals | a new push resets approvals |
| Require review from Code Owners | the owners of the touched files must approve |
| Require status checks to pass | CI must be green |
| Require branches to be up to date | PR must include the latest main |
| Require linear history | no merge commits (squash/rebase only) |
| Block force pushes and deletions | history on main cannot be rewritten |

**CODEOWNERS** is a file (`.github/CODEOWNERS`) mapping paths to responsible people or teams:

```text
# path                 owners
*                      @acme/core
/payments/             @acme/payments-team
/docs/                 @maria
*.css                  @acme/design
```

When a PR touches `/payments/`, the payments team is automatically requested for review, and (with the rule enabled) must approve.

## commands | Living with protection

```term
$ git push origin main
remote: error: GH006: Protected branch update failed for refs/heads/main.
remote: error: Changes must be made through a pull request.
 ! [remote rejected] main -> main (protected branch hook declined)

$ git switch -c fix/tax-rounding        # the right way
$ git push -u origin fix/tax-rounding
$ gh pr create --fill
$ gh pr view                            # shows what is still blocking the merge
$ gh pr checks                          # CI status
```

## analogy | Two signatures on a cheque

Companies require two signatures on large cheques. Not because the first signer is dishonest, but because a second look catches mistakes and makes fraud harder. Branch protection is the two-signature rule for your production code.

## team | Sensible defaults

- Protect `main` (and release branches): PR required, 1 approval, required CI checks, no force pushes.
- Add `CODEOWNERS` for sensitive areas (payments, auth, infrastructure).
- Keep admins subject to the rules too, except in documented emergencies.
- Review your rules when the team grows.

## traps | Protection traps

**Self-approval workarounds.** Rules count approvals from *other* people with write access.

**Required checks that never run** (renamed workflow): every PR gets stuck. Keep the rule's check names in sync with your workflows.

**Protecting everything.** Feature branches should stay flexible; protect the shared ones.

## lab | Work within the rules

The team's `main` is protected and has CODEOWNERS. Try the forbidden path once, then add a CODEOWNERS entry through a proper pull request that gets approved.
