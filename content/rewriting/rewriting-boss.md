## brief | Ready for review

**The scenario.** You have been working for three days on `feature/invoices` at *Ledgerly*, an accounting app. Your branch is private: nobody else has pulled it. Tomorrow you open a pull request and your tech lead is known for strict reviews.

Your branch is a mess:

- it is several commits behind `main`, and rebasing onto `main` will conflict once,
- it contains a "WIP" commit, two "fix" commits that belong with earlier commits, and a debugging commit that must not ship,
- one commit has a misleading message.

Separately, a security fix landed on `main` this morning and must also go to the maintained `release/1.x` branch.

Your goal for `feature/invoices`: up to date with `main`, and **exactly three clean commits** with clear messages:

1. `Add invoice model`
2. `Add invoice PDF export`
3. `Add invoice email sending`

| Need | Tools |
|---|---|
| Catch up with main | `git rebase main`, `--continue`, `--abort` |
| Polish commits | `git rebase -i main`: pick, reword, squash, fixup, drop, reorder |
| Backport | `git cherry-pick -x <commit>` |
| Safety net | `git reflog`, `ORIG_HEAD` |

## recap | What Rewriting History gave you

- `git rebase <base>` replays your commits on a new base: linear history, new ids.
- `git rebase -i` edits a series of commits: reword, squash, fixup, drop, reorder, edit.
- `git cherry-pick` copies one commit's change onto the current branch.
- **The golden rule**: rewrite only private history. Merge and revert for shared history.
- Conflicts during rebase come one commit at a time; `--ours`/`--theirs` are swapped compared with merge.

Next realm: Remotes. Your repository meets the outside world.

## lab | Polish feature/invoices and backport the fix
