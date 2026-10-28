## story | Deleted is not gone

A developer committed `config/prod.env` with the live payment key, noticed an hour later, and pushed a commit deleting it. Problem solved, everyone thought.

Six months later, a security researcher emailed: the key was still visible in the repository's history, three commits back. Bots scan public repositories for keys within minutes of a push. Deleting a file in a new commit hides it from the latest version only; **every earlier commit still contains it**.

The real fix had two parts, in this order: **revoke the key** (assume it is stolen), then **rewrite history** so no commit contains it, force-push, and make sure everybody drops their old copies.

## model | The order matters

| Step | Why |
|---|---|
| 1. **Rotate / revoke** the secret | The moment it was pushed, assume it was copied. Rewriting history does not un-copy it. |
| 2. Find every commit that contains it | `git log --all -S "<secret>"` |
| 3. Rewrite history in a **fresh clone** with `git filter-repo` | removes a file (`--path … --invert-paths`) or replaces text (`--replace-text`) in *every* commit |
| 4. Force-push all branches and tags | `git push --force --all` and `git push --force --tags` |
| 5. Tell collaborators to **re-clone** | old clones and forks still hold the old commits |
| 6. Prevent the next one | secret-scanning **push protection**, `.gitignore`, environment variables |

`git filter-repo` is the tool the git project recommends (it replaced `git filter-branch`). It refuses to run in a repository that does not look like a **fresh clone**, so you cannot destroy unpushed work by accident. After running, it **removes the `origin` remote** so you do not push the rewritten history without thinking.

## commands | Rewrite, then push carefully

```term
$ git log --all --oneline -S "sk_live"                # which commits contain it?
$ git clone https://github.com/you/payments-api.git payments-clean
$ cd payments-clean
$ git filter-repo --invert-paths --path config/prod.env     # drop the file everywhere
$ echo "the-secret-value==>***REMOVED***" > ../replacements.txt
$ git filter-repo --replace-text ../replacements.txt        # scrub it from other files
$ git log --all -S "sk_live"                          # nothing left
$ git remote add origin https://github.com/you/payments-api.git
$ git push --force --all
$ git push --force --tags
```

Turn on push protection so GitHub blocks the next secret before it lands:

```term
$ gh repo edit --enable-secret-scanning --enable-secret-scanning-push-protection
```

## analogy | Recalling a printed book

Printing a correction slip on page 1 of the next edition does not change the copies already sold. You have to recall and reprint every edition, and you still cannot reach the copies people photocopied. That is why you change the lock (rotate the key) first.

## team | Doing it as a team

- Announce the rewrite: every commit id after the first affected one changes. Open pull requests must be recreated or rebased onto the new history.
- Ask everyone to **re-clone**, not pull. A pull would merge the old history back in.
- On GitHub, old commits can stay reachable through cached views and pull-request references; for public leaks, GitHub Support can purge them. Rotation is still the real fix.
- Prevention beats cleanup: push protection, a `.gitignore` for `.env` files, and secrets in a secret manager or Actions secrets.

## traps | History-rewrite traps

**Rewriting first, rotating later.** The key is compromised from the moment it was pushed. Rotate first.

**Deleting the file in a new commit.** It is still in history.

**Running in your working clone.** filter-repo refuses; do not reach for `--force` to make it go away. Use a fresh clone.

**Pushing only `main`.** Other branches and tags still contain the secret: `--all` and `--tags`.

**A teammate pulls instead of re-cloning.** The old commits come back in a merge. Re-clone.

## lab | Scrub payments-api

A live payment key was committed to `you/payments-api` months ago, once in `config/prod.env` and once hard-coded in `src/client.js`. Both were "fixed" in later commits. Revoke the key, rewrite history in a fresh clone so no commit contains it, push the clean history, and turn on push protection.
