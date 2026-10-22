## story | The bug report in a chat thread

At a small agency, bugs were reported in a group chat. "The contact form is broken on mobile" scrolled away under lunch plans within an hour. Two weeks later a client asked why it was still broken. Nobody remembered who had looked at it, or whether anyone had.

They moved to GitHub Issues. Every bug and task got a number, a description, labels, an assignee, and a status. When a pull request said `Fixes #42`, the issue closed itself the moment the fix merged, with a link to the exact change.

## model | What an issue is

An **issue** is a numbered discussion thread attached to a repository, used for bugs, feature requests, tasks and questions.

| Field | Purpose |
|---|---|
| Title | One-line summary, e.g. "Contact form does not submit on iOS Safari" |
| Body | Details: steps to reproduce, expected vs actual behaviour, screenshots |
| Labels | Categories: `bug`, `enhancement`, `good first issue`, `priority: high` |
| Assignees | Who is working on it |
| Milestone / Project | Which release or board it belongs to |
| State | Open or closed |

Issues and pull requests **share one numbering sequence** per repository: if issue #41 exists, the next PR is #42.

**Closing keywords** link work to issues. In a PR description (or a commit message on the default branch), `Fixes #42`, `Closes #42` or `Resolves #42` closes issue 42 automatically when the PR merges.

## commands | Issues from the terminal

```term
$ gh issue create --title "Contact form fails on iOS" --body "Steps: …" --label bug
$ gh issue list                     # open issues
$ gh issue list --label bug         # filtered
$ gh issue view 42                  # read one
$ gh issue comment 42 --body "I can reproduce this on iOS 18."
$ gh issue close 42                 # close manually (e.g. "won't fix")
$ gh issue reopen 42
```

## analogy | The ticket rail in a restaurant kitchen

In a busy kitchen, every order is a ticket on the rail: numbered, visible to everyone, with clear details. Cooks take a ticket, work on it, and spike it when the dish goes out. Nobody shouts orders across the room and hopes someone remembers. Issues are the ticket rail for software.

## team | Writing issues people can act on

A good bug report contains:

```text
**What happened:** The contact form shows a spinner forever on iPhone.
**Expected:** A "Thanks, we'll be in touch" message.
**Steps to reproduce:**
1. Open /contact on iOS Safari 18
2. Fill in all fields, press Send
**Notes:** Works on desktop Chrome. Console shows a CORS error.
```

- One problem per issue.
- Search before filing: duplicates waste everyone's time.
- Use **labels** consistently, and `good first issue` to welcome newcomers (Open Source realm).
- Many teams use **issue templates** (`.github/ISSUE_TEMPLATE/`) so reports arrive in this shape.

## traps | Issue traps

**Vague titles** like "Bug" or "Doesn't work".

**Closing keywords in the wrong place.** They act when the PR merges into the **default branch**. "Fixes #42" in a PR into a release branch will not close it automatically.

**Using issues as a chat.** Long debates belong in a discussion or a call; summarise the decision in the issue.

## lab | Track the work

The team's website has a couple of open issues. Report a new bug properly, comment on an existing one, and close one that turned out not to be a bug.
