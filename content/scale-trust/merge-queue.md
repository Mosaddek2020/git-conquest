## story | Both green, together red

Friday, 4 pm. Two pull requests, both reviewed, both with a green CI check. Priya's renamed `formatPrice` to `formatMoney` everywhere. Omar's added a new call to `formatPrice` in the cart. Each was tested against the `main` that existed when it was opened. Each passed.

Priya merged hers. Omar merged his a minute later. `main` was broken: Omar's new call pointed at a function that no longer existed. Nobody had tested the **combination**.

The team turned on a **merge queue**. Now "merge" means "test this pull request on top of `main` *plus everything queued ahead of it*, and merge only if that passes".

## model | Testing what will actually land

```diagram
merge-queue
```

| Without a queue | With a queue |
|---|---|
| CI tests the PR against the `main` it branched from | CI tests `main` + every PR ahead in the queue + this PR |
| two green PRs can break `main` together | a combination that fails is removed from the queue; `main` stays green |
| "require branches to be up to date" forces endless rebasing | the queue does the updating for you |

The queue builds a temporary branch named like `gh-readonly-queue/main/pr-12-…` and runs your workflows on it with the **`merge_group`** event. That last part is the one teams forget: if CI does not run on `merge_group`, the queue waits forever for a check that never comes.

```yaml
on:
  pull_request:
  merge_group:        # required for merge queues
```

## commands | Using the queue

```term
$ gh pr checks 12              # green on its own
$ gh pr merge 12 --squash      # with a queue: "added to the merge queue"
$ gh pr merge 12 --auto --squash   # queue it automatically once approved and green
$ gh pr view 12                # "Merge queue: removed (CI failed on the merge group)"
$ gh run list                  # look for runs with event merge_group
```

Turn the queue on in branch protection: *Require merge queue* (in this course: the GitHub tab → *Settings · branch protection*).

## analogy | Boarding a plane

You do not let each passenger walk onto the plane whenever their ticket checks out. They queue, and the gate checks each one against the plane as it actually is: seat free, weight within limits. A merge queue is the gate.

## team | When teams use it

- Busy repositories where many PRs merge a day (monorepos, large open-source projects).
- It replaces "Require branches to be up to date", which makes every author rebase after every merge.
- Keep the merge-group CI fast: every queued PR waits for it.

## traps | Merge-queue traps

**CI does not listen to `merge_group`.** The queue waits for a status that never arrives. Add the trigger *before* turning the queue on.

**Thinking a green PR check is enough.** It tested a `main` that no longer exists.

**Fixing a removed PR by re-queueing it unchanged.** It will fail the same way. Update it on top of the new `main` first.

## lab | Put a gate on main

In `acme/storefront`, PRs #1 and #2 are approved and green, and secretly incompatible. Prepare CI for a merge queue, turn the queue on, watch it protect `main`, then fix the PR it rejected and get it merged.
