// Realm 8 · Open Source: forks, contributing upstream, syncing forks, community files.

const MAINTAINER = { name: 'Lina Haddad', email: 'lina@bookworm.example' };
const prIn = (t, owner, pred) => (t.remote(owner)?.meta.prs || []).find(pred);
const issueIn = (t, owner, n) => (t.remote(owner)?.meta.issues || []).find(i => i.number === n);

export default {
  id: 'open-source',
  n: 8,
  title: 'Open Source',
  tagline: 'Forks, upstream, and contributing to projects you do not own',
  badge: 'Upstream Ally',
  intro: 'Most of the world\'s software is built by people who cannot push to each other\'s repositories. Learn the **fork** workflow, wire up **origin** and **upstream**, open pull requests across repositories, keep a fork **in sync**, and make your own projects welcoming to contributors.',
  lessons: [
    {
      id: 'forks',
      title: 'Forks and upstream',
      summary: 'Why you get a 403, what a fork is, and the origin/upstream setup.',
      minutes: 14,
      lab: {
        cwd: '~/chartkit',
        panels: ['github', 'graph'],
        setup(H) {
          H.remote('chartkit', 'chartkit', [
            { message: 'Create chartkit', files: { 'index.js': 'export const chart = {};\n', 'docs.md': '# Chartkit\n\nDraw beatiful charts.\n' } },
            { message: 'Add bar charts', files: { 'bar.js': 'export const bar = {};\n' } },
          ], { description: 'Beautiful charts in 3 lines' });
          H.cd('~');
          H.run('git clone -q https://github.com/chartkit/chartkit.git');
          H.cd('~/chartkit');
          H.world.labData = {};
        },
        onCommand(line, res, t) {
          if (/git push/.test(line) && res.out.some(l => /Permission to chartkit/.test(l))) t.world.labData.denied = true;
        },
        suggestions: ['git remote -v'],
        tasks: [
          { title: 'Fix the typo "beatiful" in docs.md and commit', solution: 'sed -i "s/beatiful/beautiful/" docs.md && git commit -am "Fix typo in docs"', check: t => /beautiful/.test(t.headFile('docs.md') || '') },
          { title: 'Try to push it and read the error', solution: 'git push', check: t => !!t.world.labData.denied },
          { title: 'Fork the project and rewire your remotes in one command', hint: '`gh repo fork --remote` renames origin to upstream and adds your fork as origin.', solution: 'gh repo fork --remote', check: t => /chartkit\/chartkit/.test(t.config('remote.upstream.url') || '') && /you\/chartkit/.test(t.config('remote.origin.url') || '') },
          { title: 'Check both remotes', solution: 'git remote -v', check: t => t.ran(/^git remote -v/) && !!t.config('remote.upstream.url') },
          { title: 'Put your commit on a branch docs/fix-typo and push it to your fork', solution: 'git switch -c docs/fix-typo && git push -u origin docs/fix-typo', check: t => { const h = t.remoteRef('you/chartkit', 'docs/fix-typo'); return !!h && /beautiful/.test(t.fileAt('docs/fix-typo', 'docs.md') || ''); } },
          { title: 'Keep main clean: reset your local main to upstream/main', solution: 'git switch main && git reset --hard upstream/main', check: t => t.ref('main') === t.ref('upstream/main') && t.branch() === 'main' },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What is a fork?', choices: ['A local clone', 'Your own server-side copy of someone else\'s repository on GitHub', 'A branch', 'A merge conflict'], answer: 1, explain: 'You can push to your fork; then you propose changes upstream via PR.' },
        { type: 'mc', q: 'In the usual fork setup, what are origin and upstream?', choices: ['origin = the original project, upstream = your fork', 'origin = your fork, upstream = the original project', 'Both are your fork', 'Both are the original'], answer: 1, explain: 'Push to origin, fetch from upstream.' },
        { type: 'mc', q: 'You cloned a project and `git push` says "Permission … denied … 403". What now?', choices: ['Use --force', 'Fork it, push to your fork, and open a pull request', 'Ask GitHub support', 'Delete .git and try again'], answer: 1, explain: 'You lack write access to the original.' },
        { type: 'type', q: 'Type the command that forks `chartkit/chartkit` to your account and clones your fork.', accept: ['gh repo fork chartkit/chartkit --clone', 'gh repo fork chartkit/chartkit --clone=true'], model: 'gh repo fork chartkit/chartkit --clone', explain: 'It also adds the original as upstream.' },
        { type: 'type', q: 'Type the command that adds `https://github.com/chartkit/chartkit.git` as a remote called upstream.', accept: ['git remote add upstream https://github.com/chartkit/chartkit.git'], model: 'git remote add upstream https://github.com/chartkit/chartkit.git', explain: 'Then `git fetch upstream`.' },
        { type: 'tf', q: 'You should do your contribution work directly on your fork\'s main branch.', answer: false, explain: 'Keep main as a clean mirror of upstream; use branches.' },
      ],
    },
    {
      id: 'contributing',
      title: 'Contributing upstream',
      summary: 'Fork, branch from upstream/main, push to your fork, and open a cross-repository PR.',
      minutes: 20,
      lab: {
        cwd: '~',
        panels: ['github', 'graph'],
        setup(H) {
          H.remote('bookworm', 'reader', [
            { message: 'Create reader', files: { 'README.md': '# Reader\n\nInstall with `npm install`.\n', 'reader.js': 'export const open = f => f;\n' }, author: MAINTAINER },
          ], { description: 'A tiny e-book reader' });
          H.issue('bookworm/reader', { title: 'README install command is outdated', body: 'We use `npm ci` now.', labels: ['good first issue', 'docs'], author: 'Lina Haddad' });
          H.world.labData = {};
        },
        events(ev, t) {
          const ld = t.world.labData;
          if (ev.type === 'pr-created' && ev.url === 'https://github.com/bookworm/reader.git' && !ld.reviewed) {
            ld.reviewed = true; ld.pr = ev.number;
            t.review('bookworm/reader', ev.number, 'CHANGES_REQUESTED', 'Thanks! Please also mention that Node 20 is required.', 'Lina Haddad');
            t.say(`[GitHub] Lina Haddad (maintainer) requested changes on bookworm/reader#${ev.number}: "Please also mention that Node 20 is required."`);
          }
          if (ev.type === 'push' && ld.reviewed && !ld.merged && /you\/reader/.test(ev.url || '') && ev.branch && ev.branch !== 'main') {
            const readme = t.world.objects.get(t.world.readTreeFlat(t.world.commit(ev.hash).tree).get('README.md'))?.content || '';
            if (/node\s*20/i.test(readme)) {
              ld.merged = true;
              t.review('bookworm/reader', ld.pr, 'APPROVED', 'Perfect, merging.', 'Lina Haddad');
              t.mergePR('bookworm/reader', ld.pr, 'squash');
              t.say(`[GitHub] Lina Haddad approved and merged bookworm/reader#${ld.pr}. Welcome, contributor!`);
            }
          }
        },
        tasks: [
          { title: 'Fork bookworm/reader and clone your fork', solution: 'gh repo fork bookworm/reader --clone', check: t => !!t.repoAt('~/reader') && /bookworm\/reader/.test(t.config('remote.upstream.url', t.repoAt('~/reader')) || '') },
          { title: 'Go into it and read issue #1 on the project', solution: 'cd reader && gh issue view 1', check: t => t.inDir('~/reader') && t.ran(/gh issue view\s+#?1/) },
          { title: "Create docs/install-command from upstream's latest main", solution: 'git fetch upstream && git switch -c docs/install-command upstream/main', check: t => t.branch() === 'docs/install-command' && t.isAncestor(t.ref('upstream/main'), t.headHash()) },
          { title: 'Change the install command to npm ci and commit', solution: 'sed -i "s/npm install/npm ci/" README.md && git commit -am "Use npm ci in the install instructions"', check: t => /npm ci/.test(t.headFile('README.md') || '') && t.branch() === 'docs/install-command' },
          { title: 'Push the branch to your fork', solution: 'git push -u origin docs/install-command', check: t => !!t.remoteRef('you/reader', 'docs/install-command') },
          { title: 'Open a PR to the project that fixes #1', solution: 'gh pr create --title "Use npm ci in the install instructions" --body "Fixes #1"', check: t => !!prIn(t, 'bookworm/reader', p => p.author === 'you' && p.headOwner === 'you' && /(fix|close|resolve)(e[sd]|s)?\s+#1\b/i.test(`${p.title} ${p.body}`)) },
          { title: 'Address the maintainer\'s review and push', solution: 'echo "Requires Node 20." >> README.md && git commit -am "Mention the Node 20 requirement" && git push', check: t => !!t.world.labData.merged && issueIn(t, 'bookworm/reader', 1)?.state === 'closed' },
          { title: 'Clean up: update your local main from upstream and delete the branch', solution: 'git switch main && git pull upstream main && git branch -D docs/install-command', check: t => t.branch() === 'main' && t.ref('main') === t.remoteRef('bookworm/reader', 'main') && !t.ref('docs/install-command') },
        ],
      },
      quiz: [
        { type: 'order', q: 'Order the open-source contribution flow.', items: ['gh repo fork owner/repo --clone', 'git switch -c fix/x upstream/main', 'commit the change', 'git push -u origin fix/x', 'gh pr create (into upstream)'], explain: 'Fork, branch from upstream, commit, push to your fork, PR to upstream.' },
        { type: 'mc', q: 'Where does your contribution PR point?', choices: ['From upstream:main to your fork', 'From your-fork:branch to upstream:main', 'From origin:main to origin:branch', 'Nowhere until merged'], answer: 1, explain: 'Head is your fork\'s branch; base is the project\'s main.' },
        { type: 'mc', q: 'Before starting a big feature for someone else\'s project, you should…', choices: ['Just open a huge PR', 'Open an issue and ask whether the maintainers would accept it', 'Fork and never tell anyone', 'Email every maintainer'], answer: 1, explain: 'It saves your time and theirs.' },
        { type: 'multi', q: 'Which make great first contributions?', choices: ['Fixing a typo in docs', 'Adding a missing test', 'Rewriting the whole architecture', 'An issue labelled good first issue'], answer: [0, 1, 3], explain: 'Start small and focused.' },
        { type: 'tf', q: 'After a squash merge upstream, `git branch -d my-branch` may refuse even though your work is in the project.', answer: true, explain: 'Upstream has a new squashed commit, not your original commits. Use -D once you confirmed the merge.' },
        { type: 'mc', q: 'Which file explains how a project wants contributions made?', choices: ['LICENSE', 'CONTRIBUTING.md', '.gitignore', 'package.json'], answer: 1, explain: 'Read it before you start.' },
      ],
    },
    {
      id: 'sync-fork',
      title: 'Keeping a fork in sync',
      summary: 'Fetch upstream, fast-forward main, update your fork, and rebase open branches.',
      minutes: 14,
      lab: {
        cwd: '~/reader',
        panels: ['graph', 'github'],
        setup(H) {
          H.remote('bookworm', 'reader', [
            { message: 'Create reader', files: { 'reader.js': 'export const open = f => f;\n' }, author: MAINTAINER },
          ], { description: 'A tiny e-book reader' });
          H.cd('~');
          H.run('gh repo fork bookworm/reader --clone');
          H.cd('~/reader');
          H.run('git switch -q -c fix/empty-library');
          H.commit('Handle an empty library', { 'library.js': 'export const books = [];\n' });
          H.run('git push -q -u origin fix/empty-library');
          H.run('git switch -q main');
          H.teammate('bookworm/reader', { files: { 'dark.css': 'body { background: #111; }\n' }, message: 'Add dark mode', author: MAINTAINER });
          H.teammate('bookworm/reader', { files: { 'search.js': 'export const search = q => q;\n' }, message: 'Add search', author: MAINTAINER });
          H.teammate('bookworm/reader', { files: { 'reader.js': 'export const open = f => f;\nexport const close = () => {};\n' }, message: 'Add close()', author: MAINTAINER });
        },
        suggestions: ['git fetch upstream', 'git log --oneline --graph --all'],
        tasks: [
          { title: "Download the project's new commits", solution: 'git fetch upstream', check: t => t.ref('upstream/main') === t.remoteRef('bookworm/reader', 'main') },
          { title: 'Fast-forward your local main to upstream/main', solution: 'git switch main && git merge --ff-only upstream/main', check: t => t.ref('main') === t.remoteRef('bookworm/reader', 'main') },
          { title: "Update your fork's main on GitHub", solution: 'git push origin main', check: t => t.remoteRef('you/reader', 'main') === t.remoteRef('bookworm/reader', 'main') },
          { title: 'Rebase fix/empty-library onto upstream/main', solution: 'git switch fix/empty-library && git rebase upstream/main', check: t => t.isAncestor(t.remoteRef('bookworm/reader', 'main'), t.ref('fix/empty-library')) && !t.state() },
          { title: 'Update the branch on your fork safely', solution: 'git push --force-with-lease', check: t => t.remoteRef('you/reader', 'fix/empty-library') === t.ref('fix/empty-library') },
        ],
      },
      quiz: [
        { type: 'order', q: 'Order the steps to sync your fork\'s main with the project.', items: ['git switch main', 'git fetch upstream', 'git merge --ff-only upstream/main', 'git push origin main'], explain: 'Fetch, fast-forward locally, update the fork.' },
        { type: 'mc', q: '`git merge --ff-only upstream/main` refuses on your main. What does that tell you?', choices: ['Upstream is broken', 'Your main has commits upstream does not have (you committed on main)', 'You need --force', 'The fork was deleted'], answer: 1, explain: 'Move those commits to a branch and reset main to upstream/main.' },
        { type: 'type', q: 'Type the gh command that syncs your fork\'s default branch with upstream on GitHub.', accept: ['gh repo sync'], model: 'gh repo sync', explain: 'Then pull locally too.' },
        { type: 'mc', q: 'Your open PR branch is far behind upstream. A maintainer asks you to update it. A common approach?', choices: ['git rebase upstream/main then git push --force-with-lease', 'Close the PR', 'Merge your branch into upstream directly', 'git push upstream --force'], answer: 0, explain: 'Your branch on your fork: rewriting it is fine.' },
        { type: 'tf', q: 'A fork updates itself automatically when the original project changes.', answer: false, explain: 'You have to sync it.' },
      ],
    },
    {
      id: 'oss-etiquette',
      title: 'Open-source etiquette and community files',
      summary: 'README, LICENSE, CONTRIBUTING, code of conduct and good first issues.',
      minutes: 14,
      lab: {
        cwd: '~/tinyparse',
        panels: ['github', 'files'],
        setup(H) {
          H.remote('you', 'tinyparse', [{ message: 'Create tinyparse', files: { 'README.md': '# tinyparse\nparses things\n', 'parse.js': 'export const parse = s => s.split(",");\n' } }], { description: 'A tiny CSV parser' });
          H.cd('~');
          H.run('git clone -q https://github.com/you/tinyparse.git');
          H.cd('~/tinyparse');
        },
        suggestions: ['cat README.md', 'edit README.md'],
        tasks: [
          { title: 'Give the README an "## Install" and a "## Usage" section, and commit', solution: 'edit README.md → git commit -am "Document installation and usage"', test: [{ cmd: 'edit README.md', edit: '# tinyparse\n\nA tiny CSV parser.\n\n## Install\n\nnpm install tinyparse\n\n## Usage\n\nparse("a,b")\n' }, 'git commit -am "Document installation and usage"'], check: t => /## Install/i.test(t.headFile('README.md') || '') && /## Usage/i.test(t.headFile('README.md') || '') },
          { title: 'Add an MIT LICENSE and commit it', solution: 'echo "MIT License" > LICENSE && git add LICENSE && git commit -m "Add MIT license"', check: t => /MIT/.test(t.headFile('LICENSE') || '') },
          { title: 'Add CONTRIBUTING.md and CODE_OF_CONDUCT.md, and commit them', solution: 'echo "# Contributing" > CONTRIBUTING.md && echo "# Code of Conduct" > CODE_OF_CONDUCT.md && git add . && git commit -m "Add contributing guide and code of conduct"', check: t => t.inHead('CONTRIBUTING.md') && t.inHead('CODE_OF_CONDUCT.md') },
          { title: 'Push everything', solution: 'git push', check: t => t.remoteRef('you/tinyparse', 'main') === t.ref('main') },
          { title: 'Create an issue for newcomers, labelled "good first issue"', solution: 'gh issue create --title "Support semicolon separators" --body "Add an option to split on ;" --label "good first issue"', check: t => (t.remote('you/tinyparse')?.meta.issues || []).some(i => i.labels.includes('good first issue')) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'A public repository has no LICENSE file. May others legally reuse the code?', choices: ['Yes, public means free', 'No: without a license, all rights are reserved', 'Only for non-commercial use', 'Only after 30 days'], answer: 1, explain: 'Choose a license to grant permission.' },
        { type: 'mc', q: 'Which license requires derivative works to stay open under the same license?', choices: ['MIT', 'Apache-2.0', 'GPL-3.0', 'None of them'], answer: 2, explain: 'GPL is "copyleft"; MIT and Apache are permissive.' },
        { type: 'mc', q: 'You found a security vulnerability in an open-source project. Where do you report it?', choices: ['A public issue', 'Privately, following SECURITY.md or contacting the maintainers', 'On social media', 'In a PR title'], answer: 1, explain: 'Public reports put users at risk before a fix exists.' },
        { type: 'multi', q: 'Which files help newcomers contribute?', choices: ['CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', 'Issue templates', 'A 50 MB build folder'], answer: [0, 1, 2], explain: 'Clear guidance lowers the barrier.' },
        { type: 'tf', q: 'Maintainers of volunteer projects owe you a fix for any issue you file.', answer: false, explain: 'Be patient and offer to help.' },
      ],
    },
    {
      id: 'opensource-boss',
      title: 'Boss: Your first real contribution',
      summary: 'Fork, stay current while maintainers merge, open a PR, respond to review, and sync.',
      minutes: 25,
      boss: true,
      lab: {
        cwd: '~',
        panels: ['github', 'graph', 'files'],
        setup(H) {
          H.remote('mapkit-community', 'tiles', [
            { message: 'Create tile server', files: { 'config.json': '{ "defaultZoom": 21, "maxZoom": 22 }\n', 'server.js': 'export const serve = () => {};\n' }, author: { name: 'Jonas Berg', email: 'jonas@mapkit.example' } },
          ], { description: 'Community map tile server' });
          H.issue('mapkit-community/tiles', { title: 'Default zoom should be 12, not 21', body: 'Typo in config.json.', labels: ['good first issue'], author: 'Jonas Berg' });
          H.world.labData = {};
        },
        events(ev, t) {
          const ld = t.world.labData;
          const up = 'https://github.com/mapkit-community/tiles.git';
          if (ev.type === 'fork' && !ld.moved1) {
            ld.moved1 = true;
            t.teammate('mapkit-community/tiles', { files: { 'retina.js': 'export const scale = 2;\n' }, message: 'Add retina tiles', author: { name: 'Jonas Berg', email: 'jonas@mapkit.example' } });
            t.say('[GitHub] Maintainers merged "Add retina tiles" into mapkit-community/tiles:main.');
          }
          if (ev.type === 'pr-created' && ev.url === up && !ld.pr) {
            const bare = t.world.remotes.get(up);
            const pr = bare.meta.prs.find(p => p.number === ev.number);
            const head = t.world.remotes.get(pr.headRepo).refs['refs/heads/' + pr.head];
            ld.pr = ev.number;
            ld.basedOnLatest = t.isAncestor(bare.refs['refs/heads/main'], head);
            t.review('mapkit-community/tiles', ev.number, 'CHANGES_REQUESTED', 'Nice! Please also lower maxZoom to 18 while you are there.', 'Jonas Berg');
            t.say(`[GitHub] Jonas Berg requested changes on #${ev.number}: "Please also lower maxZoom to 18 while you are there."`);
          }
          if (ev.type === 'push' && ld.pr && !ld.merged && /you\/tiles/.test(ev.url || '') && ev.branch !== 'main') {
            const cfg = t.world.objects.get(t.world.readTreeFlat(t.world.commit(ev.hash).tree).get('config.json'))?.content || '';
            if (/"maxZoom":\s*18/.test(cfg)) {
              ld.merged = true;
              t.review('mapkit-community/tiles', ld.pr, 'APPROVED', 'Thank you!', 'Jonas Berg');
              t.mergePR('mapkit-community/tiles', ld.pr, 'squash');
              t.say(`[GitHub] Jonas Berg merged #${ld.pr}. Congratulations on your contribution!`);
            }
          }
        },
        tasks: [
          { title: 'Fork mapkit-community/tiles with a clone, and go into it', solution: 'gh repo fork mapkit-community/tiles --clone && cd tiles', check: t => !!t.repoAt('~/tiles') && t.inDir('~/tiles') && /mapkit-community\/tiles/.test(t.config('remote.upstream.url') || '') },
          {
            title: 'On a branch based on the LATEST upstream main, set defaultZoom to 12 and commit',
            hint: 'Fetch upstream first. Your fork was created before the maintainers merged their latest change.',
            solution: 'git fetch upstream && git switch -c fix/default-zoom upstream/main && sed -i "s/\\"defaultZoom\\": 21/\\"defaultZoom\\": 12/" config.json && git commit -am "Set the default zoom to 12"',
            test: ['git fetch upstream && git switch -c fix/default-zoom upstream/main', { cmd: 'edit config.json', edit: '{ "defaultZoom": 12, "maxZoom": 22 }\n' }, 'git commit -am "Set the default zoom to 12"'],
            check: t => t.branch() && t.branch() !== 'main' && /"defaultZoom":\s*12/.test(t.headFile('config.json') || '') && t.isAncestor(t.remoteRef('mapkit-community/tiles', 'main'), t.headHash()),
          },
          { title: 'Push to your fork and open a PR to the project that closes issue #1', solution: 'git push -u origin fix/default-zoom && gh pr create --title "Set the default zoom to 12" --body "Fixes #1"', check: t => !!t.world.labData.pr && !!t.world.labData.basedOnLatest && !!prIn(t, 'mapkit-community/tiles', p => /(fix|close|resolve)(e[sd]|s)?\s+#1\b/i.test(`${p.title} ${p.body}`)) },
          { title: 'Answer the review: lower maxZoom to 18, commit and push', solution: 'edit config.json → git commit -am "Lower maxZoom to 18" && git push', test: [{ cmd: 'edit config.json', edit: '{ "defaultZoom": 12, "maxZoom": 18 }\n' }, 'git commit -am "Lower maxZoom to 18" && git push'], check: t => !!t.world.labData.merged && issueIn(t, 'mapkit-community/tiles', 1)?.state === 'closed' },
          { title: 'Sync: local main and your fork\'s main equal upstream main; delete your branch', solution: 'git switch main && git fetch upstream && git merge --ff-only upstream/main && git push origin main && git branch -D fix/default-zoom', check: t => { const up = t.remoteRef('mapkit-community/tiles', 'main'); return t.ref('main') === up && t.remoteRef('you/tiles', 'main') === up && !t.ref('fix/default-zoom'); } },
        ],
      },
      quiz: [
        { type: 'mc', q: 'Your fork was created last week. Before branching for a new PR, what should you do?', choices: ['Nothing', 'git fetch upstream and branch from upstream/main', 'Delete the fork', 'Push to upstream'], answer: 1, explain: 'Base work on the project\'s latest code.' },
        { type: 'mc', q: 'The maintainer requests changes on your PR from a fork. How do you update it?', choices: ['Push new commits to the same branch on your fork', 'Open a new PR', 'Push to upstream', 'Email a patch'], answer: 0, explain: 'The PR follows your fork\'s branch.' },
        { type: 'multi', q: 'Which remotes does a typical contributor\'s clone have?', choices: ['origin (their fork)', 'upstream (the project)', 'github (always required)', 'backup'], answer: [0, 1], explain: 'Two remotes, by convention.' },
        { type: 'tf', q: 'After your PR is merged, your fork\'s main automatically includes your change.', answer: false, explain: 'Sync your fork to get the merged result.' },
        { type: 'mc', q: '`git push upstream fix/x` fails with 403. Why?', choices: ['Upstream is offline', 'You do not have write access to the original project; push to origin', 'The branch name is invalid', 'You need --force'], answer: 1, explain: 'That is the whole reason for a fork.' },
        { type: 'type', q: 'Type the command that fast-forwards your current (main) branch to upstream\'s main, refusing anything else.', accept: ['git merge --ff-only upstream/main', 'git pull --ff-only upstream main'], model: 'git merge --ff-only upstream/main', explain: 'After git fetch upstream.' },
      ],
    },
  ],
};
