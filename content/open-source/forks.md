## story | "Permission denied to you"

Carlos found a typo in the documentation of a popular open-source charting library. He cloned it, fixed the typo, committed and pushed:

```term
$ git push
remote: Permission to chartkit/chartkit.git denied to carlos.
fatal: unable to access 'https://github.com/chartkit/chartkit.git/': The requested URL returned error: 403
```

Of course: he is not a maintainer of chartkit, so he cannot write to its repository. Nobody can let thousands of strangers push to their project. Open source works differently: you make **your own copy on GitHub**, a **fork**, push there, and ask the maintainers to pull your change in.

## model | Clone vs fork

| | Clone | Fork |
|---|---|---|
| Where | your computer | GitHub (server side) |
| Made with | `git clone` | the Fork button or `gh repo fork` |
| You can push to it | only if you have write access to the original | yes, it is yours |
| Purpose | work locally | contribute to projects you cannot write to |

```diagram
fork-triangle
```

A contributor's setup has three repositories:

- **upstream**: the original project (`chartkit/chartkit`). You can read it; you cannot push.
- **origin**: your fork (`carlos/chartkit`). You push here.
- **local**: your clone of the fork, with both `origin` and `upstream` as remotes.

The pull request goes **from your fork's branch to upstream's main**.

## commands | Fork and wire up remotes

```term
$ gh repo fork chartkit/chartkit --clone   # fork on GitHub, clone your fork, add upstream
$ cd chartkit
$ git remote -v
origin    https://github.com/carlos/chartkit.git (fetch)
origin    https://github.com/carlos/chartkit.git (push)
upstream  https://github.com/chartkit/chartkit.git (fetch)
upstream  https://github.com/chartkit/chartkit.git (push)
```

If you already cloned the original (like Carlos), convert in place:

```term
$ gh repo fork --remote          # creates the fork; renames origin → upstream; adds your fork as origin
```

Or by hand:

```term
$ git remote rename origin upstream
$ git remote add origin https://github.com/carlos/chartkit.git
```

## analogy | A photocopy of the master plans

An architecture firm keeps the master plans in its archive. Visitors cannot draw on them. But you may take a photocopy to your own desk (fork), sketch improvements on it, and then submit your marked-up copy to the firm's review board (pull request). If they like it, *they* update the master plans.

## team | Forks beyond open source

- **Open source**: forks are how almost every outside contribution happens.
- **Companies** sometimes use forks for contractors or for very large teams, though most internal work uses branches in one shared repository.
- Your fork is a real repository: it has its own branches, and you can even run its Actions. But issues and the official history live upstream.

## traps | Fork traps

**Working on your fork's main.** Keep `main` clean and identical to upstream's main; do every contribution on a branch.

**Mixing up origin and upstream.** Push to origin (your fork); fetch from upstream (the original).

**Stale forks.** A fork does not update itself. The sync lesson covers keeping it current.

## lab | Fork a project you cannot push to

You want to contribute to the `chartkit/chartkit` library. First experience the 403, then fork it properly and set up both remotes.
