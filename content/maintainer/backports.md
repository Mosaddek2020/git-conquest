## story | Which fixes made it to 2.x?

Lighthouse 3.0 shipped in spring, but hospitals and universities still run **2.x** and will for a year. When a security fix lands on `main`, it must also reach `release/2.x`. After a few months nobody remembered which fixes had been copied. Some were cherry-picked twice; one critical fix was never backported at all.

The maintainers settled on a routine: **ask git which fixes are missing, cherry-pick with `-x`, check again, and leave a note on the original commit**.

## model | Tools for maintaining old lines

| Question | Command |
|---|---|
| Where did the release branch split from `main`? | `git merge-base main release/2.x` |
| Is commit A already contained in branch B? | `git merge-base --is-ancestor A B` (exit code 0 = yes) |
| Which commits on `main` have **no equivalent** on `release/2.x`? | `git cherry -v release/2.x main` |
| Copy a fix and record where it came from | `git cherry-pick -x <commit>` |
| Annotate a commit without changing it | `git notes add -m "…" <commit>` |

`git cherry` compares **patches**, not commit ids: a cherry-picked copy has a new id but the same change, so it is shown with `-` (already there). `+` means missing.

`-x` appends *"(cherry picked from commit 4d7a21f…)"* to the message, so anyone can trace the backport to the original.

**Notes** attach extra text to a commit after the fact, without rewriting it: "Backported to 2.x", "Reviewed-by", "CVE-2026-1234". They live in `refs/notes/commits` and show up in `git log`.

## commands | The backport routine

```term
$ git merge-base main release/2.x
$ git cherry -v release/2.x main
+ 4d7a21f Fix XSS in status page titles
- 6b0c9e2 Fix crash on empty config        (already backported)
+ 9a3f5d1 Fix timezone in incident times
+ 1c2d3e4 Add dark mode                     (feature: do not backport)
$ git switch release/2.x
$ git cherry-pick -x 4d7a21f 9a3f5d1
$ git cherry -v release/2.x main            # the fixes now show as -
$ git notes add -m "Backported to 2.x" 4d7a21f
$ git log -1 4d7a21f                        # shows Notes:
$ git push origin release/2.x
$ git push origin refs/notes/commits        # notes are not pushed by default
$ git fetch origin 'refs/notes/*:refs/notes/*'   # teammates fetch them explicitly
```

## analogy | Library returns

When a library buys a corrected edition of a textbook, it does not reprint the old copies; it pastes a slip into each one: *"See corrections in the 3rd edition, p. 41."* Cherry-pick `-x` is the slip in the copy; a note on the original says where it was copied to.

## team | Backport policy

- Decide what qualifies: security and crash fixes yes, features no.
- Backport the **smallest** commit that fixes the problem; that is one more reason for atomic commits.
- Label pull requests `backport-2.x`; some teams automate the cherry-pick with a bot, then a human reviews it.
- Tag a patch release (`v2.4.1`) after backports so users can upgrade.

## traps | Backport traps

**Comparing by commit id.** `git log release/2.x..main` lists every commit on main, including ones already cherry-picked. Use `git cherry`.

**Backporting a fix that depends on a feature.** It will not apply or will not work. Find the minimal change or write a dedicated fix on the release branch.

**Notes left local.** `git push` does not push `refs/notes/*`. Push them explicitly.

## lab | Patch release 2.4.1

In `~/lighthouse`, `main` has two security fixes that `release/2.x` still lacks, one fix that was already backported, and a feature that must not go to 2.x. Find the missing fixes, backport them traceably, annotate the originals, and ship v2.4.1.
