## story | "What did I just change?"

Tomás has been editing a configuration file for an hour, trying to make the app connect to a new database. It finally works, but he changed a dozen things along the way and is no longer sure which of them mattered.

```term
$ git diff config.yml
-  timeout: 5
+  timeout: 30
-  host: db-old.internal
+  host: db-new.internal
+  ssl: true
```

Three changes. He now knows exactly what to commit, and he spotted that the timeout change was only an experiment he should undo.

Being able to answer "what changed?" at any moment, between any two points in history, is one of git's superpowers. This lesson covers the three commands that answer it: `git diff`, `git log` and `git show`.

## model | Which diff compares what

Each `git diff` form compares two of the three areas:

| Command | Compares | Answers |
|---|---|---|
| `git diff` | staging area → working directory | What have I changed but not staged? |
| `git diff --staged` | last commit → staging area | What will my next commit contain? |
| `git diff HEAD` | last commit → working directory | Everything I changed since the last commit |
| `git diff A B` | commit A → commit B | What changed between two points in history |

Reading a diff:

```term
diff --git a/menu.txt b/menu.txt      ← which file
index 3b18e51..a5c1f2d 100644          ← blob ids before..after
--- a/menu.txt                         ← "before" side
+++ b/menu.txt                         ← "after" side
@@ -1,3 +1,3 @@                         ← hunk: lines 1-3 before, lines 1-3 after
 Soup: tomato                           ← unchanged (context)
-Main: pasta                            ← removed
+Main: risotto                          ← added
 Dessert: cake
```

Git shows a modified line as one removal and one addition. Three lines of unchanged context surround each change so you can see where it is.

## commands | log and show

```term
$ git log                         # full history, newest first
$ git log --oneline               # one line per commit
$ git log --oneline --graph --all # history of every branch as a graph
$ git log -n 3                    # only the last three commits
$ git log --stat                  # which files each commit touched
$ git log -p README.md            # every change ever made to one file, with diffs
$ git log --author="Tomás"        # filter by author
$ git log --grep="timeout"        # filter by message text
$ git show                        # the latest commit: metadata + diff
$ git show 3f2a9c1                # a specific commit
$ git show HEAD~1:config.yml      # a file exactly as it was one commit ago
```

`HEAD` means "the commit you are on now". `HEAD~1` is its parent, `HEAD~2` the grandparent, and so on. You can use these anywhere git expects a commit.

## analogy | Track changes, but better

If you have used "Track changes" in a word processor, a diff will feel familiar: deletions marked in red, additions in green. The difference is that git can show you the tracked changes between **any two moments** in the project's life, for every file at once, and nobody has to remember to switch tracking on.

`git log` is the table of contents of that history; `git show` opens one chapter.

## team | Diffs at work

- **Before committing**: `git diff --staged` is your last check. Professionals read their own diff before anyone else does.
- **Code review**: a pull request on GitHub is essentially a diff with comments. Learning to read diffs fluently makes you a better reviewer.
- **Debugging**: "it worked yesterday" becomes `git log --since=yesterday` followed by `git show` on each suspect.
- **Stand-ups**: `git log --author=me --since="1 day ago" --oneline` reminds you what you did.

## traps | Diff confusion

**"`git diff` shows nothing, but I changed files!"** Your changes are probably staged. Plain `git diff` only shows unstaged changes; use `git diff --staged`.

**New files do not appear in `git diff`.** Untracked files are not compared at all until you `git add` them; then they appear in `git diff --staged`.

**The pager.** In a real terminal, long output opens in a pager (`less`). Press {kbd:q} to quit, {kbd:Space} for the next page, {kbd:/} to search.

**Reading the wrong direction.** `git diff A B` shows how to get from A to B. Swap them and every `+` becomes `-`.

## lab | Investigate the menu

A restaurant's menu project has some history and some unfinished edits. Use `diff`, `log` and `show` to investigate, then commit only after you have checked exactly what you are committing.
