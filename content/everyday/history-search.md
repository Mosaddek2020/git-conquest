## story | Who broke the discount?

Customers were being charged a cent too much. Ana opened `pricing.js`, ran `git blame`, and every single line said **Format Bot, last Tuesday**: a formatter had reindented the whole file. Scrolling through `git log` meant reading forty commits, most of them about other files.

Kim showed her three questions git answers directly:

- *Which commit added or removed this piece of code?* `git log -S`
- *How did this one function change over time?* `git log -L`
- *Who wrote this line, ignoring the reformat?* `git blame -w`, or better, a committed `.git-blame-ignore-revs` file.

Thirty seconds later they had the commit, the author and the reason. Commit ids tell you *when*; these tools find *which change*.

## model | Search the content, not the list of commits

```diagram
history-search
```

| Question | Tool | Notes |
|---|---|---|
| When did `Math.floor` appear or disappear? | `git log -S Math.floor` | the "pickaxe": counts occurrences before and after each commit |
| Which commits touched lines matching a regex? | `git log -G 'retr(y|ies)'` | also finds a line that moved or was edited |
| How did one function evolve? | `git log -L :discount:pricing.js` | shows only the part of each diff inside that function |
| Lines 40 to 60, through history | `git log -L 40,60:app.js` | the range is followed as lines shift |
| Who wrote each line, past whitespace churn? | `git blame -w` | one-off |
| …past any mechanical commit, for everyone? | `.git-blame-ignore-revs` + `blame.ignoreRevsFile` | GitHub's blame view honours the same file |
| What changed inside a long line? | `git diff --word-diff`, `git show --word-diff` | `[-old-]{+new+}` |

When blame skips an ignored commit, each line it changed goes back to whoever wrote the line it replaced.

```replay
title: A reformat hides the real author
show: graph
setup: init; commit "Create pricing" pricing.js; commit "Round discounts down" pricing.js
step: echo "    reformatted" >> pricing.js && git commit -qam "Reformat with 4-space indentation" | A mechanical commit lands on top: plain blame would now credit it for every line it touched.
step: git rev-parse HEAD > .git-blame-ignore-revs && git add .git-blame-ignore-revs && git commit -qm "Ignore the reformat in blame" | Its id goes into .git-blame-ignore-revs, committed so the whole team (and GitHub) gets it.
step: git config blame.ignoreRevsFile .git-blame-ignore-revs | Each clone sets blame.ignoreRevsFile once; from now on blame looks straight through the reformat.
```

## commands | The search toolbox

```term
$ git log -S 'Math.floor' --oneline          # commits that add or remove the text
$ git log -S 'Math.floor' -p                 # …with their diffs
$ git log -G 'timeout(Ms)?\s*=' --oneline    # regex against changed lines
$ git log -L :discount:pricing.js            # one function's history
$ git log -L 10,25:pricing.js --oneline      # a line range
$ git blame -w pricing.js                    # ignore whitespace-only changes
$ git blame -L 7,10 pricing.js               # just these lines
$ git rev-parse <reformat-commit> >> .git-blame-ignore-revs
$ git config blame.ignoreRevsFile .git-blame-ignore-revs
$ git show --word-diff <commit>              # which word changed
```

`.git-blame-ignore-revs` holds one full commit id per line, with `#` comments allowed:

```
# Reformat with 4-space indentation (prettier 3)
4f1c2a9e8d7b6c5a4f3e2d1c0b9a8f7e6d5c4b3a
```

## analogy | Search by fingerprint, not by date

Reading `git log` from the top is like searching a building's CCTV from Monday morning onwards. `-S` and `-L` are like dusting the door handle for fingerprints: you go straight to the moment that matters.

## team | Habits that make archaeology easy

- Do **mass reformatting in its own commit**, and add that commit to `.git-blame-ignore-revs` in the same pull request.
- Write messages that say **why** ("Round down: finance wants floors for refunds"), because `-S` and `-L` will lead people to them years later.
- Paste the short id of the culprit into the fix's message: "Math.floor came in with 3b1c9e2".
- In code review, prefer `--word-diff` for prose, translations and long configuration lines.

## traps | Search traps

**`-S` misses edits that keep the count the same.** Changing `floor(a)` to `floor(b)` keeps one `floor`. Use `-G floor` to see those too.

**Forgetting quotes around patterns with spaces or regex characters.** `git log -S timeoutMs = 5000` searches for `timeoutMs`; write `-S "timeoutMs = 5000"`.

**Ignore-revs only listed locally.** If you only run `--ignore-rev` yourself, your teammates still see the formatter everywhere. Commit the file and document `blame.ignoreRevsFile` in the README.

**Ignoring real changes.** Only list purely mechanical commits; ignoring a commit that changed behaviour hides real history.

## lab | The cent that went missing

In `~/checkout`, discounts are rounded down and nobody knows why. Use the pickaxe and line history to find the change, make blame look past last week's reformat (for the whole team), see exactly what changed, and fix it with a message that points at the culprit.
