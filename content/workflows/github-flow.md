## story | Deploying twenty times a day

A small payments startup shipped once a month. Every release was a stressful weekend: dozens of features, merged together at the last minute, conflicts everywhere, and nobody sure which change broke what.

They switched to a simple rule set called **GitHub flow**: `main` is always deployable; every change is a short-lived branch; every branch becomes a pull request; merged PRs deploy immediately. Releases went from monthly to twenty times a day, and each one was so small that problems were obvious and easy to revert.

## model | One rule and a loop

```diagram
github-flow
```

**The rule:** anything in `main` is deployable.

**The loop**, for every change, however small:

1. Create a descriptively named branch from `main`.
2. Commit and push early; open a (draft) pull request to discuss.
3. Review, automated checks (CI), maybe deploy the branch to a preview environment.
4. Merge into `main`.
5. Deploy `main` (often automatically).

No `develop` branch, no release branches, no long-lived anything. The workflow you practised in the GitHub realm *is* GitHub flow.

## commands | The loop in commands

```term
$ git switch main && git pull                  # start from the latest main
$ git switch -c feature/saved-cards
$ git commit -am "Store cards with the payment provider token"
$ git push -u origin feature/saved-cards
$ gh pr create --fill --draft                  # early feedback
$ gh pr ready                                  # mark ready for review
$ gh pr merge --squash --delete-branch         # after approval and green checks
$ git switch main && git pull                  # sync, start the next task
```

## analogy | A kitchen that plates as it goes

A restaurant kitchen does not cook every order for the night and serve them all at 10 pm. Each dish is prepared on its own station and goes out as soon as it is ready and checked by the head chef. The pass (main) only ever holds finished dishes. That is GitHub flow.

## team | When it fits, and what it needs

GitHub flow fits teams that **deploy continuously**: web apps, APIs, internal tools. It works because of supporting practices:

- **Automated tests** on every PR (required checks).
- **Small PRs** that review quickly.
- **Feature flags** to merge unfinished features safely (code is deployed but switched off).
- **Fast rollback**: revert a PR or redeploy the previous commit.

It fits less well when you must support several released versions at once (mobile apps in app stores, installed software). Those teams add release branches, as in the next lesson.

## traps | GitHub-flow traps

**Long-lived feature branches.** They quietly turn GitHub flow back into merge hell. Aim for days, not weeks.

**Merging without CI.** "Main is always deployable" is only true if something checks it.

**Big-bang PRs.** Split work behind feature flags.

## lab | Run the loop twice

Ship two small changes to a team web app through the GitHub flow loop, starting from an up-to-date main each time.
