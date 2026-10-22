## brief | One feature, end to end

**The scenario.** You are a developer at *Fieldnotes*, a note-taking app. The repository `fieldnotes/web` is on GitHub, `main` is protected (direct pushes are blocked, merges need one approval), and your teammate Priya reviews quickly.

A user reported that exported notes lose their titles. Take it all the way:

1. File an issue describing the bug.
2. Clone the repository and fix the bug on a properly named branch.
3. Publish the branch and open a pull request that will close the issue automatically.
4. Respond to Priya's review by pushing a follow-up commit.
5. When the PR is approved, merge it (squash) and delete the branch.
6. Bring your local `main` up to date and confirm the issue closed.

| Need | Tools |
|---|---|
| Issues | `gh issue create`, `gh issue view` |
| Branch & publish | `git switch -c`, `git push -u` |
| PR | `gh pr create --title … --body "Fixes #N"`, `gh pr view` |
| Merge | `gh pr merge --squash --delete-branch` |
| Sync | `git switch main`, `git pull` |

## recap | What GitHub gave you

- A GitHub repository adds code browsing, issues, pull requests, Actions and settings around a bare git repository. `gh repo create --source=. --push` publishes a local project.
- Authenticate with **HTTPS tokens** (`gh auth login`) or **SSH keys** (`ssh-keygen`, `gh ssh-key add`, `ssh -T git@github.com`). Passwords no longer work for git.
- **Issues** track work; `Fixes #N` closes them when a PR merges.
- **Pull requests** propose merging a branch; every push updates them; merge with a merge commit, squash, or rebase.
- **Code review**: comment, request changes, approve. Review the code, not the person.

## lab | Fix the export bug through the full GitHub flow
