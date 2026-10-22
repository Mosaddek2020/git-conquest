## story | "Why is the timeout 47 seconds?"

Ben found a strange line in the API client: `timeout: 47`. Not 30, not 60: 47. Changing it felt risky without knowing why it existed.

```term
$ git blame -L 12,12 client.js
8f2a1c9 (Hana Ito 2025-03-14 10:22:01 +0000 12)   timeout: 47,
$ git show 8f2a1c9
    Raise timeout to 47s: the bank's API times out at 45s and
    retries need 2s of headroom. See incident #318.
```

Twenty seconds of archaeology answered the question and prevented an outage. **Code tells you how; history tells you why.**

## commands | Archaeology tools

```term
$ git blame file.js                    # who last changed each line, in which commit
$ git blame -L 10,20 file.js           # only lines 10-20
$ git blame -e file.js                 # show emails
$ git log -S "timeout: 47" --oneline   # commits that added or removed this exact text
$ git log -p -- file.js                # the full history of one file with diffs
$ git log --follow -- new-name.js      # follow a file across renames (real git)
$ git show <commit>                    # read the commit that explains it
$ git log --grep="incident"            # search messages
```

## model | What blame really tells you

`git blame` shows, for each line, the **last commit that changed it**. That is not always who *wrote the idea*:

- A formatting commit ("reindent everything") becomes the blame for every line it touched. Many teams list such commits in `.git-blame-ignore-revs` and run `git blame --ignore-revs-file .git-blame-ignore-revs`.
- A moved block shows the move, not the original author (`git blame -C` can detect moves).

So blame is the **starting point**: take the commit id, then `git show` it, then search further back with `git log -S` if needed.

## analogy | Layers in an archaeological dig

Each commit is a layer of soil. `git blame` labels every artefact with the layer it was found in. Sometimes a later layer simply disturbed an older object (a reformat). An experienced archaeologist digs deeper (`git log -S`) before concluding who made the pot.

## team | Blame without blaming

Despite the name, `git blame` is not about fault. It finds **context** and **the right person to ask**. Healthy teams treat it as "who can tell me more about this?", never as ammunition. Good commit messages make every blame useful.

## traps | Archaeology traps

**Stopping at the first blame result** when it is a formatting commit.

**Ignoring the message.** The commit id is a means to an end: read the message, the linked issue and the PR discussion.

**Concluding "nobody knows why" too early.** Search messages and code changes before deleting mysterious code.

## lab | Explain the mystery numbers

A payments client contains two suspicious constants. Use blame, show and the pickaxe to find out who set them, when, and why.
