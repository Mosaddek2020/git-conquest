## story | Deploy day used to be a ceremony

At Forecast, deploying was a ritual. Once a month, Samir blocked out a Friday afternoon, opened a long wiki page called *How to deploy*, and copied a build to the server by hand. Step 14 said "remember to set the token". One month he forgot step 9, and the site served last month's code with this month's database for two hours.

The team replaced the wiki page with two workflow files. Now every merge to `main` is tested and deployed to **staging** automatically, within minutes. When they want a release, they push a version tag like `v1.4.0`; the same pipeline tests that exact commit and deploys it to **production** after one person clicks **Approve**.

Deploying stopped being an event. They now ship several times a week, and nobody remembers what step 9 was.

## model | CI, continuous delivery, continuous deployment

Three ideas that build on each other:

| Practice | What it means | Who decides to release |
|---|---|---|
| **Continuous integration (CI)** | Every change is merged often and tested automatically | Nobody releases anything yet |
| **Continuous delivery** | Every change that passes is *ready* to release, and releasing is one safe, automated step | A person (an approval, a tag) |
| **Continuous deployment** | Every change that passes goes to production automatically | Nobody: the pipeline does |

A **pipeline** is the chain of automated stages a change goes through: build, test, deploy to a test environment, deploy to production.

An **environment** is a place your app runs, like `staging` (a production-like copy for checking) and `production` (what real users see). On GitHub, an environment can have **protection rules**: required reviewers who must approve, and limits on which branches or tags may deploy to it.

```diagram
cd-pipeline
```

The golden rule of pipelines: **build once, deploy many**. The commit that passed the tests is the commit that is deployed, first to staging, then to production. Nothing is rebuilt by hand in between.

## model | Anatomy of a deploy workflow

```yaml
name: Deploy
on:
  push:
    branches: [main]          # only main, not every branch
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
  deploy-staging:
    needs: test               # wait for test, and skip if it fails
    environment: staging      # shows up under Environments, can be protected
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/deploy.sh staging
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
```

The pieces that turn CI into CD:

- **`needs:`** orders jobs. Without it, jobs run in parallel, so you could deploy code whose tests are still running (or failing).
- **`environment:`** ties a job to an environment and its protection rules. A job targeting a protected environment **pauses** until a reviewer approves.
- **Secrets are opt-in per step.** `${{ secrets.DEPLOY_TOKEN }}` is only available where you pass it. A secret that does not exist becomes an empty string, so the deploy fails with "unauthorized".
- **Triggers choose the stage.** `branches: [main]` for staging; `tags: ['v*']` for production releases; `workflow_dispatch` lets you start a workflow by hand (and choose which ref to run it on).
- **`if:`** adds conditions, for example `if: github.ref == 'refs/heads/main'`.

## commands | Driving deployments from the terminal

```term
$ gh secret set DEPLOY_TOKEN --body "…"     # store the credential the pipeline needs
$ gh run list --workflow=deploy.yml         # runs of one workflow
$ gh run view                               # jobs, logs, and "waiting for approval"
$ gh run rerun 4 --failed                   # re-run only the failed jobs of run #4
$ git tag -a v1.1.0 -m "Forecast 1.1.0"     # mark a release
$ git push origin v1.1.0                    # pushing the tag starts the release workflow
$ gh workflow run release.yml --ref v1.1.0  # start a workflow by hand (needs workflow_dispatch)
$ curl https://forecast.example/health      # ask the live app what version it is running
```

Approving a deployment happens on the run's page on GitHub (**Review deployments → Approve and deploy**). In Git Conquest, that button is in the GitHub tab.

## analogy | A restaurant kitchen pass

In a good restaurant kitchen, a dish is cooked (build), tasted by the chef at the pass (tests), and only then carried to the dining room (production). The pass is not optional and the waiter never re-cooks the dish on the way.

Staging is the family meal the staff eat before service: same kitchen, same recipes, but if something is off, only the team notices. The approval is the head chef saying "service" before the first plate goes out.

## team | How real teams ship

- **Staging mirrors production** as closely as possible: same build, same configuration shape, different data and secrets.
- **Version tags mark releases** (`v1.4.0`), so "what is in production?" always has a precise answer, and release notes come for free.
- **Small, frequent deploys** are safer than big, rare ones: less changes at once, so less can go wrong and it is easier to find what did.
- **Health endpoints** (`/health`) report the running version and commit. Pipelines and monitoring call them after every deploy.
- **Measure delivery**: the four DORA metrics are deployment frequency, lead time for changes, change failure rate and time to restore service. Good pipelines improve all four.
- **Preview environments** deploy each pull request to its own temporary URL, so reviewers can click through a change before it merges.

## traps | Pipeline traps

**Jobs without `needs:`.** The deploy job starts at the same time as the tests and ships code that is about to fail.

**Hard-coding credentials** in the workflow or the deploy script. Use secrets, and pass them only to the step that needs them.

**Rebuilding for production.** If production gets a fresh build from a different machine or a later commit, you are deploying something nobody tested.

**Deploying from laptops.** "It works on my machine, so I deployed from my machine" bypasses every check the pipeline gives you.

**Unprotected production.** If any branch can deploy to production, eventually a half-finished branch will.

## lab | Build Forecast's pipeline

Forecast (`you/forecast`) already has CI. Production runs **v1.0.0**, deployed by hand months ago. Your job is to build the delivery pipeline: automatic deploys of `main` to **staging**, and approved, tag-driven releases to **production**.

The hosting provider's script is already in the repo: `./scripts/deploy.sh <environment>`. It needs the token `dt_forecast_42` in the `DEPLOY_TOKEN` environment variable. Production is a protected environment: you are its required reviewer.
