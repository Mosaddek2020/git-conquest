## story | Release notes that write themselves

Every two weeks, someone on Yuki's team spent half a day writing release notes by reading through 120 commit messages. Then the team adopted **Conventional Commits**:

```term
$ git log --oneline v1.4.0..HEAD
e3a1b2c feat(search): filter results by author
9d8c7b6 fix(cart): keep quantities when the page reloads
4f5e6d7 docs: explain the new search filters
1a2b3c4 feat!: drop support for API v1
```

A tool now reads the prefixes and generates the release notes and the next version number automatically: one `feat!` (breaking change) means a new major version. What used to take half a day takes one command.

## model | Conventional Commits

The format:

```text
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s), e.g. "BREAKING CHANGE: …" or "Refs #123"]
```

| Type | Use for |
|---|---|
| `feat` | a new feature (→ minor version) |
| `fix` | a bug fix (→ patch version) |
| `docs` | documentation only |
| `refactor` | code change that neither fixes a bug nor adds a feature |
| `test` | adding or fixing tests |
| `chore` | tooling, dependencies, housekeeping |
| `perf` | performance improvement |
| `ci`, `build`, `style` | pipelines, build system, formatting |

A `!` after the type/scope, or a `BREAKING CHANGE:` footer, marks a breaking change (→ major version).

## model | Atomic commits

Independent of the message format, good commits are **atomic**:

- **one logical change** per commit,
- the project **builds and tests pass** at every commit,
- **reviewable on its own**,
- **revertable on its own** without breaking unrelated features.

Atomic commits make `git revert`, `git bisect` and code review work the way they are meant to.

## commands | Writing them

```term
$ git commit -m "feat(search): filter results by author"
$ git commit -m "fix(cart): keep quantities when the page reloads" -m "Quantities were stored in memory only. Fixes #88"
$ git commit -m "feat!: drop support for API v1" -m "BREAKING CHANGE: clients must call /v2 endpoints."
$ git log --oneline --grep="^feat"        # list features
```

Teams often enforce the format with a `commit-msg` hook (Power Tools realm) or a CI check on PR titles.

## analogy | Filing with labelled folders

An office where every document goes into a folder labelled *Invoices*, *Contracts* or *Letters* can answer "show me all contracts from March" in seconds. Conventional Commits label every change so machines and people can find, group and count them.

## team | Making conventions stick

- Agree on the types in `CONTRIBUTING.md`.
- With **squash merging**, only the PR title becomes the commit on main, so enforce the convention on **PR titles**.
- Tools such as release-please or semantic-release generate changelogs and version bumps from these messages.
- Do not let the format replace a good description: `fix: bug` is still a bad message.

## traps | Convention traps

**Type soup.** "feat: fix typo and refactor cart and add tests" is several commits.

**Forgetting breaking changes.** Missing a `!` means users get a breaking change in a minor version.

**Over-scoping.** Scopes are optional; use them when they help.

## lab | Write a conventional history

Make a series of atomic commits on a small project, each with a correct Conventional Commit message, including one breaking change.
