## story | No internet in the lab

Ravi's team built firmware for medical devices. The test lab was **air-gapped**: no network connection to the outside, by regulation. For months they copied zip files of the source over on a USB stick, lost track of which version was where, and could not tell what had changed between drops.

`git bundle` fixed it. A bundle is a repository's history **in one file**: you can clone it, verify it, and later pull an **incremental** bundle with only the new commits. And for release downloads they stopped zipping folders by hand: `git archive` makes a clean tarball of exactly one tagged tree.

## model | History in a file; a tree in a tarball

```diagram
bundle-flow
```

| | `git bundle` | `git archive` |
|---|---|---|
| Contains | commits, trees, blobs, and the refs you name | the files of one tree, no history |
| Use it to | clone, fetch or pull **without a server** | publish a **release download** |
| Typical | `git bundle create repo.bundle --all` | `git archive --prefix=app-1.2/ -o app-1.2.tar.gz v1.2` |
| Incremental | `v2.0..main`: the receiver must already have v2.0 | n/a |
| Skips | nothing you named | paths marked `export-ignore` in the committed `.gitattributes` |

`git bundle verify` checks a bundle is complete and that your repository has any **prerequisite** commits it needs.

## commands | Moving and packaging history

```term
$ git bundle create /media/usb/firmware.bundle --all     # every branch and tag
$ git bundle verify /media/usb/firmware.bundle
$ git clone /media/usb/firmware.bundle                   # on the offline machine

$ git bundle create /media/usb/update.bundle v2.0..main  # only what is new
$ git pull /media/usb/update.bundle main                 # on the offline machine
$ git bundle list-heads /media/usb/update.bundle

$ printf '/tests export-ignore\n/.github export-ignore\n' >> .gitattributes
$ git add .gitattributes && git commit -m "Keep tests and CI out of release archives"
$ git tag -a v2.1 -m "Firmware 2.1"
$ git archive --format=tar.gz --prefix=firmware-2.1/ -o firmware-2.1.tar.gz v2.1
$ git archive --prefix=firmware-2.1/ -o firmware-2.1.zip v2.1   # format from the extension
$ tar -tzf firmware-2.1.tar.gz
```

```replay
title: A bundle is a repository you can carry
show: graph
setup: init; commit "Create firmware"; commit "Add sensor driver"; git tag v2.0
step: git bundle create ../firmware.bundle --all | Every branch and tag now lives in one file next to the project.
step: cd .. && git clone -q firmware.bundle lab-copy && cd lab-copy | Cloned from the file, no server involved: the graph is the same history.
```

## analogy | A sealed archive box and a shop display

A bundle is the archive box from the records office: every version of every document, sealed, and you can add a smaller "updates since March" box later. An archive is the product on the shop shelf: the finished thing, without the drafts, notes and tests behind it.

## team | Where these show up

- **Air-gapped or regulated networks**: factories, labs, defence and finance often move code by bundle.
- **Offline backups**: `git bundle create backup-$(date +%F).bundle --all` is a single file you can store anywhere.
- **Release assets**: GitHub's "Source code (tar.gz)" download is a `git archive` of the tag, so `export-ignore` affects it too.
- **Sending a repository by email or chat** when the receiver has no access to your server.

## traps | Bundle and archive traps

**Incremental bundle without the prerequisite.** The receiver must already have the base commit (`v2.0` above). `git bundle verify` tells you before you travel.

**`export-ignore` only in your working tree.** `git archive` reads `.gitattributes` from the tree it archives, so commit the rule before tagging.

**Archiving a branch name for a release.** Archive a **tag**, so the tarball can always be rebuilt identically.

**Expecting the archive to be a repository.** It has no `.git`. Use a bundle when the receiver needs history.

## lab | Firmware for the clean room

In `~/firmware`, carry the whole repository to the air-gapped lab machine (`~/lab`) on a USB stick (`~/usb`) as a bundle, later send just the new commits as an incremental bundle, and publish a `v2.1` release tarball without the tests and CI configuration.
