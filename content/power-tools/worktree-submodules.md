## story | Two branches open at once

Olu was halfway through a large refactor when a production bug came in. Stashing a refactor that touched 30 files felt risky, and switching branches meant rebuilding the project each time. Instead:

```term
$ git worktree add ../shop-hotfix -b hotfix/vat main
$ cd ../shop-hotfix          # a second folder, on the hotfix branch
```

One repository, two working folders, each on its own branch. He fixed the bug in the second folder, pushed, and went back to the refactor exactly as he had left it.

## model | Worktrees

A **worktree** is an extra working directory attached to the same repository. All worktrees share the object database, branches and configuration; each has its own HEAD, index and files.

| | Clone again | Worktree |
|---|---|---|
| Disk space | a full second copy of history | only the working files |
| Branches | separate; push and pull between clones | shared instantly |
| Same branch in two places | possible (and confusing) | refused by git |

```term
$ git worktree add ../hotfix -b hotfix/vat main   # new folder + new branch from main
$ git worktree add ../review feature/search       # an existing branch in a new folder
$ git worktree list
$ git worktree remove ../hotfix
```

## model | Submodules

A **submodule** embeds another repository inside yours, pinned to a **specific commit**. The parent repository stores only the submodule's URL (in `.gitmodules`) and the pinned commit id.

```term
$ git submodule add https://github.com/acme/design-tokens.git libs/tokens
$ git commit -m "Add design tokens as a submodule"
$ git clone --recurse-submodules <url>     # clone a project including its submodules
$ git submodule update --init --recursive  # after a normal clone or pull
$ cd libs/tokens && git pull && cd ../..   # move the pin to a newer commit…
$ git commit -am "Update design tokens"    # …and record the new pin in the parent
```

Submodules are powerful but easy to get wrong (forgetting `--recurse-submodules`, a detached HEAD inside the submodule). Many teams prefer a package manager or a monorepo instead.

## model | Big files: Git LFS

Git stores every version of every file forever, so large binaries (videos, datasets, design files) make repositories huge. **Git LFS** (Large File Storage) stores those files on a separate server and keeps only small pointer files in git:

```term
$ git lfs install
$ git lfs track "*.psd"
$ git add .gitattributes design.psd
$ git commit -m "Track Photoshop files with LFS"
```

## analogy | Desks, shelves and warehouses

- **Worktrees** are several desks in one office, all using the same shared filing cabinet.
- A **submodule** is a book from another library on your shelf, with a sticky note saying exactly which edition you rely on.
- **LFS** is a warehouse for bulky items; your shelf holds only the claim tickets.

## traps | Advanced-tool traps

**Deleting a worktree folder by hand.** Use `git worktree remove` (or `git worktree prune` afterwards).

**Committing inside a submodule and forgetting to push it.** The parent then points at a commit nobody else can fetch.

**Adding LFS after big files are already in history.** They stay in old commits; migrating needs `git lfs migrate`.

## lab | Fix a bug without leaving your refactor

You are mid-refactor with uncommitted changes when a hotfix is needed. Use a worktree to fix it in parallel, then clean up. Submodules and LFS appear in the quiz.
