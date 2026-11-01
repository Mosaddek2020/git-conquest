## brief | Monday at the platform team

**The scenario.** You have just joined Acme's platform team and cloned `acme/platform` into `~/work/platform` on your own laptop, where your global email is the personal one. Your first Monday has a list of loose ends:

1. **Identity.** Every repository under `~/work/` must commit as `dev@acme.example`, automatically. You already made one commit on `main` with the wrong email: fix it before anyone sees it.
2. **Archaeology.** Requests keep timing out. Find the commit that changed `timeoutMs = 5000`, and revert it.
3. **Translations.** The `i18n-de` branch holds the agency's reviewed German. Merge it so their wording wins conflicting hunks, without losing the new "delete" key from `main`. Push.
4. **Release and backup.** Tag `v1.4`, write a `platform-1.4.zip` release archive with everything inside a `platform-1.4/` folder, back up every branch and tag to `~/platform.bundle`, and tidy the repository with a gc.

## recap | Everyday Mastery

- **Search by content**: `log -S`, `log -G`, `log -L :func:file`, `blame -w`, `.git-blame-ignore-revs`, `--word-diff`.
- **Stacks**: `rebase.updateRefs`, PRs based on the branch below, `--fixup` + `--autosquash`, `rebase --onto` after a squash merge.
- **Picking a side**: `-X ours`/`-X theirs` for conflicting hunks, `--ours`/`--theirs` per file, `-s ours` to record a merge without its changes.
- **Identities**: `includeIf` by folder or remote URL, `--show-origin`, `--reset-author` for unpushed commits, `.mailmap` for published ones.
- **Housekeeping**: `count-objects`, `gc`, `maintenance start`, and expire + prune to really delete.
- **Without a server**: `git bundle` (full or incremental) and `git archive` with `export-ignore`.

## lab | Monday's list
