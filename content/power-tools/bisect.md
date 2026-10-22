## story | 400 commits, one bug

The invoice totals in a billing system were off by a few cents, but only for some customers. It had worked three weeks earlier, at release v4.2. Since then, 400 commits had landed. Reading them all would take days.

Rosa used `git bisect`:

```term
$ git bisect start
$ git bisect bad                # current version is broken
$ git bisect good v4.2          # this release was fine
Bisecting: 199 revisions left to test after this (roughly 8 steps)
```

Git checked out a commit halfway between. She ran the totals test and told git `good` or `bad`. After **nine** tests, git printed the exact commit that introduced the rounding error. With `git bisect run npm test`, she could even have let git do the testing on its own.

## model | Binary search through history

```diagram
bisect
```

You give git one **bad** commit and one **good** commit. Git checks out the commit in the middle. You test it and answer `good` or `bad`, which discards half of the remaining suspects. Repeat until one commit is left: the **first bad commit**.

The number of steps grows very slowly: 16 commits need about 4 tests, 1,000 commits about 10, a million about 20.

Bisect requires a **reliable test** that tells good from bad. It works best when every commit builds (another reason for atomic commits).

## commands | Driving a bisect

```term
$ git bisect start
$ git bisect bad                    # HEAD is broken
$ git bisect good v4.2              # a known good commit or tag
#   ... git checks out a middle commit; test it ...
$ git bisect good                   # or: git bisect bad
#   ... repeat until "<id> is the first bad commit" ...
$ git bisect reset                  # back to where you started

$ git bisect start HEAD v4.2        # bad and good in one line
$ git bisect run npm test           # automatic: exit code 0 = good, non-zero = bad
$ git bisect skip                   # this commit cannot be tested (e.g. does not build)
$ git bisect log                    # what you answered so far
```

## analogy | Finding a dead bulb in a string of lights

A string of 400 fairy lights is dark because one bulb is dead. Testing bulbs one by one takes forever. Instead, test whether power reaches the middle. If it does, the dead bulb is in the second half; if not, the first half. Each test halves the search. Nine tests find the bulb among 400.

## team | Bisect in real debugging

- Turn "it used to work" into a **specific commit**, author and message, which usually explains the *why*.
- Write the test first (a failing unit test, or a small script), then `git bisect run` it.
- Combine with `git show <commit>` and `git blame` to understand the change.
- Your teammates will be impressed. Mostly because it feels like magic.

## traps | Bisect traps

**Forgetting `git bisect reset`.** You stay in detached HEAD on some old commit. The prompt shows BISECTING.

**Mislabelling one commit.** One wrong `good`/`bad` sends the search into the wrong half. If results look odd, `git bisect log`, then restart.

**Flaky tests.** A test that sometimes fails will mislead bisect.

## lab | Hunt the regression

The calculator's tests pass at tag v1.0 but fail now, twelve commits later. Find the commit that broke it, first by hand, then automatically with `git bisect run`.
