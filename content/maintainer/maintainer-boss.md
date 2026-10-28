## brief | Maintainer for a day

**The scenario.** You maintain `tinykv/tinykv`, a small key-value store used by thousands of projects. It accepts patches by email, keeps a `release/1.x` line for old users, and vendors a hashing library as a submodule at `deps/hashlib`.

Today's queue:

1. **The inbox.** Kim mailed a two-patch series (`~/inbox`) that adds TTL support to the docs and the client. Apply it on a branch with your sign-off, keeping Kim as the author, and get it onto `main`.
2. **The security fix.** `main` already has *"Fix out-of-bounds read in key parser"*. Users on 1.x need it: backport it traceably, and confirm git agrees it is there.
3. **The dependency.** hashlib released `v3.1.0` with a constant-time compare. Move the submodule to that tag and record it on `main`.
4. **Ship.** Push `main`, `release/1.x` and a note on the original fix saying where it went, then tag and push `v1.9.1` on the release line.

## recap | Maintainer's Toolkit

- **range-diff** shows how a rebased series changed, commit by commit.
- **rerere** remembers conflict resolutions so you solve each one once.
- **format-patch / send-email / am** move commits by email and keep authorship; `-s` adds the sign-off.
- **merge-base, cherry, cherry-pick -x and notes** make backports traceable.
- **Submodules** pin another repository at an exact commit; updating them is a deliberate, reviewable change.

## lab | tinykv, release day
