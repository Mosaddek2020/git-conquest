## story | From laptop to portfolio

Rania built a weather dashboard for a course project. It lived only on her laptop, in a git repository with forty commits. A recruiter asked for a link to her code.

```term
$ cd weather-dashboard
$ gh repo create weather-dashboard --public --source=. --push
✓ Created repository rania/weather-dashboard on GitHub
✓ Added remote https://github.com/rania/weather-dashboard.git
✓ Pushed commits to https://github.com/rania/weather-dashboard.git
```

One command created an empty repository on GitHub, added it as `origin`, and pushed her whole history. The recruiter could now read her code, her README, and every commit message (which is one more reason to write good ones).

## model | What a GitHub repository is

A GitHub repository is a **bare git repository** on GitHub's servers (history and branches, no working directory) plus everything GitHub builds around it:

| Part | What it gives you |
|---|---|
| Code view | Browse files and history at any commit, in the browser |
| README.md | Rendered on the front page: the project's introduction |
| Branches & tags | The same refs you push from git |
| Issues | A task and bug tracker |
| Pull requests | Proposals to merge one branch into another, with review |
| Actions | Automation (tests, deploys) on every push |
| Settings | Visibility, collaborators, branch protection |

**Visibility**: *public* repositories can be read by anyone; *private* ones only by people you invite (collaborators) or your organisation's members. Writing (pushing) always requires permission.

## commands | Creating and connecting repositories

There are two directions, and both end with a local repository whose `origin` points at GitHub:

**Start on GitHub, then clone**

```term
$ gh repo create travel-blog --public --clone   # create it and clone it
$ cd travel-blog
```

**Start locally, then publish** (the common case)

```term
$ cd travel-blog
$ gh repo create travel-blog --public --source=. --push
```

Or by hand, using the website's "New repository" button and then:

```term
$ git remote add origin https://github.com/you/travel-blog.git
$ git push -u origin main
```

Other everyday commands:

```term
$ gh repo view                 # description and README of the current repo
$ gh repo view octo-org/handbook
$ gh repo list                 # your repositories
$ gh browse                    # open the current repo in the browser
```

## analogy | Renting a shop front

Your local repository is your workshop. Creating a GitHub repository is renting a shop front on a busy street: you put your work in the window (the README and code view), customers can walk in and leave notes (issues), other craftspeople can propose improvements (pull requests), and you can hire a robot assistant that checks every delivery (Actions). The workshop stays yours; the shop is where collaboration happens.

## team | Good repository hygiene

- **A README** that answers: what is this, how do I run it, how do I contribute.
- **A LICENSE** for public code (otherwise, legally, nobody may reuse it).
- **A `.gitignore`** from the start (GitHub offers templates when you create a repo).
- **A description and topics** so people can find it.
- **The default branch** is `main`; branch protection rules keep it safe (Team Workflows realm).

## traps | Repository traps

**Creating the GitHub repo with a README, then pushing a local repo.** Both histories have a first commit, so they are unrelated and the push is rejected. Either create the GitHub repo empty, or clone it first.

**Publishing secrets.** Check `git log -p` for passwords before making a repository public. Once public, assume anything in history has been copied.

**Private does not mean secure storage for secrets.** Still never commit them.

## lab | Publish your project

You have a local project with a few commits and no remote. Publish it to GitHub with the CLI, check the remote, and look at it the way visitors will.
