## story | Seven commits called "wip"

The coding agent fixed the pagination bug overnight. Its branch had seven commits: *wip*, *try again*, *add debug output*, *fix tests*, *add .env for local testing*, *remove .env*, *Fix pagination off-by-one*.

The fix itself was good: one line. The history was not something anyone could review, and one commit contained a GitHub token. Removing `.env` in a later commit did not remove it from the branch. When the developer pushed, GitHub's push protection refused.

Agents commit like people in a hurry. **Before review, you turn their branch into the history you would have written**: one clear commit, no secret anywhere in it, with credit where it is due.

## model | Rewrite before anyone depends on it

| Problem | Tool |
|---|---|
| many noisy commits | `git rebase -i main`: `fixup` them into one |
| a commit that added a secret, and one that removed it | `drop` both, so the secret never existed on the branch |
| debug code added then removed | `drop` or `fixup` away |
| vague message | `reword` (or `git commit --amend`) |
| credit the agent | a `Co-authored-by:` trailer, which GitHub shows on the commit |

This is safe because the branch is **not shared yet**. Once others build on it, the golden rule applies: do not rewrite it.

## commands | Clean it up

```term
$ git log --oneline main..                 # what did the agent commit?
$ git log -p main.. -- .env                # where did the secret come and go?
$ git rebase -i main                       # pick the first, fixup the rest, drop the .env pair
$ git log --oneline main..                 # one commit
$ git log --all -p -S "ghp_"               # nothing on this branch any more
$ git commit --amend -m "fix: pagination skipped the last item" --trailer "Co-authored-by: Lumen Agent <agent@lumen.dev>"
$ npm test
$ git push -u origin agent/fix-pagination && gh pr create --fill
```

If the secret was ever **pushed**, rewriting is not enough: rotate it first.

## analogy | Editing the draft

An agent's branch is a first draft with crossings-out in the margin. You publish the clean copy, not the draft, and you still thank the co-author.

## team | Team norms

- Agents work on their own branches and never push to `main`.
- A human tidies, tests and opens the pull request, and is responsible for it.
- Credit agent work with `Co-authored-by:` (or whatever disclosure your team uses).
- Give agents a `.gitignore`d scratch area and no real secrets.

## traps | Traps

**"I deleted it in a later commit."** It is still in the branch history.

**Squashing with `--root` or across shared commits.** Only rewrite the agent's own commits: `main..`.

**Losing the fix while squashing.** Check the final diff (`git diff main`) before pushing.

## lab | Review-ready in five minutes

In `~/listing-api`, the agent's branch `agent/fix-pagination` has seven messy commits, including a token that was added and "removed". Rewrite it into one clean commit with no trace of the token, credit the agent, test it, push it and open the pull request.
