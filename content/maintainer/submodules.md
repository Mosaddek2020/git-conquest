## story | The empty folder

Tomás cloned the company app, ran the build and got *"Cannot find module './libs/ui/button'"*. The folder `libs/ui` was there, but empty.

The app used a **submodule**: the shared UI library lives in its own repository, and the app records *which commit* of it to use. Cloning the app does not download the library unless you ask. One command fixed it: `git submodule update --init`. Since then, the onboarding guide says `git clone --recurse-submodules`.

## model | A pointer to a commit in another repository

```diagram
submodule-pointer
```

| Part | What it is |
|---|---|
| `.gitmodules` | committed file: the path and URL of each submodule |
| the **gitlink** at `libs/ui` | an entry in the app's tree that holds one **commit id** of the library, not its files |
| `libs/ui/` on disk | a full clone of the library, usually on a **detached HEAD** at that commit |

The app does not follow the library's `main`. It pins an exact commit. Updating the library is a deliberate change in the app: move the submodule, then commit the new pointer, and `git diff` shows it as:

```
-Subproject commit 1a2b3c4…
+Subproject commit 9e8d7c6…
```

## commands | The submodule lifecycle

```term
$ git submodule add https://github.com/acme/ui.git libs/ui   # add one (writes .gitmodules)
$ git clone --recurse-submodules https://github.com/acme/app.git   # clone app + submodules
$ git submodule update --init          # in an existing clone: fetch and check out the pinned commits
$ git submodule status                 # - not initialised, + checked out at a different commit
$ cd libs/ui && git fetch && git checkout v1.2.0 && cd ../..   # move to a new version
$ git add libs/ui && git commit -m "Bump ui to v1.2.0"         # record the new pointer
$ git submodule update --remote        # or: move to the tip of the library's branch
$ git submodule foreach git log --oneline -1                   # run a command in each one
```

## analogy | A bookmark, not a photocopy

The app does not photocopy the library into itself; it keeps a bookmark to an exact page of another book. Moving the bookmark is an edit you make on purpose, and everyone who opens the app lands on the same page.

## team | When to use them, and the alternatives

- Good for code you **share across repositories and version together**: vendored libraries, firmware, design tokens.
- Each update is reviewable: the pull request shows exactly which library commit you moved to.
- Alternatives: a **package manager** (npm, pip, Maven) for published libraries; a **monorepo** when teams change things together constantly; `git subtree` when consumers should not need submodule commands.

## traps | Submodule traps

**Empty folder after clone.** Run `git submodule update --init` (or clone with `--recurse-submodules`).

**Committing inside the submodule but not in the app.** Your library commit is local; push it, then commit the new pointer in the app.

**Detached HEAD in the submodule.** Normal. Create a branch inside the submodule before making commits there.

**Pulling the app does not move submodules.** After `git pull`, run `git submodule update` to match the new pointers (or set `submodule.recurse true`).

## lab | Bump the UI library

`acme/app` uses `acme/ui` as a submodule at `libs/ui`. Clone the app, bring the library in, move it to the new `v1.2.0` release, record that in the app, and prove a fresh clone gets everything in one command.
