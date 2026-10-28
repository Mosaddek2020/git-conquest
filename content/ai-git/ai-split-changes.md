## story | One commit, five changes

An agent was asked to "add fuzzy search". It did. It also reformatted the date utilities "while it was there", bumped two dependencies, left a `debug.log` behind and created `.env.local` with an API key it needed for testing.

The developer ran `git add -A && git commit -m "Add search"`. The reviewer saw 900 changed lines and approved the search part without noticing the rest. The key in `.env.local` reached GitHub.

Agents work fast and wide. **Your job is to turn their output into small, honest commits**, and to stop secrets and junk at the door.

## model | Sort before you stage

| In the working tree | Where it goes |
|---|---|
| the feature you asked for | its own commit |
| an unrelated refactor | a separate commit (or a separate PR) |
| dependency updates | their own `chore:` commit, so they can be reverted alone |
| logs, build output, scratch files | `.gitignore` |
| secrets (`.env*`, keys, tokens) | `.gitignore`, never staged; rotate if they were ever committed |

Small commits make review possible, `git revert` precise and `git bisect` useful. "The AI did it all at once" is not a reason to commit it all at once.

## commands | Review, ignore, stage by path

```term
$ git status                      # every new and changed file
$ git diff --stat                 # how big is each change?
$ printf ".env*\n*.log\n" >> .gitignore
$ git status                      # .env.local and debug.log are gone from the list
$ git add src/search.js && git commit -m "feat: add fuzzy search"
$ git add src/utils/date.js && git commit -m "refactor: simplify date helpers"
$ git add package.json package-lock.json .gitignore && git commit -m "chore: bump search deps; ignore env and log files"
$ git log --stat -3
```

When one file mixes two concerns, `git add -p` (patch mode) stages individual hunks. This simulator stages whole files, so in the lab every concern is in its own file.

## analogy | Unpacking the shopping

You would not throw a whole shopping bag into the fridge. Fruit goes in the bowl, milk in the fridge, the receipt in the bin. Unpack an agent's work the same way: each thing where it belongs.

## team | Team norms for agent output

- Ask agents for narrow tasks; reject drive-by refactors or split them out.
- `.gitignore` the agent's scratch space and every `.env*` file from day one.
- Never `git add -A` after an agent run. Look first.
- Reviewers can ask for a split; that is a normal request, not a nitpick.

## traps | Traps

**`git add -A` after an agent run.** You commit whatever it left behind.

**"It's only a refactor."** Unreviewed refactors hide behaviour changes.

**Ignoring a file that is already tracked.** `.gitignore` has no effect on tracked files: `git rm --cached` it first.

## lab | Unpack the agent's work

In `~/catalog`, the agent finished "add fuzzy search" and left five kinds of changes in the working tree. Keep the secret and the log out of git, then commit the feature, the refactor and the dependency bump as three separate commits.
