## story | "Which version is the customer on?"

A customer reported a bug in "the version from last month". Developer Leila asked: which commit was that? Nobody knew. The deploy log said "deployed main" twelve times last month.

The fix was **tags**: a permanent, human-readable name on the exact commit that was released.

```term
$ git tag -a v2.3.0 -m "Release 2.3.0"
$ git push origin v2.3.0
$ git checkout v2.3.0      # months later: exactly what the customer runs
```

## model | Tags and semantic versioning

A **tag** is a ref that, unlike a branch, **never moves**.

| | Lightweight tag | Annotated tag |
|---|---|---|
| Create | `git tag v1.0.0` | `git tag -a v1.0.0 -m "Release 1.0.0"` |
| Stores | just a pointer | a tag object: tagger, date, message (can be signed) |
| Use for | private bookmarks | releases |

```diagram
semver
```

**Semantic versioning** (`MAJOR.MINOR.PATCH`):

- `PATCH` (2.4.**1**): bug fixes, nothing else changes.
- `MINOR` (2.**5**.0): new features, backwards compatible.
- `MAJOR` (**3**.0.0): breaking changes.
- Pre-releases: `3.0.0-beta.1`.

A **GitHub release** is a tag plus release notes (and optional downloadable files), shown on the repository's Releases page.

## commands | Tagging and releasing

```term
$ git tag                              # list
$ git tag -l "v2.*"                    # filter
$ git tag -a v2.4.0 -m "Release 2.4.0" # annotated, at HEAD
$ git tag -a v2.3.1 -m "Hotfix" a1b2c3d   # tag an older commit
$ git show v2.4.0                      # tag details + commit
$ git push origin v2.4.0               # tags are NOT pushed by plain git push
$ git push --tags                      # push all tags
$ git describe --tags                  # "v2.4.0-3-g9e8f7b6": 3 commits after v2.4.0
$ git tag -d v2.4.0-oops               # delete locally
$ git push origin --delete v2.4.0-oops # delete on the remote
$ gh release create v2.4.0 --generate-notes   # GitHub release with notes from merged PRs
```

## analogy | Edition numbers on a book

A book's text changes between printings, but "Second edition, 2024" always refers to exactly the same pages. A tag is the edition number for your code. Semantic versioning tells readers what kind of change the new edition contains before they buy it.

## team | Release habits

- **Tag every release**, annotated, from the commit that was actually deployed.
- **Never move a published tag.** If v2.4.0 was wrong, release v2.4.1.
- **Automate**: a release workflow can build, test and publish whenever a `v*` tag is pushed (GitHub Automation realm).
- **Changelog**: keep `CHANGELOG.md` or use generated release notes.

## traps | Tag traps

**Forgetting to push tags.** `git push` alone does not send them.

**Lightweight tags for releases.** They lack tagger and date; use `-a`.

**Re-tagging.** Deleting and recreating a pushed tag confuses everyone who already fetched it.

## lab | Cut a release

Tag the current release properly, push it, publish a GitHub release, then ship a patch release after a bug fix.
