## story | Two projects, same idea

Two similar Markdown parsers appeared on GitHub the same month. One had a two-line README and no license. The other had a README with a demo GIF, install and usage instructions, a `LICENSE` (MIT), a `CONTRIBUTING.md`, a code of conduct, and a dozen issues labelled `good first issue`.

A year later the second one had 140 contributors. The first had one. The code was of similar quality. The difference was that one project was **welcoming and usable**, and the other was a mystery.

## model | The files that make a project open

| File | Purpose |
|---|---|
| `README.md` | What it is, why, how to install and use it, where to get help |
| `LICENSE` | The legal permission to use, change and share the code. **No license = all rights reserved.** |
| `CONTRIBUTING.md` | How to set up, test, and submit changes; branch and commit conventions |
| `CODE_OF_CONDUCT.md` | Expected behaviour, and how to report problems |
| `SECURITY.md` | How to report vulnerabilities privately (not in a public issue) |
| `.github/ISSUE_TEMPLATE/`, `PULL_REQUEST_TEMPLATE.md` | Structure for reports and PRs |
| `CHANGELOG.md` | What changed in each release |

GitHub recognises these files and links them from the repository page ("community standards").

**Common licenses**: MIT and Apache-2.0 (permissive: do almost anything, keep the notice), GPL-3.0 (copyleft: derivative works must stay open under GPL). choosealicense.com explains them in plain language.

## analogy | Opening a community garden

A garden with a locked gate and no sign gets no volunteers. Put up a sign explaining what grows here (README), the rules for picking (LICENSE), a rota and tool shed instructions (CONTRIBUTING), a note about being kind to each other (Code of Conduct), and a list of easy jobs for first-timers (good first issues). Suddenly neighbours join in.

## commands | Setting up a project's community files

```term
$ echo "# Project" > README.md
$ curl -o LICENSE https://...        # or pick one when creating the repo on GitHub
$ mkdir -p .github/ISSUE_TEMPLATE
$ edit CONTRIBUTING.md
$ git add . && git commit -m "Add community health files"
$ gh issue create --title "Add a dark mode example" --label "good first issue" --body "…"
```

## team | The maintainer's side

When you maintain a project (even a small one at work):

- **Label** issues so contributors can find their way in.
- **Respond** to first-time contributors quickly and kindly. The first experience decides whether they come back.
- **Automate** the boring parts: CI checks, formatting, templates.
- **Say no politely**, with reasons, when a PR does not fit the project.
- **Credit** contributors in release notes.

## traps | Open-source traps

**Publishing code without a license** and assuming people may use it. They legally may not.

**Reporting a security hole in a public issue.** Follow `SECURITY.md` or contact the maintainers privately.

**Demanding features** from volunteers. Offer to help instead.

**Copying code from another project** without respecting its license.

## lab | Make a project welcoming

You maintain a small open-source library that nobody contributes to. Add the community files that turn it into a welcoming project, and create a starter issue for newcomers.
