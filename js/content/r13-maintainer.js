// Realm 13 · Maintainer's Toolkit: range-diff, rerere, patches by email, backports with cherry
// and notes, and submodules.

import { noteFor } from '../git/extras.js';
import { revList } from '../git/core.js';

const ANA = { name: 'Ana Silva', email: 'ana@example.org' };
const KIM = 'Kim Park <kim@example.org>';

// a commit built directly in a GitHub repository (to stage a teammate's force-push or history)
function bareCommit(world, bare, { parent, files = {}, remove = [], message, author = ANA }) {
  const flat = parent ? world.readTreeFlat(world.commit(parent).tree) : new Map();
  for (const [p, c] of Object.entries(files)) flat.set(p, world.writeBlob(c));
  for (const p of remove) flat.delete(p);
  world.tick(9);
  const sig = { ...author, time: world.time };
  return world.writeCommit({ tree: world.writeTree(flat), parents: parent ? [parent] : [], message, author: sig, committer: sig });
}
const fileIn = (world, hash, path) => { if (!hash) return undefined; const f = world.readTreeFlat(world.commit(world.peel(hash)).tree); return f.has(path) ? world.objects.get(f.get(path)).content : undefined; };
const branchFrom = (H, repo, branch, from = 'main') => { const b = H.bare(repo); b.refs['refs/heads/' + branch] = b.refs['refs/heads/' + from]; };
const showOf = (t, hash) => t.history.some(l => { const m = l.match(/git show\s+(\S+)/); return m && t.ref(m[1]) === hash; });
const gitlink = (world, hash, path) => (fileIn(world, hash, path) || '').replace('Subproject commit ', '').trim();
const subHead = (t, path) => { const r = t.repoAt(path); if (!r) return null; return r.HEAD.startsWith('ref: ') ? r.refs[r.HEAD.slice(5)] : r.HEAD; };

const CSS = ':root {\n  --brand: #0f8f7c;\n  --text: #141a33;\n}\n\nbody { font-family: system-ui; }\n';
const CSS_RESOLVED = ':root {\n  --brand: #6e4fd8;\n  --brand-dark: #0b6b5d;\n  --text: #141a33;\n}\n\nbody { font-family: system-ui; }\n';
const README = 'tinyhttp\n\nA tiny HTTP client.\n\nUsage: get(url)\n\nLicense: MIT\n';

export default {
  id: 'maintainer',
  n: 13,
  title: "Maintainer's Toolkit",
  tagline: 'range-diff, rerere, patches by email, backports, notes and submodules',
  badge: 'Maintainer',
  intro: 'The tools people reach for when they look after a project for years: compare two versions of a rebased series with **range-diff**, solve each conflict once with **rerere**, take contributions **by email** with format-patch and am, keep old release lines patched with **cherry**, `cherry-pick -x` and **notes**, and pin shared code with **submodules**.',
  lessons: [
    {
      id: 'range-diff',
      title: 'Re-reviewing with range-diff',
      summary: 'See exactly how a rebased, force-pushed series changed, commit by commit.',
      minutes: 14,
      lab: {
        cwd: '~/parser',
        panels: ['graph', 'github', 'files'],
        setup(H) {
          const w = H.world;
          H.remote('acme', 'parser', [
            { message: 'Create parser', files: { 'parser.js': 'export const parse = s => s;\n', 'README.md': '# parser\n' } },
            { message: 'Add number parsing', files: { 'numbers.js': 'export const num = s => Number(s);\n' } },
          ], { collaborators: ['you'] });
          const b = H.bare('acme/parser');
          const base = b.refs['refs/heads/main'];
          const v1a = bareCommit(w, b, { parent: base, files: { 'tokenizer.js': 'export const tokens = s => s.split(" ");\n' }, message: 'Add tokenizer' });
          const v1b = bareCommit(w, b, { parent: v1a, files: { 'tokenizer.js': 'export const tokens = s => (s ? s.split(" ") : null);\n' }, message: 'Handle empty input' });
          const v1c = bareCommit(w, b, { parent: v1b, files: { 'debug.js': 'console.log("tokens");\n' }, message: 'Debug logging' });
          b.refs['refs/heads/tokenizer'] = v1c;
          H.pr('acme/parser', { title: 'Add a tokenizer', head: 'tokenizer', author: 'ana', body: 'Splits input into tokens.' });
          H.cd('~');
          H.run('git clone -q https://github.com/acme/parser.git');
          H.cd('~/parser');
          H.run('git switch -q tokenizer');
          // later: main moves on, Ana rebases, changes one commit, drops one, adds one, force-pushes
          H.teammate('acme/parser', { message: 'Speed up number parsing', files: { 'numbers.js': 'export const num = s => +s;\n' } });
          const main2 = b.refs['refs/heads/main'];
          const v2a = bareCommit(w, b, { parent: main2, files: { 'tokenizer.js': 'export const tokens = s => s.split(" ");\n' }, message: 'Add tokenizer' });
          const v2b = bareCommit(w, b, { parent: v2a, files: { 'tokenizer.js': 'export const tokens = s => (s ? s.split(" ") : []);\n' }, message: 'Handle empty input' });
          const v2c = bareCommit(w, b, { parent: v2b, files: { 'tokenizer.test.js': 'expect(tokens("")).toEqual([]);\n' }, message: 'Add tokenizer tests' });
          b.refs['refs/heads/tokenizer'] = v2c;
          w.labData = { v2: v2c, changed: v2b };
        },
        suggestions: ['git fetch', 'git range-diff origin/main tokenizer origin/tokenizer'],
        tasks: [
          { title: 'Fetch, and spot the forced update of tokenizer', solution: 'git fetch', check: t => t.ref('origin/tokenizer') === t.world.labData.v2 },
          { title: 'Compare the series you reviewed with the new one, commit by commit', hint: 'Base first, then the old tip, then the new tip.', solution: 'git range-diff origin/main tokenizer origin/tokenizer', check: t => t.ran(/git range-diff/) },
          { title: 'Read the one commit that changed, in full', solution: 'git show origin/tokenizer~1', check: t => showOf(t, t.world.labData.changed) },
          { title: 'Make your local tokenizer branch match the new version', solution: 'git reset --hard origin/tokenizer', check: t => t.ref('tokenizer') === t.world.labData.v2 && t.branch() === 'tokenizer' },
          { title: 'Approve PR #1, saying what you checked', solution: 'gh pr review 1 --approve --body "range-diff: only the empty-input change and the tests are new. Looks good."', check: t => t.remote('acme/parser').meta.prs[0].reviews.some(r => r.author === 'you' && r.state === 'APPROVED') },
        ],
      },
      quiz: [
        { type: 'mc', q: 'In range-diff output, what does "2: b2c3d4e ! 2: f5a6b7c Handle empty input" mean?', choices: ['The commit was changed: the lines below show how its patch differs', 'The commit is identical', 'The commit was dropped', 'The commit is new'], answer: 0, explain: '= identical, ! changed, < dropped, > added.' },
        { type: 'type', q: 'Type the range-diff command comparing old tip `topic` with new tip `origin/topic`, both based on origin/main.', accept: ['git range-diff origin/main topic origin/topic', 'git range-diff origin/main..topic origin/main..origin/topic'], model: 'git range-diff origin/main topic origin/topic', explain: 'Base, old tip, new tip.' },
        { type: 'tf', q: 'After a rebase, every commit id changes, so range-diff shows every commit as changed.', answer: false, explain: 'It compares patches, so re-applied but unchanged commits show as =.' },
        { type: 'mc', q: 'Why is plain `git diff tokenizer origin/tokenizer` a poor way to re-review a rebased PR?', choices: ['It also includes everything that landed on main in between', 'It only shows file names', 'It cannot compare branches', 'It needs network access'], answer: 0, explain: 'range-diff compares the two series of commits instead.' },
        { type: 'mc', q: 'Where are range-diffs commonly pasted?', choices: ['In a PR comment or patch cover letter after a force-push or [PATCH v2]', 'In the commit message', 'In .gitattributes', 'In CODEOWNERS'], answer: 0, explain: 'It tells reviewers exactly what changed since their last look.' },
      ],
    },
    {
      id: 'rerere',
      title: 'rerere: resolve a conflict once',
      summary: 'Let git record conflict resolutions and replay them in later merges and rebases.',
      minutes: 15,
      lab: {
        cwd: '~/theme',
        panels: ['graph', 'files', 'areas'],
        setup(H) {
          H.world.testRule = files => (!/^(<<<<<<<|=======|>>>>>>>)/m.test(files['styles.css'] || '') && /--brand:/.test(files['styles.css'] || '')) ? { ok: true, log: ['PASS theme renders'] } : { ok: false, log: ['FAIL styles.css is not valid CSS'] };
          H.remote('you', 'theme', [{ message: 'Create theme', files: { 'styles.css': CSS, 'index.html': '<link rel="stylesheet" href="styles.css">\n', 'package.json': '{ "name": "theme" }\n' } }]);
          branchFrom(H, 'you/theme', 'redesign');
          H.teammate('you/theme', { branch: 'redesign', message: 'Redesign: new brand colour', files: { 'styles.css': CSS.replace('#0f8f7c', '#6e4fd8') }, author: { name: 'Dev Learner', email: 'dev@example.com' } });
          H.teammate('you/theme', { branch: 'redesign', message: 'Redesign: new header', files: { 'header.html': '<header class="new">ACME</header>\n' }, author: { name: 'Dev Learner', email: 'dev@example.com' } });
          H.teammate('you/theme', { branch: 'redesign', message: 'Redesign: card component', files: { 'card.css': '.card { border-radius: 12px; }\n' }, author: { name: 'Dev Learner', email: 'dev@example.com' } });
          H.teammate('you/theme', { message: 'Darker brand colour for contrast', files: { 'styles.css': CSS.replace('#0f8f7c', '#0b6b5d') } });
          H.teammate('you/theme', { message: 'Add footer', files: { 'footer.html': '<footer>© ACME</footer>\n' } });
          H.cd('~');
          H.run('git clone -q https://github.com/you/theme.git');
          H.cd('~/theme');
          H.run('git switch -q redesign');
          H.run('git branch -q main origin/main 2>/dev/null || true');
        },
        suggestions: ['git config --global rerere.enabled true'],
        tasks: [
          { title: 'Turn on rerere for all your repositories', solution: 'git config --global rerere.enabled true', check: t => t.world.globalConfig['rerere.enabled'] === 'true' },
          { title: 'Do a trial merge of main into redesign', solution: 'git merge main', check: t => !!t.repo.rr?.pending?.['styles.css'] },
          { title: "Resolve it: keep the redesign colour as --brand and main's colour as --brand-dark, then stage the file", detail: 'Replace the conflict block with `--brand: #6e4fd8;` and `--brand-dark: #0b6b5d;`.', solution: 'edit styles.css, then git add styles.css', test: [{ cmd: 'edit styles.css', edit: CSS_RESOLVED }, 'git add styles.css'], check: t => Object.keys(t.repo.rr?.resolved || {}).length > 0 },
          { title: 'Throw the trial merge away: the recorded resolution stays', solution: 'git merge --abort', check: t => !t.state() && t.headHash() === t.ref('origin/redesign') },
          { title: 'Rebase redesign onto main for real, and let git reuse your resolution', hint: 'Look for "Resolved \'styles.css\' using previous resolution". Check the file, then `git add` it and continue.', solution: 'git rebase main, then git add styles.css && git rebase --continue', test: ['git rebase main', 'git add styles.css && git rebase --continue'], check: t => t.events('rerere-reuse').length > 0 && !t.state() && t.isAncestor(t.ref('main'), t.headHash()) && /--brand-dark: #0b6b5d/.test(t.headFile('styles.css') || '') },
          { title: 'Run the tests, then update the pushed branch safely', solution: 'npm test && git push --force-with-lease', check: t => t.ran(/npm test/) && t.remoteRef('you/theme', 'redesign') === t.headHash() },
        ],
      },
      quiz: [
        { type: 'type', q: 'Type the command that turns on rerere everywhere.', accept: ['git config --global rerere.enabled true'], model: 'git config --global rerere.enabled true', explain: 'It only helps with conflicts recorded after you enable it.' },
        { type: 'mc', q: 'When does rerere record your resolution?', choices: ['When you stage (or commit) the resolved file', 'When you open the file', 'When you push', 'Never: you must export it'], answer: 0, explain: 'You see "Recorded resolution for …".' },
        { type: 'tf', q: 'A resolution recorded during a merge can be reused in a later rebase, even though ours and theirs swap places.', answer: true, explain: 'rerere normalises the two sides of the conflict.' },
        { type: 'mc', q: 'You recorded a wrong resolution. What now?', choices: ['git rerere forget <file>, then resolve again', 'Delete the repository', 'git reset --hard', 'Turn rerere off forever'], answer: 0, explain: 'forget drops it for that conflict.' },
        { type: 'mc', q: 'Which setting also stages reused resolutions automatically?', choices: ['rerere.autoupdate true', 'merge.ff only', 'pull.rebase true', 'core.autocrlf input'], answer: 0, explain: 'Still check the file and run the tests.' },
      ],
    },
    {
      id: 'email-patches',
      title: 'Patches by email: format-patch and am',
      summary: 'Contribute and maintain the way the Linux kernel and git itself do.',
      minutes: 18,
      lab: {
        cwd: '~/tinyhttp',
        panels: ['graph', 'files', 'areas'],
        setup(H) {
          H.remote('tinyhttp', 'tinyhttp', [{ message: 'Create tinyhttp', files: { 'README.md': README, 'src/headers.c': 'int lookup(const char *name);\n', 'docs/index.md': '# tinyhttp\n' } }], { collaborators: ['you'] });
          H.cd('~');
          H.run('git clone -q https://github.com/tinyhttp/tinyhttp.git');
          H.cd('~/tinyhttp');
          // Kim's series, made on a throwaway branch and mailed to you as files
          H.run('git switch -q -c kim-work');
          H.commit('docs: explain request timeouts\n\nSigned-off-by: Kim Park <kim@example.org>', { 'docs/timeouts.md': '# Timeouts\n\nRequests time out after 30 s by default.\n' }, { author: KIM });
          H.commit('README: mention the timeout option\n\nSigned-off-by: Kim Park <kim@example.org>', { 'README.md': README.replace('get(url)', 'get(url, { timeout })') }, { author: KIM });
          H.run('git format-patch main -o ~/inbox');
          H.run('git switch -q main');
          H.run('git branch -D kim-work');
          // meanwhile main moved: the README line next to Kim's change was edited
          H.commit('README: say what makes it tiny', { 'README.md': README.replace('A tiny HTTP client.', 'A tiny, dependency-free HTTP client.') });
          H.run('git switch -q -c header-case');
          H.commit('headers: compare names case-insensitively', { 'src/headers.c': 'int lookup(const char *name); /* strcasecmp */\n' });
          H.commit('headers: add a test for mixed-case names', { 'tests/headers.c': 'assert(lookup("Content-Type") == lookup("content-type"));\n' });
          H.world.events.length = 0;
        },
        suggestions: ['git format-patch -s main -o ~/outbox', 'ls ~/inbox'],
        tasks: [
          { title: 'Turn your two commits on header-case into signed-off patch files in ~/outbox', solution: 'git format-patch -s main -o ~/outbox', check: t => { const files = [...t.world.files.keys()].filter(f => f.startsWith(t.world.home + '/outbox/') && f.endsWith('.patch')); return files.length === 2 && files.every(f => /Signed-off-by: Dev Learner/.test(t.world.files.get(f))); } },
          { title: 'Mail them to the project list, dev@lists.tinyhttp.example', solution: 'git send-email --to=dev@lists.tinyhttp.example ~/outbox/*.patch', check: t => (t.world.mailbox || []).filter(m => m.to.some(x => /lists\.tinyhttp/.test(x))).length >= 2 },
          { title: 'Maintainer hat: start a branch kim-timeouts from main', solution: 'git switch -c kim-timeouts main', check: t => t.branch() === 'kim-timeouts' && t.headHash() === t.ref('main') },
          { title: "Apply Kim's series from ~/inbox with your sign-off", solution: 'git am -s ~/inbox/*.patch', check: t => t.events('am-failed').length > 0 },
          { title: 'It stopped half-way: back out the whole series', solution: 'git am --abort', check: t => !t.state() && t.headHash() === t.ref('main') && t.ran(/git am --abort/) },
          { title: 'Apply it again with a three-way fallback', hint: 'The patch names the blobs it was made against; `-3` lets git merge instead of insisting on exact context.', solution: 'git am -3 -s ~/inbox/*.patch', check: t => { const c = t.commits().slice(0, 2); return t.events('am-done').length > 0 && c.every(x => x.author.name === 'Kim Park' && /Signed-off-by: Dev Learner/.test(x.message)) && /dependency-free/.test(t.headFile('README.md') || '') && /timeout/.test(t.headFile('README.md') || ''); } },
          { title: 'Check the credits: author versus committer', solution: 'git log --format="%an | %cn | %s" -2', check: t => t.ran(/git log\b.*%an/) },
        ],
      },
      quiz: [
        { type: 'type', q: 'Type the command that turns every commit since origin/main into signed-off patch files in ~/outbox.', accept: ['git format-patch -s origin/main -o ~/outbox', 'git format-patch --signoff origin/main -o ~/outbox', 'git format-patch -s -o ~/outbox origin/main'], model: 'git format-patch -s origin/main -o ~/outbox', explain: 'One numbered .patch file per commit.' },
        { type: 'mc', q: 'Why use git am instead of copying the diff and committing it yourself?', choices: ['git am keeps the original author, date and message', 'git am is faster to type', 'Copying diffs is impossible', 'git am skips review'], answer: 0, explain: 'You become the committer; the contributor stays the author.' },
        { type: 'mc', q: 'git am stops with "patch does not apply". Which option often rescues it?', choices: ['-3 (three-way merge using the blobs named in the patch)', '--force', '--no-verify', '-q'], answer: 0, explain: 'If it still conflicts: fix, git add, git am --continue.' },
        { type: 'mc', q: 'What does a Signed-off-by line certify?', choices: ['That you wrote the change or have the right to submit it (the DCO)', 'That it was code-reviewed', 'That the tests pass', 'That the commit is GPG-signed'], answer: 0, explain: 'Many projects require it on every patch.' },
        { type: 'order', q: 'Order a contributor sending a second version of a series.', items: ['git rebase -i origin/main (address review comments)', 'git format-patch -v2 -s origin/main -o outbox', 'git send-email --to=list outbox/*.patch'], explain: 'Reroll with -v2 so reviewers see [PATCH v2].' },
      ],
    },
    {
      id: 'backports',
      title: 'Backports: cherry, cherry-pick -x and notes',
      summary: 'Find which fixes an old release line lacks, copy them traceably, and annotate.',
      minutes: 17,
      lab: {
        cwd: '~/lighthouse',
        panels: ['graph', 'files', 'github'],
        setup(H) {
          const w = H.world;
          H.remote('lighthouse', 'app', [{ message: 'Lighthouse 2.0', files: { 'status.js': 'title => `<h1>${title}</h1>`\n', 'incidents.js': 'time => new Date(time).toString()\n', 'config.js': 'cfg => cfg.sites.length\n', 'VERSION': '2.0.0\n' } }], { collaborators: ['you'] });
          H.tagRemote('lighthouse/app', 'v2.0.0');
          branchFrom(H, 'lighthouse/app', 'release/2.x');
          H.teammate('lighthouse/app', { branch: 'release/2.x', message: 'Release 2.4.0', files: { 'VERSION': '2.4.0\n' } });
          H.teammate('lighthouse/app', { message: 'Add dark mode', files: { 'theme.css': ':root { color-scheme: dark; }\n', 'VERSION': '3.0.0-dev\n' } });
          const crash = H.teammate('lighthouse/app', { message: 'Fix crash on empty config', files: { 'config.js': 'cfg => (cfg.sites || []).length\n' } });
          const xss = H.teammate('lighthouse/app', { message: 'Fix XSS in status page titles', files: { 'status.js': 'title => `<h1>${escape(title)}</h1>`\n' } });
          H.teammate('lighthouse/app', { message: 'Add status page RSS feed', files: { 'rss.js': 'feed()\n' } });
          const tz = H.teammate('lighthouse/app', { message: 'Fix timezone in incident times', files: { 'incidents.js': 'time => new Date(time).toISOString()\n' } });
          const b = H.bare('lighthouse/app');
          // the crash fix was backported months ago
          b.refs['refs/heads/release/2.x'] = bareCommit(w, b, { parent: b.refs['refs/heads/release/2.x'], files: { 'config.js': 'cfg => (cfg.sites || []).length\n' }, message: `Fix crash on empty config\n\n(cherry picked from commit ${crash})`, author: { name: 'Priya Sharma', email: 'priya@example.com' } });
          w.labData = { xss, tz, crash };
          H.cd('~');
          H.run('git clone -q https://github.com/lighthouse/app.git lighthouse');
          H.cd('~/lighthouse');
        },
        suggestions: ['git merge-base main origin/release/2.x', 'git cherry -v origin/release/2.x main'],
        tasks: [
          { title: 'Find the commit where release/2.x split from main', solution: 'git merge-base main origin/release/2.x', check: t => t.ran(/git merge-base\b/) },
          { title: 'List the commits on main that release/2.x has no equivalent of', solution: 'git cherry -v origin/release/2.x main', check: t => t.ran(/git cherry(\s|$)/) },
          { title: 'Switch to release/2.x and backport the two missing fixes (not the features), recording where they came from', hint: 'The XSS fix and the timezone fix. `-x` adds "(cherry picked from commit …)".', solution: 'git switch release/2.x && git cherry-pick -x <xss-fix> <timezone-fix>', test: [t => `git switch release/2.x && git cherry-pick -x ${t.world.labData.xss.slice(0, 7)} ${t.world.labData.tz.slice(0, 7)}`], check: t => { const msgs = t.commits(t.repo, 'release/2.x').map(c => c.message).join('\n'); return msgs.includes(`(cherry picked from commit ${t.world.labData.xss})`) && msgs.includes(`(cherry picked from commit ${t.world.labData.tz})`) && t.fileAt('release/2.x', 'rss.js') === undefined && t.fileAt('release/2.x', 'theme.css') === undefined; } },
          { title: 'Ask git cherry again: no fix should be missing now', solution: 'git cherry -v release/2.x main', check: t => t.history.filter(l => /git cherry(\s|$)/.test(l)).length >= 2 },
          { title: 'Leave a note "Backported to 2.x" on both original fixes', test: [t => `git notes add -m "Backported to 2.x" ${t.world.labData.xss.slice(0, 7)}`, t => `git notes add -m "Backported to 2.x" ${t.world.labData.tz.slice(0, 7)}`], solution: 'git notes add -m "Backported to 2.x" <xss-fix>, and the same for the timezone fix', check: t => /2\.x/.test(noteFor(t.repo, t.world.labData.xss) || '') && /2\.x/.test(noteFor(t.repo, t.world.labData.tz) || '') },
          { title: 'Tag v2.4.1 on release/2.x, then push the branch, the tag and the notes', solution: 'git tag -a v2.4.1 -m "Lighthouse 2.4.1" && git push origin release/2.x v2.4.1 && git push origin refs/notes/commits', check: t => { const b = t.remote('lighthouse/app'); return b.refs['refs/heads/release/2.x'] === t.ref('release/2.x') && !!b.refs['refs/tags/v2.4.1'] && t.world.peel(b.refs['refs/tags/v2.4.1']) === t.ref('release/2.x') && !!b.refs['refs/notes/commits']; } },
        ],
      },
      quiz: [
        { type: 'mc', q: 'In `git cherry -v release/2.x main`, what does a leading "-" mean?', choices: ['An equivalent change is already on release/2.x', 'The commit was reverted', 'The commit is broken', 'The commit is only on release/2.x'], answer: 0, explain: '+ means missing, - means already there (by patch, not id).' },
        { type: 'mc', q: 'Why not use `git log release/2.x..main` to find missing fixes?', choices: ['It lists cherry-picked copies too, because their ids differ', 'It only shows merges', 'It needs --all', 'It is slower'], answer: 0, explain: 'git cherry compares patches instead.' },
        { type: 'type', q: 'Type the command that cherry-picks commit 4d7a21f and records where it came from.', accept: ['git cherry-pick -x 4d7a21f'], model: 'git cherry-pick -x 4d7a21f', explain: 'The message gains "(cherry picked from commit …)".' },
        { type: 'tf', q: 'git push sends your notes along with the branch.', answer: false, explain: 'Push refs/notes/commits explicitly.' },
        { type: 'mc', q: 'What does `git merge-base --is-ancestor A B` tell you, and how?', choices: ['Whether A is contained in B, through its exit code', 'The common ancestor of A and B, printed', 'Whether A and B conflict', 'Who authored A'], answer: 0, explain: 'Exit code 0 means yes. Handy in scripts.' },
        { type: 'multi', q: 'Which changes usually qualify for a backport to an old release line?', choices: ['Security fixes', 'Crash fixes', 'New features', 'Large refactors'], answer: [0, 1], explain: 'Old lines get small, safe fixes.' },
      ],
    },
    {
      id: 'submodules',
      title: 'Submodules: repos inside repos',
      summary: 'Pin another repository at an exact commit, and update it on purpose.',
      minutes: 16,
      lab: {
        cwd: '~',
        panels: ['files', 'graph', 'github'],
        setup(H) {
          const w = H.world;
          H.remote('acme', 'ui', [
            { message: 'UI library: button', files: { 'button.js': 'export const button = label => `<button>${label}</button>`;\n' } },
            { message: 'Add card component', files: { 'card.js': 'export const card = body => `<div class="card">${body}</div>`;\n' } },
          ]);
          H.tagRemote('acme/ui', 'v1.1.0');
          const v110 = H.bare('acme/ui').refs['refs/heads/main'];
          H.teammate('acme/ui', { message: 'Fix keyboard focus ring', files: { 'button.js': 'export const button = label => `<button class="focus-ring">${label}</button>`;\n' } });
          H.tagRemote('acme/ui', 'v1.2.0');
          const v120 = H.bare('acme/ui').refs['refs/heads/main'];
          H.remote('acme', 'app', [{ message: 'Create the app with the UI library', files: { 'index.js': 'import { button } from "./libs/ui/button.js";\n', '.gitmodules': '[submodule "libs/ui"]\n\tpath = libs/ui\n\turl = https://github.com/acme/ui.git\n', 'libs/ui': `Subproject commit ${v110}\n` } }], { collaborators: ['you'] });
          w.labData = { v110, v120 };
        },
        suggestions: ['git clone https://github.com/acme/app.git'],
        tasks: [
          { title: 'Clone the app', solution: 'git clone https://github.com/acme/app.git', check: t => !!t.repoAt('~/app') },
          { title: 'Go in and ask git about its submodules', solution: 'cd app && git submodule status', check: t => t.ran(/git submodule( status)?\s*$|git submodule status/) },
          { title: 'Bring the library in, at the commit the app pins', solution: 'git submodule update --init', check: t => subHead(t, '~/app/libs/ui') === t.world.labData.v110 },
          { title: 'Move the library to its v1.2.0 release', solution: 'cd libs/ui && git checkout v1.2.0 && cd ../..', check: t => subHead(t, '~/app/libs/ui') === t.world.labData.v120 },
          { title: 'Record the new pointer in the app and push', solution: 'git add libs/ui && git commit -m "Bump ui to v1.2.0" && git push', check: t => gitlink(t.world, t.remoteRef('acme/app', 'main'), 'libs/ui') === t.world.labData.v120 },
          { title: 'Prove that a fresh clone gets everything in one command, into app2', solution: 'cd ~ && git clone --recurse-submodules https://github.com/acme/app.git app2', check: t => subHead(t, '~/app2/libs/ui') === t.world.labData.v120 },
          { title: 'Print the current commit of every submodule in app2', solution: 'cd app2 && git submodule foreach git log --oneline -1', check: t => t.ran(/git submodule foreach/) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What does the app repository store for a submodule?', choices: ['The path, the URL (in .gitmodules) and one commit id', 'A full copy of the library', 'The library\'s latest main', 'A zip file'], answer: 0, explain: 'A pointer to an exact commit.' },
        { type: 'type', q: 'Type the command that fills in submodules after a plain clone.', accept: ['git submodule update --init', 'git submodule update --init --recursive'], model: 'git submodule update --init', explain: 'Or clone with --recurse-submodules next time.' },
        { type: 'predict', q: 'What does this line from `git submodule status` mean?', code: '-4d7a21f… libs/ui', choices: ['The submodule is not initialised yet', 'It is checked out at a different commit', 'It has local changes', 'It was deleted'], answer: 0, explain: '- not initialised, + different commit, space = matches.' },
        { type: 'tf', q: 'Running git pull in the app automatically moves submodules to the new pinned commits.', answer: false, explain: 'Run git submodule update (or set submodule.recurse true).' },
        { type: 'order', q: 'Order updating a submodule to a new release.', items: ['cd libs/ui', 'git fetch', 'git checkout v1.2.0', 'cd ../..', 'git add libs/ui', 'git commit -m "Bump ui to v1.2.0"'], explain: 'Move the submodule, then record the pointer in the app.' },
      ],
    },
    {
      id: 'maintainer-boss',
      title: 'Boss: maintainer for a day',
      summary: 'Mailed patches, a security backport, a submodule bump and a patch release.',
      minutes: 30,
      boss: true,
      lab: {
        cwd: '~/tinykv',
        panels: ['graph', 'files', 'github'],
        setup(H) {
          const w = H.world;
          H.remote('tinykv', 'hashlib', [{ message: 'hashlib 3.0', files: { 'hash.c': 'int eq(a, b) { return a == b; }\n' } }]);
          H.tagRemote('tinykv/hashlib', 'v3.0.0');
          const h300 = H.bare('tinykv/hashlib').refs['refs/heads/main'];
          H.remote('tinykv', 'tinykv', [{ message: 'tinykv 1.9.0', files: { 'parser.c': 'key = buf[len];\n', 'client.c': 'get(key)\n', 'docs/README.md': '# tinykv\n', '.gitmodules': '[submodule "deps/hashlib"]\n\tpath = deps/hashlib\n\turl = https://github.com/tinykv/hashlib.git\n', 'deps/hashlib': `Subproject commit ${h300}\n` } }], { collaborators: ['you'] });
          H.tagRemote('tinykv/tinykv', 'v1.9.0');
          branchFrom(H, 'tinykv/tinykv', 'release/1.x');
          H.teammate('tinykv/tinykv', { message: 'Add batch API', files: { 'batch.c': 'batch()\n' } });
          const fix = H.teammate('tinykv/tinykv', { message: 'Fix out-of-bounds read in key parser', files: { 'parser.c': 'key = len ? buf[len - 1] : 0;\n' } });
          H.cd('~');
          H.run('git clone -q https://github.com/tinykv/tinykv.git');
          H.cd('~/tinykv');
          H.run('git submodule update --init');
          H.run('git switch -q -c kim-work');
          H.commit('docs: document key expiry (TTL)\n\nSigned-off-by: Kim Park <kim@example.org>', { 'docs/ttl.md': '# TTL\n\nset(key, value, { ttl: 60 })\n' }, { author: KIM });
          H.commit('client: accept a ttl option\n\nSigned-off-by: Kim Park <kim@example.org>', { 'client.c': 'get(key)\nset(key, value, ttl)\n' }, { author: KIM });
          H.run('git format-patch main -o ~/inbox');
          H.run('git switch -q main');
          H.run('git branch -D kim-work');
          H.teammate('tinykv/hashlib', { message: 'Constant-time compare', files: { 'hash.c': 'int eq(a, b) { return ct_eq(a, b); }\n' } });
          H.tagRemote('tinykv/hashlib', 'v3.1.0');
          w.labData = { fix, h310: H.bare('tinykv/hashlib').refs['refs/heads/main'] };
          w.events.length = 0;
        },
        suggestions: ['ls ~/inbox', 'git log --oneline --graph --all'],
        tasks: [
          { title: "Apply Kim's series from ~/inbox on a branch kim-ttl, with your sign-off", solution: 'git switch -c kim-ttl && git am -s ~/inbox/*.patch', check: t => { const r = revList(t.world, [t.ref('kim-ttl')], [t.ref('main')]).map(h => t.world.commit(h)); return r.length === 2 && r.every(c => c.author.name === 'Kim Park' && /Signed-off-by: Dev Learner/.test(c.message)); } },
          { title: 'Bring it into main without a merge commit, and push main', solution: 'git switch main && git merge --ff-only kim-ttl && git push', check: t => t.remoteRef('tinykv/tinykv', 'main') === t.ref('kim-ttl') },
          { title: 'Backport the out-of-bounds fix to release/1.x, traceably', solution: 'git switch release/1.x && git cherry-pick -x <fix>', test: [t => `git switch release/1.x && git cherry-pick -x ${t.world.labData.fix.slice(0, 7)}`], check: t => t.commits(t.repo, 'release/1.x').some(c => c.message.includes(`(cherry picked from commit ${t.world.labData.fix})`)) },
          { title: 'Confirm git agrees the fix is on release/1.x', solution: 'git cherry -v release/1.x main', check: t => t.ran(/git cherry(\s|$)/) },
          { title: 'Note on the original fix where it went', solution: 'git notes add -m "Backported to 1.x" <fix>', test: [t => `git notes add -m "Backported to 1.x" ${t.world.labData.fix.slice(0, 7)}`], check: t => /1\.x/.test(noteFor(t.repo, t.world.labData.fix) || '') },
          { title: 'On main, move deps/hashlib to its v3.1.0 tag and commit the new pointer', solution: 'git switch main && cd deps/hashlib && git fetch && git checkout v3.1.0 && cd ../.. && git add deps/hashlib && git commit -m "Bump hashlib to v3.1.0"', check: t => gitlink(t.world, t.ref('main'), 'deps/hashlib') === t.world.labData.h310 },
          { title: 'Ship: push main, release/1.x and the notes, then tag v1.9.1 on release/1.x and push it', solution: 'git push origin main release/1.x refs/notes/commits && git tag -a v1.9.1 release/1.x -m "tinykv 1.9.1" && git push origin v1.9.1', check: t => { const b = t.remote('tinykv/tinykv'); return b.refs['refs/heads/main'] === t.ref('main') && b.refs['refs/heads/release/1.x'] === t.ref('release/1.x') && !!b.refs['refs/notes/commits'] && !!b.refs['refs/tags/v1.9.1'] && t.world.peel(b.refs['refs/tags/v1.9.1']) === t.ref('release/1.x'); } },
        ],
      },
      quiz: [
        { type: 'mc', q: 'Why apply mailed patches with git am rather than retyping them?', choices: ['Authorship, date and message are kept, and you add your sign-off', 'It is the only way to change files', 'It skips tests', 'It signs the commits'], answer: 0, explain: 'History credits the contributor.' },
        { type: 'mc', q: 'After `git merge --ff-only kim-ttl`, what does main point to?', choices: ['The same commit as kim-ttl', 'A new merge commit', 'The commit before kim-ttl', 'Nothing: ff-only refuses always'], answer: 0, explain: 'Fast-forward only moves the pointer.' },
        { type: 'tf', q: 'Committing the new submodule pointer on main also moves it on release/1.x.', answer: false, explain: 'Each branch records its own pointer.' },
        { type: 'type', q: 'Type the command that pushes your notes to origin.', accept: ['git push origin refs/notes/commits', "git push origin 'refs/notes/*'", 'git push origin refs/notes/*'], model: 'git push origin refs/notes/commits', explain: 'Notes are not pushed by default.' },
        { type: 'mc', q: 'Which release number fits a backported security fix on the 1.9 line?', choices: ['v1.9.1', 'v2.0.0', 'v1.10.0', 'v1.9.0-fix'], answer: 0, explain: 'Patch version: same features, a fix.' },
      ],
    },
  ],
};
