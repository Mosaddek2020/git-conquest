## brief | Release day at Harbour

**The scenario.** *Harbour* is a shipping-logistics app. The team uses a light release model: `main` is protected (PR + 1 approval), features merge through PRs, releases are tagged with semantic versions, and commits follow Conventional Commits.

Today you are the release captain:

1. Two feature PRs are waiting. Review state is fine; your job is to ship your own small feature too: add a `feat:` commit on a branch, open a PR, get it approved, and squash-merge it with a conventional PR title.
2. Cut release **v1.3.0**: annotated tag on the merged `main`, pushed, and published as a GitHub release.
3. A bug is reported in v1.3.0 right after release. Fix it with a `fix:` commit through a PR and release **v1.3.1**.
4. Leave your local `main` up to date with GitHub.

| Need | Tools |
|---|---|
| Ship through PRs | `git switch -c`, `git push -u`, `gh pr create --title "feat: …"`, `gh pr merge --squash` |
| Tag and release | `git tag -a vX.Y.Z -m`, `git push origin vX.Y.Z`, `gh release create` |
| Versioning | feat → minor, fix → patch, `!` → major |

## recap | What Team Workflows gave you

- **GitHub flow**: main always deployable, short branches, PRs, deploy on merge.
- **Git flow**: develop + release + hotfix branches for versioned products. **Trunk-based**: tiny, frequent merges to one trunk with feature flags.
- **Conventional Commits** (`feat:`, `fix:`, `feat!:`) and **atomic commits** make history searchable and automate releases.
- **Tags** mark releases (`git tag -a`, `git push origin <tag>`), numbered with **semantic versioning**; GitHub releases add notes.
- **Branch protection** and **CODEOWNERS** enforce review and checks on the branches that matter.

## lab | Ship v1.3.0 and v1.3.1
