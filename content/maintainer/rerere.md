## story | The same conflict, every Monday

The redesign branch lived for six weeks. Every Monday, Lena merged `main` into it to check nothing had broken, and every Monday she hit the same conflict in `styles.css`: the redesign changed the brand colour, `main` had changed it too. She resolved it the same way every time.

On the day of the real rebase, she resolved it once more, then again for the next commit. A colleague asked: "Why don't you turn on rerere?" Git can **record how you resolved a conflict** and **reuse** the resolution the next time it sees the same conflict.

## model | Record, then replay

```diagram
rerere
```

With `rerere.enabled`:

1. When a conflict appears, git records the conflicted text: *"Recorded preimage for 'styles.css'"*.
2. When you resolve it and `git add` the file (or commit), git records your result: *"Recorded resolution for 'styles.css'."*
3. Next time the **same conflict** appears, in a merge, a rebase or a cherry-pick, git writes your recorded result into the file: *"Resolved 'styles.css' using previous resolution."*

You still check and `git add` the file (unless `rerere.autoupdate` is on). rerere matches the conflicting hunks themselves, so it works even when the two sides swap places, as they do between a merge and a rebase.

## commands | Turn it on and use it

```term
$ git config --global rerere.enabled true
$ git merge main                         # trial merge on a long-lived branch
CONFLICT (content): Merge conflict in styles.css
Recorded preimage for 'styles.css'
$ git add styles.css                     # after fixing it by hand
Recorded resolution for 'styles.css'.
$ git merge --abort                      # throw the trial merge away; the resolution stays
...
$ git rebase main                        # weeks later
Resolved 'styles.css' using previous resolution.
$ git add styles.css && git rebase --continue
```

```term
$ git rerere status        # files with a recorded preimage in this conflict
$ git rerere diff          # what your current resolution changes
$ git rerere forget styles.css   # drop a resolution you got wrong
$ git config --global rerere.autoupdate true   # also stage reused resolutions
```

## analogy | Muscle memory

The first time you assemble a flat-pack bookcase you read every step. The tenth time your hands know it. rerere is git's muscle memory for conflicts you have already solved.

## team | When it pays off

- Long-lived branches that regularly merge or rebase on `main`.
- Maintainers who test-merge many topic branches together (the git project itself does this daily).
- Rebasing a long series where the same conflict appears in several commits.

## traps | rerere traps

**Recording a wrong resolution.** rerere replays mistakes too. Use `git rerere forget <file>`, then resolve again.

**Trusting it blindly.** Always look at the file and run the tests; the code around the conflict may have changed meaning.

**Expecting it to work retroactively.** It only replays conflicts it recorded while enabled. Turn it on globally now.

## lab | Solve it once

In `~/theme`, your long-lived `redesign` branch conflicts with `main` in `styles.css`. Turn on rerere, do a trial merge, resolve it once, throw the merge away, then rebase for real and let git reuse your resolution.
