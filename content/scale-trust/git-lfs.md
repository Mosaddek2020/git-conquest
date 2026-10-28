## story | The 3 GB repository

A game studio kept everything in one repository: code, textures, sound, cut-scene videos. Within a year, cloning took forty minutes and filled laptops. Worse, deleting an old 800 MB video did not help: git keeps **every version of every file forever**, so the history still carried it.

Then a designer committed a 180 MB trailer and pushed. GitHub refused: *"this exceeds GitHub's file size limit of 100.00 MB"*. The studio moved its media to **Git LFS**. Clones went back to two minutes, because git now held small pointer files, and the big files were downloaded only for the version you check out.

## model | Pointers in git, files in LFS

```diagram
lfs-pointer
```

- `git lfs track "*.mp4"` writes a rule into `.gitattributes`: `*.mp4 filter=lfs diff=lfs merge=lfs -text`.
- On `git add`, the LFS **clean filter** stores the video in a local LFS store and puts a tiny **pointer** into git:

```
version https://git-lfs.github.com/spec/v1
oid sha256:4d7a214614ab2935c943f9e0ff69bad7…
size 188743680
```

- On `git push`, LFS uploads the real file to the LFS server; git pushes the pointer.
- On checkout, the **smudge filter** swaps the pointer for the real file.

GitHub's limits: a warning above **50 MB**, a hard reject above **100 MB** per file. Big files need LFS (or should not be in git at all: build outputs belong in releases or artifact storage).

## commands | Track, migrate, inspect

```term
$ git lfs install                          # once per machine: sets up the filters
$ git lfs track "*.psd" "*.mp4"            # writes .gitattributes
$ git add .gitattributes
$ git add design/poster.psd                # stored as a pointer from now on
$ git lfs ls-files                         # which files LFS manages (* = real file present)
$ git lfs status
```

Already committed a big file? Tracking only affects **new** commits. Rewrite the unpushed history so the file becomes a pointer everywhere:

```term
$ git lfs migrate info                     # which file types take the space
$ git lfs migrate import --include="*.mp4" # rewrite commits not yet pushed
$ git push                                 # uploads LFS objects, then the commits
```

`git lfs migrate import --everything` also rewrites pushed history. Treat that like any history rewrite: coordinate, force-push, everyone re-clones.

## analogy | The cloakroom ticket

At a theatre you do not carry your coat to your seat; you get a small ticket. The ticket is what moves around; the coat waits in the cloakroom until you need it. LFS pointers are tickets, the LFS store is the cloakroom.

## team | Team practice

- Decide LFS patterns **at the start of a project** (`*.psd`, `*.mp4`, `*.wav`, `*.zip` of assets) and commit `.gitattributes` first.
- Everyone runs `git lfs install` once. Without it, a pointer-tracked file is committed raw.
- LFS storage and bandwidth have quotas on GitHub; huge or frequently changing binaries can cost money.
- Generated files (builds, logs, dependencies) belong in `.gitignore`, not in LFS.

## traps | LFS traps

**Tracking after committing.** `git lfs track` does not touch existing commits; the big blob is still in history and the push still fails. Use `git lfs migrate import`.

**Forgetting to commit `.gitattributes`.** Teammates then commit the raw files.

**Seeing pointer text instead of the file.** LFS is not installed on that machine, or the objects were not downloaded: run `git lfs install` and `git lfs pull`.

**Deleting a big file in a new commit.** The file stays in history. Only a rewrite (`git lfs migrate`, `git filter-repo`) removes it.

## lab | Ship the trailer

In `~/trailer-site`, you committed a 180 MB trailer video and GitHub rejects the push. Move it into LFS without losing your commits, push, and make Photoshop files go to LFS from now on.
