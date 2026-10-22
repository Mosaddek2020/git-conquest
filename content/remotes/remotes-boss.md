## brief | The busy morning

**The scenario.** You are on the payments team at *Kestrel*, a booking platform. The repository `kestrel/payments` is busy: four teammates push constantly. This morning:

- You need the latest code: clone the repository into `~/work`.
- Build a small fix on a new branch `fix/refund-rounding`, publish it with an upstream, then update it after a teammate's change lands on main.
- While you work, teammates push to `main` and to your branch's base. Your pushes will be rejected at least once.
- Your teammate Nora already merged and deleted `feature/old-checkout` on GitHub; clean up your bookmarks.
- Finally, `main` on your machine must match GitHub, and your fix branch must be published, rebased on the latest main, and never force-pushed without a lease.

| Need | Tools |
|---|---|
| Get the code | `git clone`, `git remote -v`, `git branch -a` |
| Stay current | `git fetch`, `git log main..origin/main`, `git pull --rebase` |
| Publish | `git push -u origin <branch>` |
| Rewrite your own pushed branch | `git rebase origin/main`, `git push --force-with-lease` |
| Clean up | `git fetch --prune`, `git branch -vv` |

## recap | What Remotes gave you

- A **remote** is a named URL (`origin` by default). **Remote-tracking branches** (`origin/main`) are read-only bookmarks updated by fetch, pull and push.
- **fetch** downloads and moves bookmarks; **pull** = fetch + merge/rebase.
- **push** only fast-forwards. Rejected? Integrate first. `-u` sets the upstream on a branch's first push.
- **Divergence**: choose a pull policy (`pull.rebase true` is popular).
- **Force** only your own rewritten branches, always `--force-with-lease`. **Prune** stale bookmarks.

## lab | Ship a fix on a busy repository
