## story | The message that lied

Jun asked an assistant to write the commit message for a small rounding fix. It produced a beautiful one: *"feat: add tests for invoice rounding and fix #12 currency conversion bug"*. Jun pasted it and pushed.

There were no tests in the commit. Issue #12 was about something else entirely; GitHub closed it automatically because the message said "fix #12". The customer who reported #12 got an email saying it was resolved. It was not.

The assistant had not lied on purpose. It wrote a *plausible* message, the kind that usually goes with code like this. Checking it against the diff was Jun's job, and Jun's name was on the commit.

## model | Propose, check, own

```diagram
ai-verify
```

| The assistant is good at | You must check |
|---|---|
| summarising a diff quickly | every claim is in the diff: files, behaviour, tests |
| following a format (Conventional Commits) | the type is right: `fix`, `feat`, `refactor` mean different things |
| suggesting a clear subject line | no invented issue numbers: `fixes #12` closes #12 |
| explaining *what* changed | the *why*: only you know the reason |

The rule is simple: **you are the author**. Your name is on the commit whoever typed the message. Many teams also ask you to disclose AI help with a trailer such as `Assisted-by:` or `Co-authored-by:`.

## commands | Give it real context, then verify

```term
$ git add invoice.js
$ git diff --staged | ai "write a conventional commit message for this change"
$ git diff --staged --stat                 # what does the change really touch?
$ git diff --staged                        # are there tests? which behaviour changed?
$ git commit -m "fix: round invoice totals half-up" --trailer "Assisted-by: Lumen AI"
$ git log -1                               # read it once more before you push
```

Pipe the **staged diff**, not your whole working tree: the message must describe exactly what this commit contains.

## analogy | The confident intern

A new intern drafts your emails. The drafts are fluent and fast, and sometimes promise things you never agreed to. You would never send one unread. An assistant's commit message is a draft from a confident intern.

## team | Team norms

- Messages describe **this commit**: no claims about tests, issues or behaviour that are not in the diff.
- Keep issue references deliberate. `fixes #N`, `closes #N` and `resolves #N` close issues when merged.
- Follow the team's disclosure rule for AI help (a trailer, a PR checkbox, or nothing).
- Review the *diff*, not the message. A good message on a bad diff is still a bad commit.

## traps | AI message traps

**Invented work.** "Add tests", "improve performance", "fix #12" when none of it happened.

**Wrong type.** A refactor labelled `fix` ends up in the release notes as a bug fix.

**Whole-tree context.** Piping `git diff` (unstaged) describes changes that are not in the commit.

**Pasting without reading.** Your name is on it.

## lab | Own the message

In `~/billing`, you fixed how invoice totals are rounded. Stage it, ask the assistant for a message with the staged diff as context, check every claim against the diff, then commit an accurate message that discloses the help, and push.
