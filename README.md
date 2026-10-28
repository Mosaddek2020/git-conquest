# Git Conquest

**Live:** https://mosaddek2020.github.io/git-conquest/

A self-paced, mastery-based course that takes a new developer from zero to hero in Git and GitHub.

Each lesson teaches one idea from several angles (a story, an analogy, the mental model, the commands, how real teams use it, traps and tips), then drills it in a **hands-on lab** inside a git simulator that runs in the browser, then asks the learner to **prove** it in a quiz. The next lesson unlocks only when the current one is mastered (lab done, 80% on the quiz). Experienced developers can test out of a realm with a 90% exam.

- 13 realms, 72 lessons, 72 labs, 460 quiz questions
- A real git engine in `js/git/`: actual SHA-1 object ids, index, merges and conflicts, rebase and `rebase -i`, cherry-pick, revert, stash, reflog, bisect, tags, worktrees, hooks, remotes, plus a simulated GitHub (forks, PRs, reviews, branch protection, issues, releases, Actions, secrets) and the `gh` CLI
- A 3D world map (three.js) of the curriculum drawn as a commit graph, a sandbox, a searchable Field Guide, ranks, badges and a spaced-review deck

## Layout

| Path | What |
|---|---|
| `index.html`, `css/app.css` | page shell and design system |
| `js/git/` | the simulator: `world` (objects, filesystem), `core` (refs, status, merges), `git` (porcelain), `remote` (clone/fetch/push/pull), `github` (GitHub + `gh`), `shell` |
| `js/ui/`, `js/views/` | terminal, commit graph, panels, quiz, replays, diagrams, pages |
| `content/<realm>/<lesson>.md` | lesson text; `## <lens> \| Title` headings split it into perspectives, `## lab \| Title` is the lab brief |
| `js/content/rNN-*.js` | each realm's labs (setup, tasks with checks and hints) and quizzes |
| `tools/` | `build-content.mjs` bundles Markdown into `js/content/text.js`; `build.mjs` builds `dist/` |
| `tests/` | `modules.mjs` (every module loads), `labs.mjs` (every lab solvable, no task passes early), `quizzes.mjs`, `replays.mjs` |

## Working on it

```sh
node tools/build-content.mjs   # after editing any .md in content/
node tests/labs.mjs            # all labs solvable from their reference solutions
node tests/quizzes.mjs         # question structure and typed answers
node tests/replays.mjs         # every lesson replay runs
node tools/build.mjs           # dist/ for any static web server
```

There is no backend. Progress is stored in the browser's localStorage.

Every push to `main` runs the tests, builds `dist/` and deploys it to GitHub Pages (`.github/workflows/pages.yml`).
