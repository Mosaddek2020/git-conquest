## story | "Where does origin come from?"

On her first day, Grace cloned the company's main repository:

```term
$ git clone https://github.com/acme/storefront.git
Cloning into 'storefront'...
$ cd storefront
$ git branch -a
* main
  remotes/origin/HEAD -> origin/main
  remotes/origin/main
  remotes/origin/checkout-v2
```

She had never created anything called `origin`, and there were branches she had never made. Her mentor explained: cloning copies the whole repository **and** remembers where it came from. That remembered address has a nickname, `origin`, and git keeps a read-only bookmark of every branch it saw there: `origin/main`, `origin/checkout-v2`.

## model | Remotes and remote-tracking branches

```diagram
remote-model
```

- A **remote** is a named URL of another copy of the repository. `origin` is just the default name given to the one you cloned from.
- A **remote-tracking branch** like `origin/main` is your local, read-only record of where `main` was **on that remote the last time you talked to it**. It only moves when you `fetch`, `pull` or `push`.
- Your **local branch** `main` is yours to commit on. After a clone, it is set to **track** `origin/main` (its *upstream*), so git can tell you if you are ahead or behind.

Three different things all called "main": your `main`, your bookmark `origin/main`, and GitHub's actual `main`. Most remote confusion comes from mixing them up.

## commands | Clone and inspect remotes

```term
$ git clone <url>                     # copy a repository; creates origin and a local main
$ git clone <url> my-folder           # choose the folder name
$ git remote                          # list remote names
$ git remote -v                       # with their URLs
$ git remote show origin              # details: branches, tracking
$ git branch -a                       # local and remote-tracking branches
$ git branch -vv                      # local branches with upstream and ahead/behind
$ git remote add upstream <url>       # add a second remote
$ git remote rename origin old        # rename
$ git remote set-url origin <new-url> # change the address (e.g. HTTPS → SSH)
$ git remote remove old               # forget a remote
```

URLs come in two flavours you will meet constantly:

| Kind | Example | Authentication |
|---|---|---|
| HTTPS | `https://github.com/acme/storefront.git` | token / credential manager |
| SSH | `git@github.com:acme/storefront.git` | SSH key |

Both reach the same repository. The GitHub realm covers authentication.

## analogy | A map with a "last updated" date

`origin/main` is like a printed map of a city with "last updated: Tuesday" in the corner. It is accurate for Tuesday. If roads changed since, your map does not know until you buy a new edition (`git fetch`). Your own notes in the margin (local commits) are separate from the printed map.

## team | Typical remote setups

- **Your team's repository**: one remote, `origin`, which everyone pushes to.
- **Open source with a fork**: `origin` is your fork, `upstream` is the original project (Open Source realm).
- **Several servers**: e.g. `origin` on GitHub and `deploy` on a hosting provider; `git push deploy main` deploys.
- `git clone` copies **all** history and branches. Only the default branch gets a local branch; others become local branches the moment you `git switch` to them.

## traps | Remote traps

**Thinking `origin/main` is live.** It is a snapshot from your last fetch. Fetch before comparing.

**Committing on `origin/main`.** You cannot: checking it out gives a detached HEAD. Work on local branches.

**Wrong URL type.** An SSH URL without an SSH key fails with "Permission denied (publickey)". Switch to HTTPS or set up a key.

**Cloning into an existing repository folder.** Clone creates a new folder. Run it from where you want the project folder to appear.

## lab | Clone the storefront

Your team's storefront repository lives on GitHub. Clone it, inspect the remote, explore remote-tracking branches, and check out a branch that so far exists only on GitHub.
