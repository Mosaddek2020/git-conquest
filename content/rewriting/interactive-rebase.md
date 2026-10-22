## story | Twelve commits called "fix"

Before opening his pull request, Ben looked at his branch:

```term
$ git log --oneline main..feature/search
f1e2d3c fix typo
a9b8c7d fix tests again
4d5e6f7 fix tests
1a2b3c4 WIP
9z8y7x6 Add search endpoint
```

Reviewers would have to wade through his trial-and-error. He opened an interactive rebase:

```term
$ git rebase -i main
```

Git opened an editor listing the five commits. He changed a few words, saved, and the branch became two clean commits: "Add search endpoint" and "Add search tests". Same final code, much clearer story.

## model | The todo list

`git rebase -i <base>` opens a **todo list** of every commit after `<base>`, oldest first:

```text
pick 9z8y7x6 Add search endpoint
pick 1a2b3c4 WIP
pick 4d5e6f7 fix tests
pick a9b8c7d fix tests again
pick f1e2d3c fix typo
```

Change the word at the start of each line, or reorder lines, then save. Git replays the list top to bottom.

| Command | Effect |
|---|---|
| `pick` | keep the commit as is |
| `reword` | keep the changes, edit the message |
| `edit` | stop after applying it so you can amend (split it, change files) |
| `squash` | meld into the previous commit and combine the messages |
| `fixup` | meld into the previous commit and discard this message |
| `drop` | remove the commit entirely (or delete the line) |

Reordering lines reorders commits. `squash` and `fixup` always join the commit **above** them.

```replay
title: Squash the fix-ups into one clean commit
show: graph
setup: init; commit "Create app"; commit "Add search endpoint"; commit "WIP"; commit "fix tests"
step: git reset --soft HEAD~3; git commit -qm "Add search endpoint with tests" | The result of squashing three commits into one: a single, well-described commit. (Interactive rebase does this through the todo list; a soft reset is the shortcut when the commits are the newest ones.)
```

## commands | Interactive recipes

```term
$ git rebase -i HEAD~4              # edit the last four commits
$ git rebase -i main                # edit everything on this branch since main
$ git commit --fixup <commit>       # make a commit marked "fixup! <message of commit>"
$ git rebase -i --autosquash main   # automatically move fixup! commits under their targets
$ git rebase --continue             # after an edit stop or conflict
$ git rebase --abort                # cancel everything
```

The `--fixup` + `--autosquash` pair is a professional favourite: while working, record small fixes as `git commit --fixup <id>`; before review, one autosquash rebase tidies everything.

## analogy | Editing a draft before publishing

A writer drafts a chapter in many sittings, leaving notes like "fix later" and "typo". Before sending it to the editor, she rearranges paragraphs, merges duplicate sections, and rewrites the headings. The content is the same; the presentation is clear. Interactive rebase is that editing pass for your commits, and like a draft, you only edit what has not been published.

## team | Clean history, reviewed faster

- Reviewers read **commit by commit**. Clean, logical commits make reviews faster and more accurate.
- Many teams "squash and merge" pull requests on GitHub instead, which turns the whole PR into one commit. Interactive rebase gives you finer control.
- Keep each commit **buildable**: a reviewer (or `git bisect`) should be able to check out any commit and run the tests.

## traps | Interactive traps

**Squash on the first line.** `squash` needs a previous commit to join; the first line must be `pick` (or `reword`/`edit`).

**Deleting a line by accident** drops that commit. If it happens, `git rebase --abort` during the rebase or the reflog afterwards.

**Rewriting pushed commits.** Same rule as always: only private history.

**Getting lost in an `edit` stop.** `git status` tells you where you are; `git rebase --continue` moves on.

## lab | Tidy a messy branch

A feature branch has five messy commits. Use interactive rebase to turn them into a clean, reviewable story.
