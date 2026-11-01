// Realm 16 · Hero Trials: disaster recovery, five outcome-based trials and the final boss.

import { todoPlan } from './r05-rewriting.js';
import { revList, configGet, mailmapFor } from '../git/core.js';
import { reachableObjects, isArchive, parseArchive } from '../git/everyday.js';

const CI_YML = 'name: CI\non:\n  push:\n    branches: [main]\n  pull_request:\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm ci\n      - run: npm test\n';
const PRIYA = { name: 'Priya Sharma', email: 'priya@example.com' };

// every file version in the history of the given commits
const blobsOf = (world, tips) => revList(world, tips.filter(Boolean)).flatMap(h => [...world.readTreeFlat(world.commit(h).tree).values()].map(b => world.objects.get(b).content));
const allTipsOf = repo => Object.entries(repo.refs).filter(([r]) => r.startsWith('refs/heads/') || r.startsWith('refs/tags/')).map(([, h]) => repo.world.peel(h));

// Build a commit directly in a bare repository (used to stage incidents).
function bareCommit(world, bare, { parents, files, remove = [], message, author = PRIYA }) {
  const flat = parents[0] ? world.readTreeFlat(world.commit(parents[0]).tree) : new Map();
  if (parents[1]) for (const [p, h] of world.readTreeFlat(world.commit(parents[1]).tree)) if (!flat.has(p)) flat.set(p, h);
  for (const [p, c] of Object.entries(files || {})) flat.set(p, world.writeBlob(c));
  for (const p of remove) flat.delete(p);
  world.tick(9);
  const sig = { ...author, time: world.time };
  return world.writeCommit({ tree: world.writeTree(flat), parents, message, author: sig, committer: sig });
}

// ---------- stack and clean-house trial fixtures ----------

const STACK = ['entries', 'balances', 'statements'];
const ENTRY = 'export class Entry {\n  constructor(label, cents) {\n    this.label = label;\n    this.cents = cents;\n  }\n}\n';
const ENTRY_VALID = 'export class Entry {\n  constructor(label, cents) {\n    validate(cents);\n    this.label = label;\n    this.cents = cents;\n  }\n}\n\nfunction validate(cents) {\n  if (!Number.isInteger(cents)) throw new TypeError("cents must be an integer");\n}\n';
const stackOn = (t, base) => { const [e, b, s] = STACK.map(x => t.ref(x)); if (!e || !b || !s) return false; const p = h => t.world.commit(h).parents[0]; return p(s) === b && p(b) === e && p(e) === t.ref(base); };
const CSS_V1 = 'h1 { color: #333; }\nh2 { color: #555; }\nbody { margin: 0; }\n';
const CSS_V2 = 'h1 { color: #111; }\nh2 { color: #333; }\nbody { margin: 0; }\n';
const CSS_FMT = 'h1 {\n  color: #111;\n}\nh2 {\n  color: #333;\n}\nbody {\n  margin: 0;\n}\n';
// assembled at run time so the repository holds no secret-shaped strings
const ENV_LEAK = 'SMTP_PASSWORD=' + ['hb', 'live', '7Qm2Zr9'].join('_') + '\n';

export default {
  id: 'hero-trials',
  n: 16,
  title: 'Hero Trials',
  tagline: 'Rescue any situation, then prove everything in the final trial',
  badge: 'Git Hero',
  intro: 'The last realm. First, a **rescue playbook** that turns "I broke git" into a calm, five-minute fix. Then five **trials** that state the outcome and leave the commands to you: run a release as the **maintainer**, land a contribution as an **outside contributor**, perform **history surgery** on a leaked key without losing a teammate\'s work, **ship a stack** of three PRs through review, and **clean house** (identities, blame, a leak, a release archive). Finally, **The Conquest**: one long, realistic day that uses everything you learned.',
  lessons: [
    {
      id: 'rescue-playbook',
      title: 'The rescue playbook',
      summary: 'Five classic disasters and the calm, correct fix for each.',
      minutes: 25,
      lab: {
        cwd: '~/orbit',
        panels: ['graph', 'github', 'areas'],
        setup(H) {
          const w = H.world;
          const bare = w.createRemoteRepo('acme', 'orbit', { collaborators: ['you'] });
          const m1 = bareCommit(w, bare, { parents: [], files: { 'status.js': 'export const status = "up";\n' }, message: 'Create Orbit' });
          const r1 = bareCommit(w, bare, { parents: [m1], files: { 'release.txt': '1.0\n' }, message: 'Prepare release 1.0' });
          const r2 = bareCommit(w, bare, { parents: [r1], files: { 'release.txt': '1.0.1\n', 'fix1.js': 'x\n' }, message: 'Fix release crash' });
          const r3 = bareCommit(w, bare, { parents: [r2], files: { 'release.txt': '1.0.2\n', 'fix2.js': 'y\n' }, message: 'Fix release timezone bug' });
          const exp = bareCommit(w, bare, { parents: [m1], files: { 'experiment.js': 'export const risky = true;\n' }, message: 'Experiment: new status engine' });
          const m2 = bareCommit(w, bare, { parents: [m1], files: { 'README.md': '# Orbit\n' }, message: 'Add README' });
          const merge = bareCommit(w, bare, { parents: [m2, exp], files: {}, message: "Merge branch 'experiment'" });
          bare.refs['refs/heads/main'] = merge;
          bare.refs['refs/heads/release'] = r3;
          H.cd('~');
          H.run('git clone -q https://github.com/acme/orbit.git');
          H.cd('~/orbit');
          H.run('git switch -q release');
          H.run('git switch -q main');
          // incident 4: a commit made on a detached HEAD, then abandoned
          H.run(`git switch -q --detach ${m2.slice(0, 7)}`);
          const orphan = H.commit('Prototype status colours', { 'colours.js': 'export const up = "green";\n' });
          H.run('git switch -q main');
          // incident 1 + 5: two commits on main that belong on a feature branch; the second includes debug.log
          const c1 = H.commit('Add uptime chart', { 'chart.js': 'export const chart = {};\n' });
          const c2 = H.commit('Add chart legend', { 'legend.js': 'export const legend = {};\n', 'debug.log': 'lots of debug output\n' });
          // incident 3: a teammate force-pushes release back to an old commit
          bare.refs['refs/heads/release'] = r1;
          w.labData = { merge, r3, orphan, c1, c2, originMain: merge };
        },
        suggestions: ['git status', 'git log --oneline --graph --all', 'git reflog'],
        tasks: [
          { title: 'Look before you touch anything: status, a graph of all branches, and the reflog', solution: 'git status && git log --oneline --graph --all && git reflog', check: t => t.ran(/git status/) && t.ran(/git log\b.*--all/) && t.ran(/git reflog/) },
          { title: 'Incident 1: your last two commits on main belong on a new branch feature/charts. Move them, and put main back to origin/main.', solution: 'git branch feature/charts && git reset --hard origin/main', check: t => { const fc = t.ref('feature/charts'); return !!fc && t.isAncestor(t.world.labData.c1, fc) && t.ref('main') === t.world.labData.originMain; } },
          { title: 'Incident 2: debug.log was committed in the newest feature/charts commit. Remove it from that commit but keep the file on disk.', solution: 'git switch feature/charts && git rm --cached debug.log && git commit --amend --no-edit', check: t => { const fc = t.ref('feature/charts'); return !!fc && !t.fileAt('feature/charts', 'debug.log') && !!t.fileAt('feature/charts', 'legend.js') && t.isAncestor(t.world.labData.c1, fc) && t.exists('~/orbit/debug.log'); } },
          { title: 'Incident 3: a prototype commit made on a detached HEAD was abandoned. Recover it as branch prototype/colours.', solution: 'git reflog → git branch prototype/colours <id>', test: [t => `git branch prototype/colours ${t.world.labData.orphan.slice(0, 7)}`], check: t => t.ref('prototype/colours') === t.world.labData.orphan },
          { title: "Incident 4: the experimental merge on main is already shared. Undo it safely and push.", solution: 'git switch main && git revert -m 1 --no-edit HEAD && git push', check: t => { const b = t.remote('acme/orbit'); const tip = b.refs['refs/heads/main']; const flat = t.world.readTreeFlat(t.world.commit(tip).tree); return /^Revert "Merge/.test(t.world.commit(tip).message) && !flat.has('experiment.js') && t.isAncestor(t.world.labData.merge, tip); } },
          { title: 'Incident 5: someone force-pushed release on GitHub back to an old commit. Your local release still has the lost commits. Restore it.', hint: 'Fetch to see the forced update, check your local release, then push it.', solution: 'git fetch && git switch release && git push origin release', check: t => t.remoteRef('acme/orbit', 'release') === t.world.labData.r3 },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What should you always do first when "git is broken"?', choices: ['rm -rf .git and re-clone', 'Look: git status, git log --oneline --graph --all, git reflog', 'git push --force', 'git reset --hard'], answer: 1, explain: 'Understand the state before changing it.' },
        { type: 'mc', q: 'Which two questions choose the right rescue?', choices: ['Who did it and when?', 'Is it committed? Is it shared?', 'Is it Friday? Is it main?', 'Is it big? Is it old?'], answer: 1, explain: 'Committed → recoverable. Shared → only add history.' },
        { type: 'mc', q: 'A teammate force-pushed and wiped two commits from GitHub\'s main. You still have them locally. What restores them?', choices: ['Nothing can', 'Pushing your local branch (it contains the lost commits)', 'GitHub support only', 'git revert'], answer: 1, explain: 'Every clone is a backup.' },
        { type: 'type', q: 'Type the command that creates a backup branch named `backup` at the current commit before a risky fix.', accept: ['git branch backup'], model: 'git branch backup', explain: 'Cheap insurance.' },
        { type: 'mc', q: 'A bad merge commit is on shared main. How do you undo it?', choices: ['git reset --hard HEAD~1 && git push --force', 'git revert -m 1 <merge>', 'git branch -D main', 'git commit --amend'], answer: 1, explain: '-m 1 keeps main\'s side.' },
        { type: 'multi', q: 'Which of these can the reflog help recover?', choices: ['Commits lost after reset --hard', 'A deleted branch', 'Commits made on a detached HEAD', 'Edits that were never committed'], answer: [0, 1, 2], explain: 'Only committed work.' },
        { type: 'mc', q: 'You committed a password and already pushed. What comes first?', choices: ['Rewrite history', 'Rotate (change) the password', 'Make the repo private', 'Delete the file'], answer: 1, explain: 'Assume it is compromised.' },
      ],
    },
    {
      id: 'release-captain',
      title: 'Trial: release captain',
      summary: "Review a fork's pull request, merge it, credit the contributor and ship a signed release.",
      minutes: 30,
      boss: true,
      lab: {
        cwd: '~/beacon',
        panels: ['github', 'graph', 'files'],
        setup(H) {
          const w = H.world;
          w.testRule = files => /2 \*\* attempt/.test(files['src/retry.js'] || '') ? { ok: true, log: ['PASS retry.test.js', '  ✓ waits 100, 200, 400 ms'] } : { ok: false, log: ['FAIL retry.test.js', '  ✕ expected a growing delay, got 0 ms'] };
          H.remote('beacon', 'beacon', [{ message: 'Beacon 1.4.0', files: { 'src/retry.js': 'export const delay = attempt => 0; // TODO: back off\n', '.github/workflows/ci.yml': CI_YML, 'package.json': '{ "name": "beacon", "version": "1.4.0" }\n', 'CHANGELOG.md': '## 1.4.0\n- First public release\n' } }], { collaborators: ['you'] });
          H.tagRemote('beacon/beacon', 'v1.4.0');
          H.issue('beacon/beacon', { title: 'Retries hammer the server', body: 'There is no delay between retries.', author: 'sam' });
          const up = H.bare('beacon/beacon');
          const fork = w.createRemoteRepo('jules', 'beacon', { forkOf: up.meta.url });
          fork.refs = { ...up.refs };
          fork.refs['refs/heads/fix-retry'] = up.refs['refs/heads/main'];
          H.teammate('jules/beacon', { branch: 'fix-retry', files: { 'src/retry.js': 'export const delay = attempt => 100 * 2 ** attempt;\n', 'tests/retry.test.js': 'expect([0, 1, 2].map(delay)).toEqual([100, 200, 400]);\n' }, message: 'Retry with exponential backoff', author: { name: 'Jules Moreau', email: 'jules@example.net' } });
          H.pr('beacon/beacon', { title: 'Retry with exponential backoff', head: 'fix-retry', headRepo: fork.meta.url, author: 'jules', body: 'Fixes #1. The delay doubles on each attempt: 100, 200, 400 ms.' });
          H.cd('~');
          H.run('git clone -q https://github.com/beacon/beacon.git');
          H.cd('~/beacon');
        },
        suggestions: ['gh pr list', 'gh pr view 2'],
        tasks: [
          { title: 'Review PR #2: the description, the diff and the checks', solution: 'gh pr view 2 && gh pr diff 2 && gh pr checks 2', check: t => t.ran(/gh pr diff 2\b/) && t.ran(/gh pr checks 2\b/) },
          { title: 'Try it on your machine before approving', solution: 'gh pr checkout 2 && npm test', check: t => t.ran(/gh pr checkout 2\b/) && t.ran(/npm (run )?test/) },
          { title: 'Approve it', solution: 'gh pr review 2 --approve --body "Tested locally. Thanks, Jules!"', check: t => t.remote('beacon/beacon').meta.prs[0].reviews.some(r => r.author === 'you' && r.state === 'APPROVED') },
          { title: 'Merge it as one commit, so issue #1 closes itself', solution: 'gh pr merge 2 --squash', check: t => { const b = t.remote('beacon/beacon'); return b.meta.prs[0].state === 'merged' && b.meta.prs[0].mergeMethod === 'squash' && b.meta.issues[0].state === 'closed'; } },
          { title: 'Update your main and credit Jules in CHANGELOG.md under 1.5.0', solution: 'git switch main && git pull, add a "## 1.5.0" entry thanking @jules, commit', test: ['git switch main && git pull', { cmd: 'edit CHANGELOG.md', edit: '## 1.5.0\n- Retry with exponential backoff (#1), thanks @jules\n\n## 1.4.0\n- First public release\n' }, 'git commit -am "docs: changelog for 1.5.0"'], check: t => { const c = t.headFile('CHANGELOG.md') || ''; return t.branch() === 'main' && /1\.5\.0/.test(c) && /jules/i.test(c) && t.isAncestor(t.remote('beacon/beacon').meta.prs[0].mergedAs, t.headHash()); } },
          { title: 'Tag v1.5.0, signed with an SSH key, and push main and the tag', solution: 'ssh-keygen -t ed25519 && git config --global gpg.format ssh && git config --global user.signingkey ~/.ssh/id_ed25519.pub && git tag -s v1.5.0 -m "Beacon 1.5.0" && git push origin main v1.5.0', check: t => { const b = t.remote('beacon/beacon'); const tag = b.refs['refs/tags/v1.5.0']; return !!tag && t.world.objects.get(tag).type === 'tag' && t.world.signatures.has(tag) && t.world.peel(tag) === b.refs['refs/heads/main'] && b.refs['refs/heads/main'] === t.ref('main'); } },
          { title: 'Publish the GitHub release with notes', solution: 'gh release create v1.5.0 --title "Beacon 1.5.0" --notes "Retry with exponential backoff (#1). Thanks @jules!"', check: t => t.remote('beacon/beacon').meta.releases.some(r => r.tag === 'v1.5.0' && /jules/i.test(r.notes || '')) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'A first-time contributor\'s PR is green. Why still check it out and test it locally?', choices: ['CI only runs what the workflow asks; you are checking it actually fixes the issue', 'GitHub requires it', 'To change the author', 'You cannot approve otherwise'], answer: 0, explain: 'Green CI is necessary, not sufficient.' },
        { type: 'mc', q: 'Which part of the PR made issue #1 close on merge?', choices: ['"Fixes #1" in the description', 'The branch name', 'The label', 'The squash'], answer: 0, explain: 'Closing keywords in the PR description or commit message.' },
        { type: 'type', q: 'Type the command that creates a signed, annotated tag v2.0.0 with the message "Release 2.0.0".', accept: ['git tag -s v2.0.0 -m "Release 2.0.0"'], model: 'git tag -s v2.0.0 -m "Release 2.0.0"', explain: '-s signs (and annotates) the tag.' },
        { type: 'tf', q: 'Squash-merging the contributor\'s PR removes their authorship.', answer: false, explain: 'GitHub keeps the PR author as the author of the squashed commit.' },
        { type: 'mc', q: 'Why credit contributors in the changelog?', choices: ['It thanks them publicly and encourages them to return', 'Git requires it', 'It closes issues', 'It signs the release'], answer: 0, explain: 'Healthy projects make contributors feel seen.' },
      ],
    },
    {
      id: 'upstream-contributor',
      title: 'Trial: upstream contributor',
      summary: 'Fork, fix with a sign-off, answer review with a fixup, rebase, update the PR and clean up.',
      minutes: 30,
      boss: true,
      lab: {
        cwd: '~',
        panels: ['github', 'graph', 'files'],
        setup(H) {
          const w = H.world;
          w.testRule = files => /n >= 10/.test(files['src/redirect.js'] || '') ? { ok: true, log: ['PASS redirect.test.js'] } : { ok: false, log: ['FAIL redirect.test.js', '  ✕ stops after 10 redirects (timed out)'] };
          H.remote('tinyhttp', 'tinyhttp', [{ message: 'tinyhttp 2.0', files: { 'src/redirect.js': 'export function follow(res, n = 0) {\n  return res.redirect ? follow(next(res), n + 1) : res;\n}\n', 'CONTRIBUTING.md': '# Contributing\n\n- Sign off every commit (git commit -s).\n- One commit per fix.\n', 'tests/basic.test.js': 'expect(get("/")).toBeOk();\n' } }]);
          w.labData = {};
        },
        events(ev, t) {
          const up = t.remote('tinyhttp/tinyhttp');
          if (ev.type === 'pr-created' && ev.url === up.meta.url && !t.world.labData.reviewed) {
            t.world.labData.reviewed = true;
            t.review('tinyhttp/tinyhttp', ev.number, 'CHANGES_REQUESTED', 'Thanks! Please add a test for the redirect limit.', 'mara');
            t.teammate('tinyhttp/tinyhttp', { message: 'docs: add an FAQ', files: { 'FAQ.md': '# FAQ\n' }, author: { name: 'Mara Lind', email: 'mara@tinyhttp.example' } });
            t.say('[GitHub] mara requested changes: "Thanks! Please add a test for the redirect limit."');
          }
          if (ev.type === 'pr-comment' && ev.url === up.meta.url && !t.world.labData.merged) {
            const pr = up.meta.prs.find(p => p.number === ev.number);
            const fork = t.world.remotes.get(pr.headRepo);
            const head = fork.refs['refs/heads/' + pr.head];
            const flat = t.world.readTreeFlat(t.world.commit(head).tree);
            const one = revList(t.world, [head], [up.refs['refs/heads/main']]).length === 1;
            if (flat.has('tests/redirect.test.js') && one && /Signed-off-by:/.test(t.world.commit(head).message)) {
              t.world.labData.merged = true;
              t.review('tinyhttp/tinyhttp', pr.number, 'APPROVED', 'Perfect, thank you!', 'mara');
              t.mergePR('tinyhttp/tinyhttp', pr.number, 'squash');
              t.say('[GitHub] mara approved and merged your pull request. Welcome, contributor!');
            }
          }
        },
        suggestions: ['gh repo fork tinyhttp/tinyhttp --clone'],
        tasks: [
          { title: 'Fork the project and clone your fork, with the original as upstream', solution: 'gh repo fork tinyhttp/tinyhttp --clone', check: t => !!t.repoAt('~/tinyhttp')?.config['remote.upstream.url'] },
          { title: 'Fix it on a topic branch, in one signed-off commit', detail: 'Stop following redirects after 10 hops: `if (n >= 10) throw new Error("too many redirects");`', solution: 'cd tinyhttp && git switch -c fix-redirect-loop, edit src/redirect.js, git commit -s -am "fix: stop following redirects after 10 hops"', test: ['cd tinyhttp && git switch -c fix-redirect-loop', { cmd: 'edit src/redirect.js', edit: 'export function follow(res, n = 0) {\n  if (n >= 10) throw new Error("too many redirects");\n  return res.redirect ? follow(next(res), n + 1) : res;\n}\n' }, 'git commit -s -am "fix: stop following redirects after 10 hops"'], check: t => { const r = t.repoAt('~/tinyhttp'); if (!r?.refs['refs/heads/fix-redirect-loop']) return false; const c = revList(t.world, [r.refs['refs/heads/fix-redirect-loop']], [r.refs['refs/remotes/upstream/main']]); return c.length === 1 && /Signed-off-by: Dev Learner/.test(t.world.commit(c[0]).message) && /n >= 10/.test(t.fileAt('fix-redirect-loop', 'src/redirect.js', r) || ''); } },
          { title: 'Push to your fork and open a pull request upstream', solution: 'git push -u origin fix-redirect-loop && gh pr create --fill', check: t => t.remote('tinyhttp/tinyhttp').meta.prs.some(p => p.author === 'you' && p.head === 'fix-redirect-loop') },
          { title: 'Mara asked for a test: add it as a fixup commit', solution: 'add tests/redirect.test.js, then git add tests && git commit --fixup HEAD', test: [{ cmd: 'edit tests/redirect.test.js', edit: 'expect(() => follow(loop)).toThrow("too many redirects");\n' }, 'git add tests && git commit --fixup HEAD'], check: t => /^fixup! fix: stop following redirects/.test(t.head()?.message || '') },
          { title: 'Upstream moved on: rebase onto it and fold the fixup in', hint: '`git fetch upstream`, then an interactive rebase with --autosquash.', solution: 'git fetch upstream && git rebase -i --autosquash upstream/main', test: ['git fetch upstream', { cmd: 'git rebase -i --autosquash upstream/main', edits: [x => x] }], check: t => { const r = t.repo; const c = revList(t.world, [t.headHash()], [t.ref('upstream/main')]); return !t.state() && c.length === 1 && /Signed-off-by: Dev Learner/.test(t.head().message) && !!t.headFile('tests/redirect.test.js') && !!t.headFile('FAQ.md') && !!r; } },
          { title: 'Update the pull request safely, and tell Mara what changed', hint: 'range-diff shows what changed since her review; paste a summary as a PR comment.', solution: 'git range-diff upstream/main origin/fix-redirect-loop fix-redirect-loop && git push --force-with-lease && gh pr comment 1 --body "v2: added a test for the redirect limit; rebased on main"', check: t => t.ran(/git range-diff/) && t.remote('tinyhttp/tinyhttp').meta.prs[0].comments.some(c => c.author === 'you') && t.remote('you/tinyhttp')?.refs['refs/heads/fix-redirect-loop'] === t.ref('fix-redirect-loop') },
          { title: "After the merge, sync your fork's main with upstream and delete your topic branch", solution: 'git switch main && git pull upstream main && git push origin main && git branch -D fix-redirect-loop', check: t => { const up = t.remote('tinyhttp/tinyhttp'); const fork = t.remote('you/tinyhttp'); return up.meta.prs[0].state === 'merged' && fork.refs['refs/heads/main'] === up.refs['refs/heads/main'] && !t.repoAt('~/tinyhttp').refs['refs/heads/fix-redirect-loop']; } },
        ],
      },
      quiz: [
        { type: 'mc', q: 'Where does your PR branch live when you contribute from a fork?', choices: ['On your fork (origin); the PR targets upstream', 'On upstream', 'Only on your laptop', 'In a gist'], answer: 0, explain: 'You push to the fork and ask upstream to pull.' },
        { type: 'type', q: 'Type the commit command that adds your Signed-off-by line and commits all tracked changes with the message "fix: typo".', accept: ['git commit -s -am "fix: typo"', 'git commit -sam "fix: typo"', 'git commit -a -s -m "fix: typo"', 'git commit --signoff -am "fix: typo"'], model: 'git commit -s -am "fix: typo"', explain: '-s adds Signed-off-by: Your Name <email>.' },
        { type: 'mc', q: 'Why `git commit --fixup HEAD` instead of a normal commit for review changes?', choices: ['autosquash folds it into the original commit later', 'It skips CI', 'It signs the commit', 'It notifies the reviewer'], answer: 0, explain: 'One commit per fix, as the project asked.' },
        { type: 'tf', q: 'After rebasing your PR branch, plain git push will update it.', answer: false, explain: 'The history changed; use git push --force-with-lease.' },
        { type: 'mc', q: 'Your PR was squash-merged. Why does `git branch -d fix-redirect-loop` refuse?', choices: ['The squashed commit is different, so git thinks the branch is unmerged; use -D', 'The branch is protected', 'You are on that branch', 'Upstream deleted it'], answer: 0, explain: 'Check the PR is merged, then delete with -D.' },
      ],
    },
    {
      id: 'history-surgeon',
      title: 'Trial: history surgeon',
      summary: 'A leaked key in every branch and tag, and a teammate\'s work in flight.',
      minutes: 35,
      boss: true,
      lab: {
        cwd: '~',
        panels: ['github', 'graph', 'files'],
        setup(H) {
          const w = H.world;
          const KEY = 'sk_' + 'live_' + '9TzQvault42Xk7Lm';
          H.remote('you', 'vault-api', [
            { message: 'Create vault API', files: { 'src/server.js': 'start()\n', 'config/settings.js': `export const stripeKey = "${KEY}";\n`, 'README.md': '# vault-api\n' } },
            { message: 'Add accounts endpoint', files: { 'src/accounts.js': 'accounts()\n' } },
          ], { collaborators: ['priya'] });
          H.tagRemote('you/vault-api', 'v1.0.0');
          const b = H.bare('you/vault-api');
          b.refs['refs/heads/release/1.x'] = b.refs['refs/heads/main'];
          H.teammate('you/vault-api', { branch: 'release/1.x', message: 'Release 1.0.1', files: { 'VERSION': '1.0.1\n' } });
          H.teammate('you/vault-api', { message: 'Read the Stripe key from the environment', files: { 'config/settings.js': 'export const stripeKey = process.env.STRIPE_KEY;\n' } });
          H.teammate('you/vault-api', { message: 'Add payouts', files: { 'src/payouts.js': 'payouts()\n' } });
          b.refs['refs/heads/feature/refunds'] = b.refs['refs/heads/main'];
          H.teammate('you/vault-api', { branch: 'feature/refunds', message: 'Refunds: model', files: { 'src/refunds.js': 'model()\n' }, author: PRIYA });
          H.teammate('you/vault-api', { branch: 'feature/refunds', message: 'Refunds: API', files: { 'src/refunds.js': 'model()\napi()\n' }, author: PRIYA });
          H.cd('~');
          H.run('git clone -q https://github.com/you/vault-api.git priya-vault');
          H.cd('~/priya-vault');
          H.run('git switch -q feature/refunds');
          H.commit('Refunds: email the customer', { 'src/refund-email.js': 'email()\n' }, { author: 'Priya Sharma <priya@example.com>' });
          H.cd('~');
          w.labData = { key: KEY };
          H.shell.extraCommands.vault = (args, out, sh) => {
            if (args[0] === 'rotate') { sh.world.labData.rotated = true; out.push('Revoked the leaked Stripe key. A new key is in the production secret store.'); return 0; }
            out.push('usage: vault rotate');
            return 1;
          };
        },
        suggestions: ['vault rotate'],
        tasks: [
          { title: 'Stop the bleeding: revoke the key', solution: 'vault rotate', check: t => !!t.world.labData.rotated },
          { title: 'In a fresh clone at ~/scrub, give every remote branch a local branch', hint: 'filter-repo rewrites local branches and tags only.', solution: 'git clone https://github.com/you/vault-api.git scrub && cd scrub && git branch release/1.x origin/release/1.x && git branch feature/refunds origin/feature/refunds', check: t => { const r = t.repoAt('~/scrub'); return !!r && ['main', 'release/1.x', 'feature/refunds'].every(x => r.refs['refs/heads/' + x]); } },
          { title: 'Replace the key with ***REMOVED*** in every commit of every branch and tag', solution: 'echo "<the key>==>***REMOVED***" > ~/leaked.txt && git filter-repo --replace-text ~/leaked.txt', test: [t => `echo "${t.world.labData.key}==>***REMOVED***" > ~/leaked.txt && git filter-repo --replace-text ~/leaked.txt`], check: t => { const r = t.repoAt('~/scrub'); return !!r && !blobsOf(t.world, allTipsOf(r)).some(c => typeof c === 'string' && c.includes(t.world.labData.key)) && ['main', 'release/1.x', 'feature/refunds'].every(x => r.refs['refs/heads/' + x]) && !!r.refs['refs/tags/v1.0.0']; } },
          { title: 'Push every branch and tag back', solution: 'git remote add origin https://github.com/you/vault-api.git && git push --force --all && git push --force --tags', check: t => { const b = t.remote('you/vault-api'); return !blobsOf(t.world, Object.values(b.refs).map(h => t.world.peel(h))).some(c => typeof c === 'string' && c.includes(t.world.labData.key)); } },
          { title: 'Turn on push protection', solution: 'gh repo edit --enable-secret-scanning --enable-secret-scanning-push-protection', check: t => !!t.remote('you/vault-api').meta.pushProtection },
          { title: "Move Priya's unpushed commit onto the rewritten feature/refunds, and push it", hint: 'In ~/priya-vault: fetch, then `git rebase --onto origin/feature/refunds HEAD~1` replays only her commit.', solution: 'cd ~/priya-vault && git fetch && git rebase --onto origin/feature/refunds HEAD~1 && git push', check: t => { const b = t.remote('you/vault-api'); const tip = b.refs['refs/heads/feature/refunds']; return !!tip && /email the customer/.test(t.world.commit(tip).message) && !blobsOf(t.world, [tip]).some(c => typeof c === 'string' && c.includes(t.world.labData.key)); } },
          { title: 'Tell the team to delete their clones and clone again', solution: 'gh issue create --title "History rewritten: please re-clone vault-api" --body "A leaked key was removed from all history. Delete your clone and clone again; do not pull."', check: t => t.remote('you/vault-api').meta.issues.some(i => /clone/i.test(i.title + i.body)) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'Why create local branches for every remote branch before running filter-repo?', choices: ['It rewrites local branches and tags; remote-tracking refs are dropped', 'filter-repo needs at least three branches', 'To make the clone fresh', 'It is faster'], answer: 0, explain: 'Otherwise those branches keep the secret and are never pushed clean.' },
        { type: 'mc', q: "What does `git rebase --onto origin/feature/refunds HEAD~1` do in Priya's clone?", choices: ['Replays only her last commit onto the rewritten branch', 'Replays the whole branch', 'Deletes her commit', 'Merges main'], answer: 0, explain: '--onto <new base> <old base>: everything after the old base moves.' },
        { type: 'tf', q: 'The v1.0.0 tag is safe because it was created before the key was "removed" from main.', answer: false, explain: 'The tag points at a commit that contains the key. Rewrite and force-push tags too.' },
        { type: 'order', q: 'Order the surgery.', items: ['Revoke the key', 'Fresh clone with a local branch for every remote branch', 'git filter-repo --replace-text', 'Force-push all branches and tags', 'Turn on push protection', 'Ask everyone to re-clone'], explain: 'Bleeding first, then the operation, then aftercare.' },
        { type: 'mc', q: 'A teammate pulls into their old clone after the rewrite. What happens?', choices: ['The old history, key included, is merged back', 'Their clone is cleaned', 'git refuses', 'Nothing'], answer: 0, explain: 'Re-clone, or move unpushed work with rebase --onto.' },
      ],
    },
    {
      id: 'stack-shipper',
      title: 'Trial: ship the stack',
      summary: 'Land three stacked PRs through review and a protected main, keeping the stack intact at every step.',
      minutes: 30,
      boss: true,
      lab: {
        cwd: '~/ledger',
        panels: ['graph', 'github'],
        setup(H) {
          H.remote('acme', 'ledger', [{ message: 'Create ledger', files: { 'src/index.js': 'export {};\n', 'README.md': '# ledger\n' } }], { collaborators: ['you'] });
          H.protect('acme/ledger', 'main', { requirePR: true, requiredReviews: 1 });
          H.world.github.authed = true;
          H.cd('~');
          H.run('git clone -q https://github.com/acme/ledger.git');
          H.cd('~/ledger');
          H.run('git switch -qc entries');
          H.commit('Add ledger entries', { 'src/entry.js': ENTRY });
          H.run('git switch -qc balances');
          H.commit('Compute balances', { 'src/balance.js': 'import { Entry } from "./entry.js";\nexport const balance = entries => entries.reduce((s, e) => s + e.cents, 0);\n' });
          H.run('git switch -qc statements');
          H.commit('Monthly statements', { 'src/statement.js': 'import { balance } from "./balance.js";\nexport const statement = (month, entries) => ({ month, total: balance(entries) });\n' });
          H.teammate('acme/ledger', { message: 'Add currency helper', files: { 'src/currency.js': 'export const eur = c => (c / 100).toFixed(2) + " €";\n' }, author: PRIYA });
        },
        events(ev, t) {
          const url = 'https://github.com/acme/ledger.git';
          if (ev.url !== url) return;
          const b = t.remote('acme/ledger');
          if (ev.type === 'pr-created') {
            const pr = b.meta.prs.find(p => p.number === ev.number);
            if (pr.head === 'entries') { t.review('acme/ledger', pr.number, 'CHANGES_REQUESTED', 'Entries must reject non-integer cents: add a validate() check in the constructor.', 'Priya Sharma'); t.say(`[GitHub] Priya requested changes on #${pr.number}: "add a validate() check".`); }
            else { t.review('acme/ledger', pr.number, 'APPROVED', 'Looks good.', 'Priya Sharma'); t.say(`[GitHub] Priya approved #${pr.number}.`); }
          }
          if (ev.type === 'push' && ev.branch === 'entries') {
            const pr = b.meta.prs.find(p => p.head === 'entries' && p.state === 'open');
            const flat = t.world.readTreeFlat(t.world.commit(b.refs['refs/heads/entries']).tree);
            const txt = flat.has('src/entry.js') ? t.world.objects.get(flat.get('src/entry.js')).content : '';
            if (pr && /validate/.test(txt) && !pr.reviews.some(r => r.state === 'APPROVED')) { t.review('acme/ledger', pr.number, 'APPROVED', 'Validation looks right. Approved.', 'Priya Sharma'); t.say(`[GitHub] Priya approved #${pr.number}.`); }
          }
        },
        suggestions: ['git log --oneline --graph --all', 'gh pr list'],
        tasks: [
          { title: 'The stack (entries → balances → statements) sits on the latest main', solution: 'git config --global rebase.updateRefs true && git fetch && git rebase origin/main', check: t => t.ref('origin/main') === t.remoteRef('acme/ledger', 'main') && stackOn(t, 'origin/main') },
          { title: 'All three branches are on GitHub, each with a PR based on the branch below it', solution: 'git push -u origin entries balances statements, then gh pr create --base main --head entries …, --base entries --head balances …, --base balances --head statements …', test: ['git push -q origin entries balances statements', 'gh pr create --base main --head entries --title "Ledger entries" --body "Part 1 of 3"', 'gh pr create --base entries --head balances --title "Balances" --body "Part 2 of 3"', 'gh pr create --base balances --head statements --title "Statements" --body "Part 3 of 3"'], check: t => { const prs = t.remote('acme/ledger').meta.prs; return [['entries', 'main'], ['balances', 'entries'], ['statements', 'balances']].every(([h, b]) => prs.some(p => p.head === h && p.base === b && p.state === 'open')) && STACK.every(b => t.remoteRef('acme/ledger', b) === t.ref(b)); } },
          { title: "Priya's review is addressed in the bottom commit itself, the stack is intact and pushed", detail: 'entries must contain a `validate` check in src/entry.js; no fixup commits may remain.', solution: 'edit src/entry.js on statements, git commit -a --fixup entries, git rebase -i --autosquash origin/main, git push --force-with-lease origin entries balances statements', test: [{ cmd: 'edit src/entry.js', edit: ENTRY_VALID }, 'git commit -qa --fixup entries', { cmd: 'git rebase -i --autosquash origin/main', edit: c => c }, 'git push -q --force-with-lease origin entries balances statements'], check: t => /validate/.test(t.fileAt('entries', 'src/entry.js') || '') && stackOn(t, 'origin/main') && !revList(t.world, [t.ref('statements')], [t.ref('origin/main')]).some(h => /^fixup!/.test(t.world.commit(h).message)) && STACK.every(b => t.remoteRef('acme/ledger', b) === t.ref(b)) },
          { title: 'PR 1 is squash-merged into main and PR 2 now targets main', solution: 'gh pr merge 1 --squash --delete-branch', check: t => { const prs = t.remote('acme/ledger').meta.prs; return prs.find(p => p.head === 'entries')?.state === 'merged' && prs.find(p => p.head === 'balances')?.base === 'main'; } },
          { title: 'The rest of the stack sits on the new main without the old entries commit, and PR 2 is merged', solution: 'git fetch && git rebase --onto origin/main entries statements && git push --force-with-lease origin balances statements && gh pr merge 2 --squash --delete-branch', test: ['git fetch -q', 'git rebase --onto origin/main entries statements', 'git push -q --force-with-lease origin balances statements', 'gh pr merge 2 --squash --delete-branch'], check: t => { const prs = t.remote('acme/ledger').meta.prs; return prs.find(p => p.head === 'balances')?.state === 'merged' && prs.find(p => p.head === 'statements')?.base === 'main'; } },
          { title: 'All three features are on main, and your local main matches it', solution: 'git fetch && git rebase --onto origin/main balances statements && git push --force-with-lease origin statements && gh pr merge 3 --squash --delete-branch && git switch main && git pull', test: ['git fetch -q', 'git rebase --onto origin/main balances statements', 'git push -q --force-with-lease origin statements', 'gh pr merge 3 --squash --delete-branch', 'git switch -q main && git pull -q'], check: t => { const b = t.remote('acme/ledger'); const m = b.refs['refs/heads/main']; const flat = t.world.readTreeFlat(t.world.commit(m).tree); return ['src/entry.js', 'src/balance.js', 'src/statement.js', 'src/currency.js'].every(f => flat.has(f)) && /validate/.test(t.world.objects.get(flat.get('src/entry.js')).content) && t.ref('main') === m && t.branch() === 'main'; } },
        ],
      },
      quiz: [
        { type: 'mc', q: 'In a stack, which PR should be merged first?', choices: ['The bottom one, based on main', 'The top one', 'Any order', 'All at once with an octopus merge'], answer: 0, explain: 'Merging a higher PR first would bring the unreviewed lower commits along.' },
        { type: 'mc', q: 'The bottom PR was squash-merged. Which command moves the rest of the stack?', choices: ['git rebase --onto origin/main <old-bottom> <top>', 'git rebase origin/main', 'git merge origin/main', 'git cherry-pick origin/main'], answer: 0, explain: 'Only the commits above the old bottom are replayed; --update-refs moves the branches in between.' },
        { type: 'tf', q: 'With rebase.updateRefs on, a fixup for the bottom commit can be folded in from the top branch with one interactive rebase.', answer: true, explain: '--autosquash puts it in place; update-ref lines move every branch.' },
        { type: 'mc', q: 'Why --force-with-lease when pushing a rebased stack?', choices: ['It refuses if someone pushed to those branches since you last fetched', 'It is faster', 'It skips CI', 'It deletes merged branches'], answer: 0, explain: 'Reviewers sometimes push suggestions to your branches.' },
        { type: 'mc', q: 'What lets GitHub retarget PR 2 to main automatically?', choices: ['Deleting the merged PR 1 branch (or automatic head-branch deletion)', 'A CODEOWNERS file', 'Branch protection', 'Squash merging alone'], answer: 0, explain: 'When the base branch disappears after its PR merged, dependent PRs move to the merged PR\'s base.' },
      ],
    },
    {
      id: 'house-keeper',
      title: 'Trial: clean house',
      summary: 'Fix identities, make blame and shortlog tell the truth, really delete a leak, and ship a clean release archive.',
      minutes: 30,
      boss: true,
      lab: {
        cwd: '~/work/handbook',
        panels: ['graph', 'files'],
        setup(H) {
          H.remote('acme', 'handbook', [
            { message: 'Create handbook', files: { 'docs/index.md': '# Handbook\n', 'docs/style.css': CSS_V1, 'drafts/ideas.md': 'unfinished\n' }, author: PRIYA },
            { message: 'Onboarding guide', files: { 'docs/onboarding.md': '# Onboarding\n' }, author: { name: 'priya', email: 'priya.sharma@old-laptop.local' } },
            { message: 'Darker headings', files: { 'docs/style.css': CSS_V2 }, author: { name: 'Kim Park', email: 'kim@example.org' } },
            { message: 'Reformat CSS', files: { 'docs/style.css': CSS_FMT }, author: { name: 'Format Bot', email: 'bot@example.org' } },
          ], { collaborators: ['you'] });
          H.tagRemote('acme/handbook', 'v2.9');
          H.world.github.authed = true;
          H.run('mkdir -p ~/work');
          H.cd('~/work');
          H.run('git clone -q https://github.com/acme/handbook.git');
          H.cd('~/work/handbook');
          H.commit('Holiday policy', { 'docs/holidays.md': '# Holidays\n\n25 days a year.\n' });
          H.commit('Add local settings', { '.env': ENV_LEAK });
          H.commit('Expenses policy', { 'docs/expenses.md': '# Expenses\n' });
          H.world.labData = { leak: H.world.blobHash(ENV_LEAK), fmt: H.shell.run('git rev-parse origin/main', { record: false }).out[0] };
        },
        suggestions: ['git log --oneline --format="%h %an <%ae> %s" origin/main..', 'git config --show-origin user.email'],
        tasks: [
          { title: 'Every repository under ~/work/ commits as dev@acme.example, automatically', solution: 'git config --file ~/.gitconfig-work user.email dev@acme.example && git config --global includeIf.gitdir:~/work/.path ~/.gitconfig-work', check: t => configGet(t.repo, 'user.email') === 'dev@acme.example' && Object.keys(t.world.globalConfig).some(k => /^includeif\.gitdir:/i.test(k)) },
          { title: 'Your unpushed work is on GitHub: authored as dev@acme.example, with no trace of .env in any pushed commit', hint: 'Drop the .env commit in an interactive rebase and re-author the rest with --exec.', solution: 'git rebase -i origin/main (drop "Add local settings"), then git rebase origin/main --exec "git commit --amend --no-edit --reset-author" && git push', test: [{ cmd: 'git rebase -i origin/main', edit: c => c.replace(/^pick (\w+) Add local settings$/m, 'drop $1 Add local settings') }, 'git rebase origin/main --exec "git commit --amend --no-edit --reset-author"', 'git push -q'], check: t => { const b = t.remote('acme/handbook'); const mine = revList(t.world, [b.refs['refs/heads/main']], [t.world.labData.fmt]); return mine.length === 2 && mine.every(h => t.world.commit(h).author.email === 'dev@acme.example') && !blobsOf(t.world, [b.refs['refs/heads/main']]).some(c => c === ENV_LEAK); } },
          { title: 'The leaked .env content no longer exists anywhere in your local repository', hint: 'The reflog still reaches it. Expire it, then prune.', solution: 'git reflog expire --expire=now --all && git gc --prune=now', check: t => !reachableObjects(t.repo).has(t.world.labData.leak) && !(t.repo.dangling || new Set()).has(t.world.labData.leak) },
          { title: '`git shortlog -sne` lists Priya once, and the fix is on GitHub', solution: 'echo "Priya Sharma <priya@example.com> <priya.sharma@old-laptop.local>" > .mailmap && git add .mailmap && git commit -m "Add .mailmap" && git push', test: ['echo "Priya Sharma <priya@example.com> <priya.sharma@old-laptop.local>" > .mailmap', 'git add .mailmap && git commit -qm "Add .mailmap"', 'git push -q'], check: t => { const b = t.remote('acme/handbook'); const flat = t.world.readTreeFlat(t.world.commit(b.refs['refs/heads/main']).tree); return flat.has('.mailmap') && mailmapFor(t.repo)({ name: 'priya', email: 'priya.sharma@old-laptop.local' }).email === 'priya@example.com'; } },
          { title: 'For everyone, blame of docs/style.css looks past "Reformat CSS"', hint: 'A committed .git-blame-ignore-revs, pushed, plus blame.ignoreRevsFile in your clone.', solution: 'git rev-parse <reformat> > .git-blame-ignore-revs && git add .git-blame-ignore-revs && git commit -m "Ignore the CSS reformat in blame" && git push && git config blame.ignoreRevsFile .git-blame-ignore-revs', test: [t => `git rev-parse ${t.world.labData.fmt} > .git-blame-ignore-revs`, 'git add .git-blame-ignore-revs && git commit -qm "Ignore the CSS reformat in blame"', 'git push -q', 'git config blame.ignoreRevsFile .git-blame-ignore-revs'], check: t => { const b = t.remote('acme/handbook'); const flat = t.world.readTreeFlat(t.world.commit(b.refs['refs/heads/main']).tree); const f = flat.has('.git-blame-ignore-revs') ? t.world.objects.get(flat.get('.git-blame-ignore-revs')).content : ''; return f.includes(t.world.labData.fmt) && t.config('blame.ignoreRevsFile') === '.git-blame-ignore-revs'; } },
          { title: '~/handbook-3.0.tar.gz holds tag v3.0 inside handbook-3.0/, without the drafts folder', solution: 'printf "/drafts export-ignore\\n" >> .gitattributes && git add .gitattributes && git commit -m "Keep drafts out of releases" && git push && git tag -a v3.0 -m "Handbook 3.0" && git push origin v3.0 && git archive --prefix=handbook-3.0/ -o ~/handbook-3.0.tar.gz v3.0', test: ['printf "/drafts export-ignore\\n" >> .gitattributes', 'git add .gitattributes && git commit -qm "Keep drafts out of releases"', 'git push -q', 'git tag -a v3.0 -m "Handbook 3.0" && git push -q origin v3.0', 'git archive --prefix=handbook-3.0/ -o ~/handbook-3.0.tar.gz v3.0'], check: t => { const c = t.world.files.get(t.world.home + '/handbook-3.0.tar.gz'); if (!isArchive(c)) return false; const a = parseArchive(c); return a.format === 'tar.gz' && a.entries.length > 0 && a.entries.every(e => e.path.startsWith('handbook-3.0/')) && !a.entries.some(e => /\/drafts\//.test(e.path)) && a.entries.some(e => /holidays\.md$/.test(e.path)); } },
        ],
      },
      quiz: [
        { type: 'mc', q: 'Your last three commits are unpushed and one added a .env file. What is the cleanest fix?', choices: ['Drop that commit in git rebase -i, then push', 'Commit a deletion of .env and push', 'Add .env to .gitignore and push', 'git revert it and push'], answer: 0, explain: 'A later deletion still publishes the secret in history. Unpushed history can simply be rewritten.' },
        { type: 'mc', q: 'After dropping the commit, why does git still have the .env blob?', choices: ['The reflog keeps the old commits reachable', 'Git never deletes anything', 'Because it is in .gitignore', 'Because of the index'], answer: 0, explain: 'expire the reflog and gc --prune=now to remove it.' },
        { type: 'tf', q: 'If the .env had been pushed, cleaning your local repository would make the secret safe.', answer: false, explain: 'Rotate it. Then rewrite the shared history and ask the host to purge caches.' },
        { type: 'mc', q: 'Which file makes GitHub\'s blame view skip a formatting commit?', choices: ['.git-blame-ignore-revs at the repository root', '.mailmap', '.gitattributes', 'CODEOWNERS'], answer: 0, explain: 'Locally you also set blame.ignoreRevsFile.' },
        { type: 'type', q: 'Type the .gitattributes line that keeps the `drafts/` folder out of `git archive` output.', accept: ['/drafts export-ignore', 'drafts export-ignore', 'drafts/** export-ignore', '/drafts/** export-ignore'], model: '/drafts export-ignore', explain: 'Commit it before tagging: archive reads the attributes of the tree it archives.' },
      ],
    },
    {
      id: 'final-boss',
      title: 'Final boss: The Conquest',
      summary: 'Bisect, polish, PR with CI and review, rebase, release and backport, on one long day.',
      minutes: 40,
      boss: true,
      lab: {
        cwd: '~',
        panels: ['github', 'graph', 'files'],
        setup(H) {
          const w = H.world;
          w.testRule = files => /up:\s*"green"/.test(files['badge.js'] || '') ? { ok: true, log: ['PASS "up" renders a green badge'] } : { ok: false, log: ['FAIL "up" rendered a red badge'] };
          const MIRA = { name: 'Mira Patel', email: 'mira@lighthouse.example' }, JO = { name: 'Jo Kim', email: 'jo@lighthouse.example' };
          H.remote('lighthouse', 'app', [
            { message: 'feat: status page', files: { 'badge.js': 'export const colours = {\n  up: "green",\n  down: "red",\n};\n', 'page.js': 'export const page = {};\n', '.github/workflows/ci.yml': CI_YML }, author: MIRA },
            { message: 'feat: incident list', files: { 'incidents.js': 'export const incidents = [];\n' }, author: JO },
          ], { collaborators: ['you'], description: 'Open-source status pages' });
          const bare = w.remotes.get('https://github.com/lighthouse/app.git');
          bare.refs['refs/tags/v1.3.0'] = bare.refs['refs/heads/main'];
          H.teammate('lighthouse/app', { files: { 'uptime.js': 'export const uptime = 99.9;\n' }, message: 'feat: uptime percentage', author: JO });
          const bad = H.teammate('lighthouse/app', { files: { 'badge.js': 'export const colours = {\n  up: "red",\n  down: "red",\n};\n', 'theme.js': 'export const theme = {};\n' }, message: 'refactor: centralise theme colours', author: MIRA });
          H.teammate('lighthouse/app', { files: { 'subscribe.js': 'export const subscribe = () => {};\n' }, message: 'feat: email subscriptions', author: JO });
          bare.refs['refs/tags/v1.4.0'] = bare.refs['refs/heads/main'];
          bare.refs['refs/heads/release/1.x'] = bare.refs['refs/heads/main'];
          H.teammate('lighthouse/app', { files: { 'dark.css': 'body { background: #000; }\n' }, message: 'feat: dark mode', author: MIRA });
          H.teammate('lighthouse/app', { files: { 'deps.txt': 'chart@3\n' }, message: 'chore: update dependencies', author: JO });
          H.protect('lighthouse/app', 'main', { requirePR: true, requiredReviews: 1, requireChecks: true, requireUpToDate: true });
          H.issue('lighthouse/app', { title: 'Status badge shows red when the service is up', body: 'Since v1.4.0 every badge is red.', labels: ['bug'], author: 'Mira Patel' });
          w.labData = { bad };
          // the colleague's unfinished work, waiting for you to take over after cloning
          w.labData.handover = true;
        },
        events(ev, t) {
          const ld = t.world.labData;
          const url = 'https://github.com/lighthouse/app.git';
          if (ev.type === 'clone' && ev.url === url && !ld.wip) {
            ld.wip = true;
          }
          if (ev.type === 'pr-created' && ev.url === url && !ld.pr) {
            ld.pr = ev.number;
            t.review('lighthouse/app', ev.number, 'APPROVED', 'Great catch. Approved once CI is green and the branch is up to date.', 'Priya Sharma');
            t.teammate('lighthouse/app', { files: { 'README.md': '# Lighthouse\n\n![screenshot](docs/screenshot.png)\n' }, message: 'docs: add screenshots to README', author: { name: 'Jo Kim', email: 'jo@lighthouse.example' } });
            t.say(`[GitHub] Priya approved #${ev.number}. Meanwhile Jo merged "docs: add screenshots to README" into main: your branch is now out of date.`);
          }
        },
        onCommand(line, res, t) {
          const ld = t.world.labData;
          const repo = t.repoAt('~/app');
          if (repo && !ld.wipMade) {
            // hand over the colleague's messy WIP branch as soon as the clone exists
            ld.wipMade = true;
            const savedCwd = t.shell.cwd;
            t.shell.cwd = repo.root;
            t.shell.run('git branch fix/badge-colour origin/main', { record: false });
            const save = repo.HEAD;
            t.shell.run('git switch -q fix/badge-colour', { record: false });
            t.write('badge.js', 'export const colours = {\n  up: "gren",\n  down: "red",\n};\n'); t.shell.run('git commit -qam "wip"', { record: false });
            t.write('badge.js', 'export const colours = {\n  up: "green",\n  down: "red",\n};\n'); t.shell.run('git commit -qam "fix typo"', { record: false });
            t.write('NOTES.txt', 'remember to test dark mode\n'); t.shell.run('git add NOTES.txt && git commit -qm "notes to self"', { record: false });
            t.shell.run('git switch -q main', { record: false });
            void save;
            t.shell.cwd = savedCwd;
            t.say('[Handover] Your colleague left a local branch fix/badge-colour with three messy commits: "wip", "fix typo", "notes to self".');
          }
        },
        tasks: [
          { title: 'Clone lighthouse/app and go into it', solution: 'git clone https://github.com/lighthouse/app.git && cd app', check: t => !!t.repoAt('~/app') && t.inDir('~/app') },
          { title: 'Find the commit that broke the badge colours (v1.3.0 was good)', solution: 'git bisect start HEAD v1.3.0 && git bisect run npm test', check: t => t.events('bisect-found').some(e => e.hash === t.world.labData.bad) },
          { title: 'End the bisect and read the guilty commit', solution: 'git bisect reset && git show <id>', test: [t => `git bisect reset && git show ${t.world.labData.bad.slice(0, 7)}`], check: t => !t.repo?.bisect && t.history.some(l => { const m = l.match(/git show\s+(\S+)/); return m && t.ref(m[1]) === t.world.labData.bad; }) },
          {
            title: 'Take over fix/badge-colour: turn its three messy commits into ONE commit "fix: show a green badge when the service is up" (drop the notes)',
            solution: 'git switch fix/badge-colour && git rebase -i main',
            test: ['git switch fix/badge-colour', { cmd: 'git rebase -i main', edits: [todoPlan([['reword', /^wip/], ['fixup', /fix typo/], ['drop', /notes to self/]]), 'fix: show a green badge when the service is up\n'] }],
            check: t => { const r = t.repoAt('~/app'); const tip = t.ref('fix/badge-colour', r); if (!tip) return false; const c = t.world.commit(tip); return /^fix(\(.+\))?: /.test(c.message) && c.parents[0] === t.ref('main', r) && /up:\s*"green"/.test(t.fileAt('fix/badge-colour', 'badge.js', r) || '') && !t.fileAt('fix/badge-colour', 'NOTES.txt', r); },
          },
          { title: 'Push the branch and open a PR that closes issue #1', solution: 'git push -u origin fix/badge-colour && gh pr create --title "fix: show a green badge when the service is up" --body "Fixes #1"', check: t => !!t.world.labData.pr && (t.remote('lighthouse/app').meta.prs || []).some(p => p.number === t.world.labData.pr && /(fix|close|resolve)(e[sd]|s)?\s+#1\b/i.test(`${p.title} ${p.body}`)) },
          { title: 'main moved. Rebase onto the latest origin/main and update the PR safely', solution: 'git fetch && git rebase origin/main && git push --force-with-lease', check: t => { const b = t.remote('lighthouse/app'); const head = b.refs['refs/heads/fix/badge-colour']; return !!head && t.isAncestor(b.refs['refs/heads/main'], head) && b.meta.runs.some(r => r.hash === head && r.conclusion === 'success'); } },
          { title: 'Merge the approved, green PR (squash) and delete the branch', solution: 'gh pr merge --squash --delete-branch', check: t => (t.remote('lighthouse/app').meta.prs || []).some(p => p.number === t.world.labData.pr && p.state === 'merged') && (t.remote('lighthouse/app').meta.issues.find(i => i.number === 1)?.state === 'closed') },
          { title: 'Release v1.4.1: annotated tag on the updated main, pushed, with a GitHub release', solution: 'git switch main && git pull && git tag -a v1.4.1 -m "Release 1.4.1" && git push origin v1.4.1 && gh release create v1.4.1 --generate-notes', check: t => { const b = t.remote('lighthouse/app'); const tg = b.refs['refs/tags/v1.4.1']; return !!tg && t.world.objects.get(tg).type === 'tag' && t.world.peel(tg) === b.refs['refs/heads/main'] && b.meta.releases.some(r => r.tag === 'v1.4.1'); } },
          { title: 'Backport the fix to release/1.x and push it', solution: 'git switch release/1.x && git cherry-pick -x main && git push', check: t => { const b = t.remote('lighthouse/app'); const h = b.refs['refs/heads/release/1.x']; if (!h) return false; const flat = t.world.readTreeFlat(t.world.commit(h).tree); return /up:\s*"green"/.test(t.world.objects.get(flat.get('badge.js')).content) && !flat.has('dark.css'); } },
        ],
      },
      quiz: [
        { type: 'order', q: 'Order the professional path from bug report to shipped fix.', items: ['Reproduce with a test', 'git bisect to find the cause', 'Fix on a branch, polish the commits', 'PR with "Fixes #N", CI and review', 'Merge, tag a patch release', 'Backport to maintained release branches'], explain: 'This is the whole journey of Git Conquest.' },
        { type: 'mc', q: 'Your PR is approved and green, but merge is blocked: "branch is out of date". Your branch is private. Best fix?', choices: ['Ask an admin to override', 'git fetch, git rebase origin/main, git push --force-with-lease', 'Close and reopen the PR', 'git push --force to main'], answer: 1, explain: 'Private branch: rebase and lease.' },
        { type: 'mc', q: 'Which version follows v1.4.0 for a bug fix only?', choices: ['v1.5.0', 'v1.4.1', 'v2.0.0', 'v1.4.0.1'], answer: 1, explain: 'Patch release.' },
        { type: 'multi', q: 'Which practices made today\'s fix safe?', choices: ['Required CI checks', 'Code review', 'Atomic, well-described commits', 'Force-pushing main'], answer: [0, 1, 2], explain: 'Never force-push main.' },
        { type: 'mc', q: 'How do you bring one fix from main to release/1.x without the new features?', choices: ['git merge main', 'git cherry-pick <fix>', 'git rebase main', 'git reset --hard main'], answer: 1, explain: 'Cherry-pick copies only that change.' },
        { type: 'tf', q: 'A squash merge on GitHub means the commit on main has a different id from your branch commit.', answer: true, explain: 'It is a brand-new commit.' },
        { type: 'mc', q: 'What is the single most important habit that makes git disasters recoverable?', choices: ['Never branching', 'Committing often (and pushing your branches)', 'Using only one machine', 'Avoiding the terminal'], answer: 1, explain: 'Committed and pushed work can almost always be recovered.' },
      ],
    },
  ],
};
