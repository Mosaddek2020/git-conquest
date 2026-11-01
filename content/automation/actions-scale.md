## story | Six copies of the same deploy job

The weather team had grown to six services, each with its own `deploy-staging.yml` and `release.yml`, each a copy of a copy. When the hosting provider changed its upload command, someone had to edit twelve files, and missed two.

Their CI had the opposite problem: it tested on one Node version, the one on the lead's laptop. A user on Node 18 reported a crash the tests had never seen.

Two Actions features fix both: a **matrix** runs one job across many versions, and **reusable workflows** let every service call one shared deploy workflow. The **API** (`gh api`) lets scripts and dashboards ask how it all went.

## model | Fan out, share, query

```diagram
actions-matrix
```

- **Matrix**: `strategy.matrix` lists values; Actions runs the job once per combination and passes the values as `${{ matrix.<name> }}`. With **fail-fast** (on by default) the first failure cancels the rest; `fail-fast: false` shows every result. `include` and `exclude` add or remove specific combinations.
- **Reusable workflow**: a workflow with `on: workflow_call` declares its `inputs` and `secrets`. A caller uses it as a **job**: `uses: ./.github/workflows/deploy.yml` (same repository) or `org/shared/.github/workflows/deploy.yml@v1` (another one), with `with:` and `secrets:` (or `secrets: inherit`).
- **`gh api`**: authenticated calls to the GitHub REST API. `{owner}` and `{repo}` are filled in from the current repository; `--jq` picks fields out of the JSON.

```replay
title: One job, three Node versions
show: graph
setup: github you/weather; gh auth login; git clone -q https://github.com/you/weather.git; cd weather
step: mkdir -p .github/workflows && printf "on: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n    strategy:\n      matrix:\n        node: [20, 22, 24]\n    steps:\n      - run: npm test\n" > .github/workflows/ci.yml && git add .github && git commit -qm "ci: test on three Node versions" && git push -q | strategy.matrix lists the values; the job runs once per combination.
step: gh run view | Three jobs from one definition: test (20), test (22) and test (24).
```

## commands | The building blocks

A matrix:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: npm test
```

A reusable workflow, `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
    secrets:
      DEPLOY_TOKEN:
        required: true
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/deploy.sh ${{ inputs.environment }}
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
```

…and a caller:

```yaml
jobs:
  deploy:
    uses: ./.github/workflows/deploy.yml
    with:
      environment: staging
    secrets: inherit
```

Asking the API:

```term
$ gh api repos/{owner}/{repo}/actions/runs --jq '.workflow_runs[] | {name, conclusion}'
$ gh api repos/{owner}/{repo}/actions/runs --jq '.workflow_runs[0].conclusion'
$ gh api repos/{owner}/{repo}/pulls --jq '.[] | "\(.number) \(.title)"'
$ gh api repos/{owner}/{repo}/branches --jq 'map(select(.protected)) | length'
```

## analogy | A recipe card and a test kitchen

The matrix is a test kitchen cooking one recipe on gas, induction and a camping stove at the same time. The reusable workflow is the recipe card pinned in one place: every restaurant in the chain cooks from it, so changing the card changes every kitchen.

## team | Scaling Actions in an organisation

- Keep shared workflows in one repository (often `org/.github` or `org/workflows`) and **pin callers to a tag** (`@v1`), so a change rolls out on purpose.
- Test the versions you **support**, not every version that exists; drop end-of-life runtimes from the matrix and from `engines`.
- Use `fail-fast: false` on release branches, where seeing every failing combination matters more than saving minutes.
- `gh api` plus `--jq` is the quickest way to build reports: failing runs this week, PRs waiting for review, unprotected branches.

## traps | Actions-at-scale traps

**Assuming secrets flow into called workflows.** They do not, unless you pass them or say `secrets: inherit`.

**`runs-on` or `steps` on a calling job.** A job that `uses:` a workflow has neither; the called workflow defines them.

**Huge matrices.** Three OSes × four versions × two databases is 24 jobs per push. Use `include` for the combinations you really need.

**Reading `${{ matrix.x }}` outside a matrix job.** It is empty there, and the step quietly does the wrong thing.

## lab | Weather, at scale

In `~/weather`, CI tests on one Node version and the staging deploy repeats its steps inline. Add a Node matrix (and find out what it catches), drop the end-of-life version, move the deploy into a reusable workflow that staging calls, and check the results through the API.
