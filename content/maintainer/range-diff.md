## story | "What changed since I last looked?"

Ana's pull request had three commits. Kofi reviewed it carefully on Monday and asked for one change. On Wednesday Ana rebased onto the latest `main`, fixed the issue, dropped a debug commit and force-pushed.

GitHub showed the whole pull request as new. The plain diff against `main` now also contained two days of other people's work. Kofi had a choice: review all of it again, or ask git a precise question, *"how does Ana's new series differ from the old one, commit by commit?"*

That question has a command: `git range-diff`.

## model | Comparing two versions of a series

`git range-diff <base> <old-tip> <new-tip>` lines up the commits of `base..old-tip` with the commits of `base..new-tip` and tells you, for each pair:

| Marker | Meaning |
|---|---|
| `1: a1b2c3d = 1: e4f5a6b Add tokenizer` | same change, only re-applied (new id) |
| `2: b2c3d4e ! 2: f5a6b7c Handle empty input` | changed: the lines below show the **diff of the diffs** |
| `3: c3d4e5f < -: ------- Debug logging` | dropped in the new version |
| `-: ------- > 3: a6b7c8d Add tests` | new in the new version |

Commits are matched first by identical patches, then by similar subject lines. A rebase changes every commit id, but not the patches, so unchanged commits show as `=`.

## commands | Everyday forms

```term
$ git fetch
 + 3f1c2aa...9e8d7c6 tokenizer -> origin/tokenizer  (forced update)
$ git range-diff origin/main tokenizer origin/tokenizer   # base, old, new
$ git range-diff tokenizer...origin/tokenizer             # old...new (base = their merge base)
$ git range-diff @{u} @{u}@{1} @                          # after your own rebase: what did I change?
$ git show 9e8d7c6~1                                      # inspect a changed commit in full
$ git reset --hard origin/tokenizer                       # move your copy to the new version
```

Show reviewers what changed in your own force-push by pasting the `range-diff` output into a pull-request comment.

## analogy | Comparing two editions of a book

You read the first edition. The second edition has a new preface, renumbered pages and one rewritten chapter. Re-reading everything is a waste; you want an editor's note listing *which chapters changed and how*. range-diff is that note.

## team | Where it shines

- Re-reviewing a force-pushed pull request.
- Patch series on mailing lists (`[PATCH v2]`): reviewers compare v1 and v2.
- Checking your own interactive rebase did what you intended before you push.

## traps | range-diff traps

**Wrong base.** If the base is not where both series start, unrelated upstream commits appear as "new". Use the upstream branch the series sits on.

**Reading `=` as "not reviewed".** `=` means identical to what you already reviewed. Your earlier review still applies.

**Comparing branches, not series.** `git diff old new` compares two snapshots and includes everything upstream did in between. range-diff compares two series of commits.

## lab | Re-review Ana's force-push

In `~/parser` you reviewed Ana's `tokenizer` branch (PR #1) earlier. She has since rebased and force-pushed. Fetch, compare the old and new series with range-diff, inspect the one commit that changed, update your local copy and approve.
