## brief | The Conquest

**The scenario.** You have been hired as the lead developer of *Lighthouse*, an open-source status-page tool maintained by a small team at `lighthouse/app`. You have write access. `main` is protected: pull requests, one approval and a green **CI** check are required. Releases are tagged with semantic versions, and `release/1.x` is maintained for older users.

On your first day, everything happens at once:

1. **A regression.** Status badges show the wrong colour since v1.4.0. Find the commit that caused it with bisect.
2. **The fix.** Fix it on a properly named branch. Your work-in-progress commits are messy: clean them into one well-described commit before review.
3. **Ship it.** Open a pull request that closes the bug report (issue #1), get CI green and the review approved. While you wait, a teammate merges into `main` and your branch needs updating: rebase it and update the PR safely.
4. **Release.** After merging, tag and publish **v1.4.1**.
5. **Backport.** Users on the old line need the fix too: cherry-pick it onto `release/1.x` and push.

In this repository, `npm test` checks that an "up" status renders a **green** badge.

This is the final trial. Everything you need, you have already practised. Use the Field Guide if you forget a command; that is what professionals do too.

## recap | Zero to hero

You started at Base Camp not knowing what a commit was. Look at what you can do now:

- **Record** history with intent: the three areas, focused commits, clear messages, `.gitignore`.
- **Travel** through it: log filters, detached HEAD, amend, reset, revert, reflog.
- **Branch and merge** confidently, resolve conflicts calmly, **rebase** and polish private history, **cherry-pick** fixes.
- **Collaborate**: remotes, fetch, pull, push, divergence, force-with-lease, forks and upstream.
- **Work on GitHub**: issues, pull requests, reviews, protected branches, CODEOWNERS, releases.
- **Automate**: Actions, required checks, secrets, Dependabot, deploy pipelines with approvals, and rollbacks.
- **Wield power tools**: bisect, blame, hooks, aliases, worktrees, and the object model underneath it all.
- **Rescue** any situation by asking two questions: is it committed, and is it shared?

The rest is practice. Real projects will throw situations at you that no course can predict, and you now have the mental models to reason your way through them.

## lab | Lighthouse, day one
