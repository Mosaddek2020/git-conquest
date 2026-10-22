## story | Three teams, three workflows

At one conference, three engineers compared notes:

- **Sofia** builds a mobile banking app. Releases go through app-store review and customers run several versions at once. Her team uses **git flow**: a `develop` branch, release branches, hotfix branches, and tags for every version.
- **Arjun** works on a large web platform with hundreds of engineers. They use **trunk-based development**: everyone merges tiny changes into `main` at least daily, with unfinished work hidden behind feature flags.
- **Mia** is in a ten-person web team using **GitHub flow**.

Each workflow was right for its context. The skill is knowing the trade-offs.

## model | Git flow

```diagram
git-flow
```

| Branch | Lives | Purpose |
|---|---|---|
| `main` | forever | released code only; every merge is tagged (v1.2.0) |
| `develop` | forever | integration of finished features |
| `feature/*` | days–weeks | branch from develop, merge back to develop |
| `release/*` | days | from develop; only fixes; merges into main **and** develop |
| `hotfix/*` | hours | from main; urgent fix; merges into main **and** develop |

Strength: clear, versioned releases and support for maintenance. Cost: many branches, many merges, slower integration.

## model | Trunk-based development

```diagram
trunk-based
```

- One trunk (`main`). Branches, if any, live for hours.
- Everyone integrates at least daily, so merges stay tiny.
- **Feature flags** hide incomplete work in production.
- Requires excellent automated tests and fast CI.
- Releases are cut from the trunk (sometimes with short release branches).

## commands | Git flow in practice

```term
$ git switch -c feature/statements develop
$ ...commits...
$ git switch develop && git merge --no-ff feature/statements
$ git switch -c release/2.1 develop        # stabilise
$ git switch main && git merge --no-ff release/2.1 && git tag -a v2.1.0 -m "Release 2.1.0"
$ git switch develop && git merge --no-ff release/2.1
$ git switch -c hotfix/2.1.1 main          # urgent fix on production
```

## analogy | Choosing a road network

Git flow is a city with ring roads, bypasses and service lanes: excellent for complex traffic, but more junctions. Trunk-based development is a single, very well-maintained motorway that everyone merges onto constantly, which only works if everyone drives carefully (tests) and there are emergency lanes (flags). GitHub flow is a small town's main street with short side roads.

## team | Choosing

| Situation | Good fit |
|---|---|
| Web app, deploys continuously, small/medium team | GitHub flow |
| Very large team, strong CI culture, continuous deploy | Trunk-based |
| Versioned products, several versions supported, scheduled releases | Git flow (or a lighter release-branch model) |

Whatever you choose: write it down in `CONTRIBUTING.md`, protect the important branches, and automate the checks.

## traps | Workflow traps

**Adopting git flow by default** for a web app that deploys daily: lots of ceremony, little benefit.

**"Trunk-based" without tests or flags**: broken production.

**Forgetting to merge release/hotfix branches back into develop** in git flow: the fix disappears in the next release.

## lab | Ship a release and a hotfix, git-flow style

A product team uses git flow. Finish a feature into develop, cut a release, tag it, and then handle an urgent hotfix so that both main and develop get it.
