## story | A folder becomes a repository

Lena runs a small cookbook blog and writes her recipes as text files in a folder called `recipes`. She keeps losing good versions of recipes when she "improves" them. A developer friend tells her: "Run `git init` in that folder."

```term
$ cd recipes
$ git init
Initialized empty Git repository in /home/lena/recipes/.git/
```

Nothing visible changed. Her recipe files are exactly where they were. But the folder now has a hidden subfolder, `.git`, and that changes everything: the folder is now a **repository**, and git can record its history.

Nothing is tracked yet, though. `git init` only builds the empty filing cabinet. Lena still has to decide which files go into it, and when. That is the next lesson.

## model | What git init actually creates

A repository is two things living in one folder:

- **Your files** (the *working directory*): the recipes, code or documents you edit normally.
- **The `.git` folder**: git's private database holding every commit, branch and setting.

```term
recipes/
├── .git/          ← the repository's database. Never edit by hand.
│   ├── HEAD       ← which branch you are on: "ref: refs/heads/main"
│   ├── config     ← settings for this repository only
│   ├── objects/   ← every version of every file, compressed
│   ├── refs/      ← branches and tags (tiny files holding commit ids)
│   └── hooks/     ← optional scripts git can run automatically
├── pancakes.md
└── soup.md
```

Delete `.git` and the folder is an ordinary folder again, with **all history gone**. Copy the whole folder, `.git` included, and you have copied the repository with its full history.

> [!IMPORTANT]
> One project, one repository. Run `git init` in the project's top folder, not in your home folder. A repository in `~` would try to track every file you own.

## analogy | Installing a flight recorder

Think of `git init` as installing a flight recorder (a "black box") in an aircraft. Installing it does not record anything yet and does not change how the plane flies. But from now on, the recorder is there, ready to capture exactly what happens.

The `.git` folder is the black box. You do not open it during the flight; you use the instruments (git commands) to read and write it.

## commands | Creating repositories

```term
$ mkdir travel-blog && cd travel-blog   # make a project folder and enter it
$ git init                              # turn it into a repository
Initialized empty Git repository in /home/dev/travel-blog/.git/
$ ls -a                                 # .git is hidden; -a shows it
.  ..  .git
$ git status                            # ask git what it sees
On branch main

No commits yet

nothing to commit (create/copy files and use "git add" to track)
```

Useful variations:

| Command | Effect |
|---|---|
| `git init` | Repository in the current folder |
| `git init my-app` | Creates `my-app/` and a repository inside it |
| `git init -b main` | Choose the first branch name for this repository |
| `git status` | Inside a repo: what changed. Outside one: `fatal: not a git repository` |

Running `git init` twice is harmless: git replies `Reinitialized existing Git repository` and touches nothing.

## inside | Peeking at .git

You never need to edit `.git` by hand, but looking inside once removes the mystery:

```term
$ cat .git/HEAD
ref: refs/heads/main
$ ls .git
config  description  HEAD  hooks  info  objects  refs
```

`HEAD` contains a single line saying "the current branch is main." The branch `main` does not have a file in `refs/heads/` yet, because a branch is just a pointer to a commit and there are no commits. That is also why `git status` says "No commits yet."

In this simulator you can `ls .git` and `cat .git/HEAD` too. Later, in the Power Tools realm, you will open the objects themselves.

## traps | Init mistakes

**Initialising in the wrong folder.** If `git status` lists hundreds of files you never meant to track, you probably ran `git init` in your home folder. Fix: `rm -rf .git` in *that* folder (carefully: check `pwd` first).

**Nesting repositories.** Running `git init` inside a folder that is already part of a repository creates a repository inside a repository. The outer one then sees the inner folder as a strange, untrackable thing. Check with `git status` before running `git init`.

**Expecting init to save files.** After `git init`, nothing is tracked. Your files are not "in git" until you add and commit them.

**Deleting `.git` to "start fresh".** That deletes the entire history. It is occasionally right, but never do it casually.

## lab | Start the travel blog

You are starting a travel blog. Create the project folder, turn it into a repository, and look at what git created. Watch the **Files** and **Three areas** panels: the folder is a repository now, but the repository is still empty.
