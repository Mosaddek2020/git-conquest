// Realm 12 · Hero Trials: disaster recovery and the final boss.

import { todoPlan } from './r05-rewriting.js';

const CI_YML = 'name: CI\non:\n  push:\n    branches: [main]\n  pull_request:\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm ci\n      - run: npm test\n';
const PRIYA = { name: 'Priya Sharma', email: 'priya@example.com' };

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

export default {
  id: 'hero-trials',
  n: 12,
  title: 'Hero Trials',
  tagline: 'Rescue any situation, then prove everything in the final trial',
  badge: 'Git Hero',
  intro: 'The last realm. First, a **rescue playbook** that turns "I broke git" into a calm, five-minute fix. Then **The Conquest**: one long, realistic day that uses everything you learned, from bisect to backports.',
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
