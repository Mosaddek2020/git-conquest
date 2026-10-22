## story | The commit that would have leaked a key

Kenji's team had leaked an API key twice in a year. Each time, someone committed a `.env`-style line by accident. They added a tiny **pre-commit hook**: a script git runs before every commit, which refuses the commit if the staged changes contain something that looks like a secret.

```term
$ git commit -m "Add payment client"
Blocked: staged changes contain an API key.
```

The third leak never happened.

## model | Scripts at key moments

**Hooks** are executable scripts in `.git/hooks/` that git runs at specific moments. If a "pre-" hook exits with a non-zero code, git aborts the operation.

| Hook | Runs | Typical use |
|---|---|---|
| `pre-commit` | before a commit is created | lint, format check, secret scan, tests |
| `prepare-commit-msg` | before the editor opens | prefill a template or ticket number |
| `commit-msg` | after you write the message | enforce Conventional Commits |
| `pre-push` | before a push | run the test suite |
| `post-merge`, `post-checkout` | after those operations | reinstall dependencies |

A hook is just a program: shell, Python, Node, anything executable. It must be **executable** (`chmod +x`), and it is **not** committed with the repository (`.git/` is never shared). Teams share hooks through tools like **husky**, **lefthook** or **pre-commit**, or with `git config core.hooksPath .githooks` pointing at a committed folder.

## commands | Writing a pre-commit hook

Put this in `.git/hooks/pre-commit`:

```text
#!/bin/sh
if git diff --cached | grep -q "API_KEY"; then
  echo "Blocked: staged changes contain an API key."
  exit 1
fi
```

Then make it executable and commit as usual:

```term
$ chmod +x .git/hooks/pre-commit
$ git commit -m "Add payment client"      # the hook runs first
$ git commit --no-verify -m "…"           # skip hooks (use rarely, and knowingly)
```

In this simulator, write hooks with `edit .git/hooks/pre-commit`. The shell supports `if … then … fi`, `grep -q`, `echo`, pipes and `exit`.

A **commit-msg** hook receives the path of the message file as `$1`:

```text
#!/bin/sh
if ! grep -qE "^(feat|fix|docs|chore|refactor|test)(\(.+\))?: " "$1"; then
  echo "Use a Conventional Commit message, e.g. 'fix: handle empty carts'."
  exit 1
fi
```

## analogy | The bouncer checks bags

`.gitignore` is the guest list. Hooks are the bouncer who also checks bags: before a commit is allowed in, the bouncer looks inside and turns away anything dangerous.

## team | Hooks and CI together

Local hooks give **fast feedback** but can be skipped (`--no-verify`) or simply not installed. CI checks on pull requests are the **enforcement**. Use both: hooks to catch problems in seconds, CI so nothing slips through.

## traps | Hook traps

**Forgetting `chmod +x`.** Git ignores non-executable hooks (and real git prints a hint).

**Slow hooks.** A three-minute pre-commit hook teaches people to use `--no-verify`. Keep pre-commit fast; run the full suite in pre-push or CI.

**Assuming hooks are shared.** They are not, unless you use a tool or `core.hooksPath`.

## lab | Guard the repository

Add a pre-commit hook that blocks leftover `console.log` debugging, and a commit-msg hook that enforces Conventional Commits. Watch them block a bad commit, then make a good one.
