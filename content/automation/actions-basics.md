## story | The robot that never forgets

Every developer at a small agency was supposed to run the tests before pushing. Most of the time, most of them did. Twice a month, someone forgot, and a broken build reached the client.

They added a twelve-line file to the repository: a **GitHub Actions workflow**. From then on, GitHub itself ran the tests on every push and every pull request, on a fresh machine, and showed a green check or a red cross next to each commit. Nobody had to remember anything.

## model | Workflows, jobs, steps

```diagram
ci-pipeline
```

A **workflow** is a YAML file in `.github/workflows/`. It contains:

| Part | Meaning |
|---|---|
| `name:` | what to call it in the UI |
| `on:` | which **events** trigger it: `push`, `pull_request`, `schedule`, `workflow_dispatch` (manual), `release`… |
| `jobs:` | one or more jobs; by default they run **in parallel** on separate machines |
| `runs-on:` | the machine type: `ubuntu-latest`, `windows-latest`, `macos-latest` |
| `steps:` | the steps of a job, in order: `uses:` runs a reusable **action**, `run:` runs shell commands |

A typical CI workflow for a Node.js project:

```text
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
```

`actions/checkout` puts your repository's code on the runner. Each `run:` step that exits non-zero fails the job, and a failed job marks the workflow (and the commit or PR check) as failed.

## commands | Working with Actions

```term
$ mkdir -p .github/workflows
$ edit .github/workflows/ci.yml        # write the workflow
$ git add .github/workflows/ci.yml && git commit -m "ci: run tests on every push"
$ git push                             # the push triggers the workflow
$ gh run list                          # recent runs and their status
$ gh run view                          # the latest run's jobs and logs
$ gh run view 42 --log-failed          # (real gh) only the failing step's log
$ gh workflow run ci.yml               # (real gh) trigger a workflow_dispatch workflow
```

In this simulator, runs finish instantly. `npm test` and `npm run lint` are simulated: the lesson or lab tells you what they check.

## analogy | A factory inspection line

Every product (commit) that leaves the workbench goes down the same inspection line: unpack it (checkout), install the parts (npm ci), run the checks (tests, lint). A green tag means it passed every station. The line never gets tired, never skips a station, and never forgets.

## team | What teams automate

- **CI**: tests, linting, type checks, builds on every PR.
- **CD**: deploying `main` to production after CI passes.
- **Releases**: building and publishing packages when a `v*` tag is pushed.
- **Housekeeping**: labelling PRs, closing stale issues, nightly scheduled jobs.
- The **GitHub Marketplace** has thousands of reusable actions. Pin them to a version (`@v4`) and prefer well-known publishers.

## traps | Workflow traps

**YAML indentation.** Spaces only, and nesting matters. Most "workflow not running" mysteries are indentation or a wrong `on:` block.

**Wrong folder.** It must be exactly `.github/workflows/`, with a `.yml` or `.yaml` extension.

**Secrets in workflow files.** Never. Use encrypted **secrets** (`${{ secrets.NAME }}`), covered two lessons ahead.

**Untrusted code with secrets.** Workflows triggered by pull requests from forks do not get your secrets, for good reason.

## lab | Your first workflow

Add a CI workflow to a small Node.js app, watch it run, break it with a lint error, and fix it again.
