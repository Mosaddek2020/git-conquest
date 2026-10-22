## story | The merge button turned grey

Jun opened a pull request with a new discount feature and asked for review. A teammate approved within minutes, but the **Merge** button stayed grey: *Required status checks have not succeeded.* The CI run showed one failing test: 10% off was being calculated as 90% off.

Jun fixed one character, pushed, the check went green, and the button lit up. Without the required check, a 90% discount would have gone live on a Friday afternoon.

## model | Status checks and required checks

Every workflow run attached to a PR shows up as a **status check** on its latest commit:

- ✓ green: passed
- ✗ red: failed (click through to the logs)
- ● yellow: running

**Branch protection** (Team Workflows realm) can make chosen checks **required**: the PR cannot be merged until they pass on the latest commit. Combined with required reviews, this means nothing reaches `main` without both a human and a machine saying yes.

Each push to the PR branch triggers new runs, so the checks always reflect the **latest** commit.

## commands | Following checks from the terminal

```term
$ gh pr checks                # status of every check on the current branch's PR
$ gh pr view                  # includes check results and what is blocking the merge
$ gh run list                 # recent workflow runs
$ gh run view                 # the latest run's jobs and logs
$ npm test                    # reproduce the failure locally before pushing a fix
$ git commit -am "fix: …" && git push   # the PR re-runs its checks
```

## analogy | A pre-flight checklist

Pilots do not take off because the captain feels confident; they take off when the checklist is complete. Required checks are the checklist for your merge: confident or not, the plane stays at the gate until every item is ticked.

## team | Making CI a help, not a hurdle

- **Fast checks**: aim for minutes, not hours. Split slow suites into parallel jobs.
- **Reliable checks**: a flaky test that fails randomly trains everyone to ignore red. Fix or quarantine flaky tests.
- **Reproducible locally**: developers should be able to run the same commands (`npm test`) on their machine.
- **Required, not optional**: a check that can be bypassed will be bypassed at the worst moment.

## traps | CI traps

**Re-running a failing job until it passes.** If it is flaky, fix the flakiness; if not, fix the bug.

**Merging with an admin override** "just this once".

**Testing only on push to main.** Then failures are discovered after merge. Trigger on `pull_request` too.

## lab | Green before merge

The API repository requires a passing CI check and one approval before anything merges into `main`. Ship a small feature through that gate, including a failed check along the way.
