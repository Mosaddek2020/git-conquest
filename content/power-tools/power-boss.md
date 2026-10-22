## brief | The mystery regression

**The scenario.** *Quill* is a small Markdown-to-HTML converter. Since last week, headings render without their text. The last known good release is tag `v2.0`. Since then there are about a dozen commits from four people. Your job:

1. Find the exact commit that broke headings, ideally letting `git bisect run` do the work.
2. Find out who wrote the faulty line and read why they changed it.
3. Fix the bug on `main` with a revert, without rewriting history.
4. Make sure it cannot quietly happen again: add a `pre-commit` hook that runs the tests and blocks the commit if they fail.
5. Add a `git lg` alias for the graph view.

| Need | Tools |
|---|---|
| Find the commit | `git bisect start HEAD v2.0`, `git bisect run npm test`, `git bisect reset` |
| Understand it | `git show`, `git blame`, `git log -S` |
| Fix | `git revert` |
| Prevent | `.git/hooks/pre-commit`, `chmod +x` |
| Speed | `git config --global alias.lg "…"` |

In this repository, `npm test` checks that a heading like `# Hello` renders as `<h1>Hello</h1>`.

## recap | What Power Tools gave you

- `git bisect` finds the first bad commit by binary search; `git bisect run` automates it.
- `git blame`, `git log -S` and `git show` explain why code is the way it is.
- Aliases and settings (`pull.rebase`, `fetch.prune`, `rerere`, `autoSquash`) speed you up.
- Hooks (`pre-commit`, `commit-msg`, `pre-push`) automate checks locally; CI enforces them.
- Under the hood: blobs, trees, commits and tags, addressed by content hashes; refs are names for ids.
- Worktrees give one repository several working folders; submodules pin other repositories; LFS keeps big files out of history.

## lab | Track down the heading bug
