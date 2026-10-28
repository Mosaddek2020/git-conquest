## story | Twenty minutes to clone

ACME kept every service in one **monorepo**: the API, billing, the web app, docs, eight years of history. A full clone was 1.8 GB and took twenty minutes. The CI system cloned it from scratch on every build, hundreds of times a day.

Two small changes fixed most of it. CI switched to `git clone --depth 1`: it only builds the newest commit, so it never needed eight years of history. Developers switched to a **blobless, sparse** clone: all the history for `git log` and `git blame`, but file contents downloaded only when needed, and only the folders they work on checked out.

## model | Four shapes of clone

```diagram
clone-shapes
```

| Clone | Command | Good for | Cost |
|---|---|---|---|
| full | `git clone URL` | everyday work on small repos | everything, up front |
| **shallow** | `git clone --depth 1 URL` | CI builds, one-off reads | no history: `log`, `blame`, `bisect` stop at the boundary |
| **partial (blobless)** | `git clone --filter=blob:none URL` | big repos you develop in | old file contents fetched on demand (needs the network) |
| **sparse checkout** | `git sparse-checkout set dir` | monorepos | other folders are not on disk (but still tracked) |

Shallow clones also fetch a **single branch** by default. The boundary commit is marked `grafted` in `git log`.

Sparse checkout in **cone mode** keeps files in the repository root plus the folders you name.

## commands | Clone less, work the same

```term
$ git clone --depth 1 https://github.com/acme/monorepo.git ci-build
$ git rev-parse --is-shallow-repository     # true
$ git log --oneline                         # one commit, marked (grafted)
$ git fetch --unshallow                     # need history after all? fetch the rest
$ git fetch --depth 50                      # or just a bit more
```

```term
$ git clone --filter=blob:none --sparse https://github.com/acme/monorepo.git mono
$ cd mono
$ git sparse-checkout set services/billing  # only this folder (plus root files)
$ git sparse-checkout add docs              # and this one
$ git sparse-checkout list
$ git sparse-checkout disable               # everything again
$ git status                                # "You are in a sparse checkout with 18% of tracked files present."
```

Commits, branches, pushes and pull requests work exactly as usual: sparse and partial clones are still complete repositories.

## analogy | The library

A full clone carries the whole library home. A shallow clone takes only today's newspaper. A partial clone takes the catalogue and fetches a book when you open it. Sparse checkout means only the shelves you work on are in your room, though you can still look anything up.

## team | Where each one fits

- **CI**: `--depth 1` (or `actions/checkout`'s default `fetch-depth: 1`). Jobs that need tags or history (release notes, `git describe`) set a bigger depth or `fetch-depth: 0`.
- **Developers in monorepos**: blobless clone + sparse checkout of their area.
- **Never** run history-rewriting or history-reading tools (`bisect`, `filter-repo`, release scripts) in a shallow clone without unshallowing first.

## traps | Clone-shape traps

**"Where is my branch?"** A shallow clone only fetched the default branch. Use `git fetch origin other:other`, or `git remote set-branches origin '*'` then `git fetch`.

**Blame and log stop early.** In a shallow clone they end at the grafted commit. `git fetch --unshallow`.

**Offline with a partial clone.** Opening an old version needs the network to fetch its contents.

**Editing outside the cone.** Files outside a sparse checkout are not on disk; add the folder with `git sparse-checkout add` first.

## lab | Tame the monorepo

`acme/monorepo` is big. Make a fast CI-style clone and deepen it when history is needed. Then make the developer clone you will actually work in: blobless, sparse, with only billing and docs on disk, and ship a billing change.
