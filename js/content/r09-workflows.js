// Realm 9 · Team Workflows: GitHub flow, git flow & trunk-based, conventions, tags & releases, protection.

const PRIYA = { name: 'Priya Sharma', email: 'priya@example.com' };
const CONV = /^(feat|fix|docs|refactor|test|chore|perf|ci|build|style)(\([\w./-]+\))?!?: .{3,}/;
const prsIn = (t, owner) => t.remote(owner)?.meta.prs || [];
const autoApprove = (owner) => (ev, t) => {
  if (ev.type === 'pr-created' && ev.url === `https://github.com/${owner}.git`) {
    t.review(owner, ev.number, 'APPROVED', 'Looks good to me.', 'Priya Sharma');
    t.say(`[GitHub] Priya Sharma approved #${ev.number}.`);
  }
};

export default {
  id: 'workflows',
  n: 9,
  title: 'Team Workflows',
  tagline: 'Branching strategies, commit conventions, releases and protected branches',
  badge: 'Release Captain',
  intro: 'Git gives you mechanisms; teams turn them into **workflows**. Compare GitHub flow, git flow and trunk-based development, write **Conventional Commits**, version releases with **tags and semver**, and work inside **protected branches** with CODEOWNERS.',
  lessons: [
    {
      id: 'github-flow',
      title: 'GitHub flow',
      summary: 'Main is always deployable; every change is a short branch and a pull request.',
      minutes: 14,
      lab: {
        cwd: '~/tracker',
        panels: ['github', 'graph'],
        setup(H) {
          H.remote('acme', 'tracker', [{ message: 'Create tracker', files: { 'index.html': '<h1>Tracker</h1>\n', 'footer.html': '<footer>© 2025</footer>\n' } }], { collaborators: ['you'] });
          H.cd('~');
          H.run('git clone -q https://github.com/acme/tracker.git');
          H.cd('~/tracker');
          H.teammate('acme/tracker', { files: { 'tasks.js': 'export const tasks = [];\n' }, message: 'Add task list', author: PRIYA });
        },
        events: autoApprove('acme/tracker'),
        suggestions: ['git pull', 'gh pr list'],
        tasks: [
          { title: 'Start from an up-to-date main', solution: 'git switch main && git pull', check: t => t.ref('main') === t.remoteRef('acme/tracker', 'main') && t.ran(/git pull/) },
          { title: 'Branch feature/dark-mode, commit, push, and open a DRAFT pull request', solution: 'git switch -c feature/dark-mode && echo "body.dark { background: #111; }" > dark.css && git add dark.css && git commit -m "Add dark mode styles" && git push -u origin feature/dark-mode && gh pr create --fill --draft', check: t => prsIn(t, 'acme/tracker').some(p => p.head === 'feature/dark-mode' && p.draft) },
          { title: 'Mark it ready for review', solution: 'gh pr ready', check: t => prsIn(t, 'acme/tracker').some(p => p.head === 'feature/dark-mode' && !p.draft) },
          { title: 'Squash-merge it and delete the branch', solution: 'gh pr merge --squash --delete-branch', check: t => prsIn(t, 'acme/tracker').some(p => p.head === 'feature/dark-mode' && p.state === 'merged') },
          { title: 'Run the loop again: fix the footer year (2025 → 2026) on fix/footer-year and merge it through a PR', solution: 'git switch main && git pull && git switch -c fix/footer-year && sed -i "s/2025/2026/" footer.html && git commit -am "Update the footer year" && git push -u origin fix/footer-year && gh pr create --fill && gh pr merge --squash --delete-branch', check: t => prsIn(t, 'acme/tracker').some(p => p.head === 'fix/footer-year' && p.state === 'merged') && /2026/.test(t.world.objects.get(t.world.readTreeFlat(t.world.commit(t.remoteRef('acme/tracker', 'main')).tree).get('footer.html'))?.content || '') },
          { title: 'End on an up-to-date main', solution: 'git switch main && git pull', allowEarly: true, check: t => t.branch() === 'main' && t.ref('main') === t.remoteRef('acme/tracker', 'main') },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What is the one rule of GitHub flow?', choices: ['Never use branches', 'Anything in main is deployable', 'Release every Friday', 'Only admins merge'], answer: 1, explain: 'Every change reaches main through a reviewed, tested PR.' },
        { type: 'mc', q: 'Which practice makes GitHub flow safe for unfinished features?', choices: ['Long-lived feature branches', 'Feature flags', 'Force pushing', 'Skipping CI'], answer: 1, explain: 'Merge code that is switched off until ready.' },
        { type: 'order', q: 'Order the GitHub flow loop.', items: ['Branch from up-to-date main', 'Commit and push', 'Open a pull request', 'Review and checks', 'Merge to main', 'Deploy'], explain: 'Small, continuous loops.' },
        { type: 'mc', q: 'When is GitHub flow a weaker fit?', choices: ['A web app deployed many times a day', 'A product where several released versions must be maintained at once', 'A small team', 'Any project with CI'], answer: 1, explain: 'Versioned products often add release branches.' },
        { type: 'type', q: 'Type the gh command that marks the current branch\'s draft PR as ready for review.', accept: ['gh pr ready'], model: 'gh pr ready', explain: 'Draft PRs cannot be merged until ready.' },
      ],
    },
    {
      id: 'git-flow-trunk',
      title: 'Git flow and trunk-based development',
      summary: 'Develop, release and hotfix branches versus one trunk with feature flags.',
      minutes: 20,
      lab: {
        cwd: '~/banking',
        panels: ['graph', 'files'],
        setup(H) {
          H.repo('~/banking');
          H.commit('Release 2.0.0', { 'version.txt': '2.0.0\n', 'app.js': 'export const app = {};\n' });
          H.run('git tag -a v2.0.0 -m "Release 2.0.0"');
          H.run('git switch -q -c develop');
          H.commit('Add savings goals', { 'goals.js': 'export const goals = [];\n' });
          H.run('git switch -q -c feature/statements');
          H.commit('Add monthly statements', { 'statements.js': 'export const statements = [];\n' });
          H.commit('Export statements as PDF', { 'statements.js': 'export const statements = [];\nexport const pdf = () => {};\n' });
          H.world.labData = { feature: H.shell.repo.refs['refs/heads/feature/statements'] };
        },
        suggestions: ['git log --oneline --graph --all'],
        tasks: [
          { title: 'Merge feature/statements into develop with a merge commit', solution: 'git switch develop && git merge --no-ff --no-edit feature/statements', check: t => { const h = t.ref('develop'); return h && t.world.commit(h).parents.length === 2 && t.isAncestor(t.world.labData.feature, h); } },
          { title: 'Cut release/2.1 from develop', solution: 'git switch -c release/2.1 develop', check: t => !!t.ref('release/2.1') && t.isAncestor(t.ref('develop'), t.ref('release/2.1')) },
          { title: 'On release/2.1, set version.txt to 2.1.0 and commit', solution: 'git switch release/2.1 && echo "2.1.0" > version.txt && git commit -am "Bump version to 2.1.0"', check: t => (t.fileAt('release/2.1', 'version.txt') || '').trim() === '2.1.0' },
          { title: 'Merge the release into main (no fast-forward) and tag it v2.1.0 (annotated)', solution: 'git switch main && git merge --no-ff --no-edit release/2.1 && git tag -a v2.1.0 -m "Release 2.1.0"', check: t => { const tag = t.repo.refs['refs/tags/v2.1.0']; return t.isAncestor(t.ref('release/2.1'), t.ref('main')) && !!tag && t.world.objects.get(tag).type === 'tag' && t.world.peel(tag) === t.ref('main'); } },
          { title: 'Merge the release back into develop', solution: 'git switch develop && git merge --no-edit release/2.1', check: t => t.isAncestor(t.ref('release/2.1'), t.ref('develop')) },
          { title: 'Hotfix: from main, create hotfix/2.1.1, fix app.js and set version 2.1.1, commit', solution: 'git switch -c hotfix/2.1.1 main && echo "export const app = { safe: true };" > app.js && echo "2.1.1" > version.txt && git commit -am "Fix crash on login"', check: t => (t.fileAt('hotfix/2.1.1', 'version.txt') || '').trim() === '2.1.1' && t.isAncestor(t.ref('v2.1.0'), t.ref('hotfix/2.1.1')) },
          { title: 'Merge the hotfix into main, tag v2.1.1, and merge it into develop too', solution: 'git switch main && git merge --no-ff --no-edit hotfix/2.1.1 && git tag -a v2.1.1 -m "Release 2.1.1" && git switch develop && git merge --no-edit hotfix/2.1.1', check: t => { const hf = t.ref('hotfix/2.1.1'); return t.isAncestor(hf, t.ref('main')) && t.isAncestor(hf, t.ref('develop')) && !!t.repo.refs['refs/tags/v2.1.1'] && !t.state(); } },
        ],
      },
      quiz: [
        { type: 'mc', q: 'In git flow, where do feature branches start and end?', choices: ['From main, into main', 'From develop, into develop', 'From release, into main', 'From hotfix, into develop'], answer: 1, explain: 'main only receives releases and hotfixes.' },
        { type: 'mc', q: 'Why must a git-flow hotfix be merged into develop as well as main?', choices: ['It is optional', 'Otherwise the next release, cut from develop, would bring the bug back', 'develop is the production branch', 'To create a tag'], answer: 1, explain: 'Both long-lived branches need the fix.' },
        { type: 'mc', q: 'What is the core practice of trunk-based development?', choices: ['Long-lived feature branches', 'Everyone integrates small changes into one trunk at least daily', 'Releases only once a year', 'No tests'], answer: 1, explain: 'Supported by strong CI and feature flags.' },
        { type: 'multi', q: 'Which situations suit git flow?', choices: ['A mobile app with several supported versions', 'Software with scheduled, versioned releases', 'A small web app deploying hourly', 'A product needing hotfixes for old versions'], answer: [0, 1, 3], explain: 'Continuous web deployment usually prefers GitHub flow or trunk-based.' },
        { type: 'tf', q: 'There is one correct branching workflow for every team.', answer: false, explain: 'Choose based on release style, team size and tooling.' },
      ],
    },
    {
      id: 'commit-conventions',
      title: 'Commit conventions',
      summary: 'Conventional Commits and atomic commits: searchable history and automated releases.',
      minutes: 14,
      lab: {
        cwd: '~/library',
        panels: ['graph'],
        setup(H) {
          H.repo('~/library');
          H.commit('chore: initial project setup', { 'index.js': 'export * from "./books.js";\n', 'books.js': 'export const books = [];\n', 'README.md': '# Library\n' });
        },
        suggestions: ['git log --oneline'],
        tasks: [
          { title: 'Add search.js and commit it as a feature with the scope "search"', solution: 'echo "export const search = q => q;" > search.js && git add search.js && git commit -m "feat(search): add search by title"', check: t => /^feat\(search\)!?: .{3,}/.test(t.head().message) && t.inHead('search.js') },
          { title: 'Fix a bug in books.js and commit it as a fix', detail: 'Change books to start with one sample book, for example.', solution: 'echo "export const books = [{ title: \'Dune\' }];" > books.js && git commit -am "fix(books): start with a sample book so the list is never empty"', check: t => /^fix(\([\w./-]+\))?: .{3,}/.test(t.head().message) },
          { title: 'Document the search feature in README.md and commit it as docs', solution: 'echo "Search with search(query)." >> README.md && git commit -am "docs: explain how to search"', check: t => /^docs(\([\w./-]+\))?: .{3,}/.test(t.head().message) },
          { title: 'Make a breaking change: rename books.js to catalog.js, and mark the commit as breaking', hint: 'Use `!` after the type, e.g. `refactor!: …`, or a `BREAKING CHANGE:` footer.', solution: 'git mv books.js catalog.js && sed -i "s/books.js/catalog.js/" index.js && git commit -am "refactor!: rename books module to catalog" -m "BREAKING CHANGE: import from catalog.js instead of books.js"', check: t => t.inHead('catalog.js') && !t.inHead('books.js') && (/^\w+(\([\w./-]+\))?!: /.test(t.head().message) || /BREAKING CHANGE:/.test(t.head().message)) },
          { title: 'List only the feature commits', solution: 'git log --oneline --grep="^feat"', check: t => t.ran(/^git log\b.*--grep[= ]"?\^?feat/) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'Which message follows Conventional Commits?', choices: ['Fixed the cart', 'fix(cart): keep quantities when the page reloads', 'FIX - cart', 'cart fix!!!'], answer: 1, explain: 'type(scope): description.' },
        { type: 'mc', q: 'With semantic versioning, which commit type normally triggers a MINOR version bump?', choices: ['fix', 'feat', 'docs', 'chore'], answer: 1, explain: 'feat → minor, fix → patch, breaking → major.' },
        { type: 'multi', q: 'How can a Conventional Commit mark a breaking change?', choices: ['feat!: …', 'A footer "BREAKING CHANGE: …"', 'Writing it in capitals', 'Adding a tag'], answer: [0, 1], explain: 'Either form signals a major version.' },
        { type: 'mc', q: 'What makes a commit "atomic"?', choices: ['It is very small, always under 10 lines', 'One logical change that builds and can be reverted on its own', 'It touches only one file', 'It has no message body'], answer: 1, explain: 'Size follows from purpose, not a line count.' },
        { type: 'type', q: 'Type a git command that lists commits whose messages start with "fix".', accept: ['git log --grep="^fix"', 'git log --oneline --grep="^fix"', "git log --grep='^fix'", 'git log --grep=^fix', 'git log --oneline --grep=^fix'], model: 'git log --oneline --grep="^fix"', explain: '--grep takes a regular expression.' },
        { type: 'tf', q: 'With squash merging, the PR title usually becomes the commit message on main.', answer: true, explain: 'So enforce the convention on PR titles.' },
      ],
    },
    {
      id: 'tags-releases',
      title: 'Tags, versions and releases',
      summary: 'Annotated tags, semantic versioning and GitHub releases.',
      minutes: 15,
      lab: {
        cwd: '~/weatherly',
        panels: ['github', 'graph'],
        setup(H) {
          H.remote('acme', 'weatherly', [
            { message: 'feat: show current temperature', files: { 'app.js': 'export const temp = 21;\n' } },
          ], { collaborators: ['you'] });
          H.cd('~');
          H.run('git clone -q https://github.com/acme/weatherly.git');
          H.cd('~/weatherly');
          H.run('git tag -a v1.0.0 -m "Release 1.0.0"');
          H.run('git push -q origin v1.0.0');
          H.commit('feat: add 5-day forecast', { 'forecast.js': 'export const days = 6;\n' });
          H.run('git push -q');
        },
        suggestions: ['git tag', 'git log --oneline --decorate'],
        tasks: [
          { title: 'List the existing tags', solution: 'git tag', check: t => t.ran(/^git tag$/) || t.ran(/^git tag -l/) },
          { title: 'The forecast is a new feature: create the annotated tag v1.1.0 on HEAD', solution: 'git tag -a v1.1.0 -m "Release 1.1.0"', check: t => { const tg = t.repo.refs['refs/tags/v1.1.0']; return !!tg && t.world.objects.get(tg).type === 'tag' && t.world.peel(tg) === t.headHash(); } },
          { title: 'Push the tag to GitHub', solution: 'git push origin v1.1.0', check: t => !!t.remote('acme/weatherly').refs['refs/tags/v1.1.0'] },
          { title: 'Publish a GitHub release for v1.1.0 with generated notes', solution: 'gh release create v1.1.0 --generate-notes', check: t => t.remote('acme/weatherly').meta.releases.some(r => r.tag === 'v1.1.0') },
          { title: 'Bug report: the forecast shows 6 days instead of 5. Fix forecast.js, commit it as a fix, and push', detail: 'Set `days` to 5.', solution: 'echo "export const days = 5;" > forecast.js && git commit -am "fix: show exactly five forecast days" && git push', check: t => /^fix(\(.+\))?: /.test(t.world.commit(t.remoteRef('acme/weatherly', 'main')).message) && /days = 5/.test(t.world.objects.get(t.world.readTreeFlat(t.world.commit(t.remoteRef('acme/weatherly', 'main')).tree).get('forecast.js')).content) },
          { title: 'Release the patch: tag v1.1.1, push it, publish the release', solution: 'git tag -a v1.1.1 -m "Release 1.1.1" && git push origin v1.1.1 && gh release create v1.1.1 --generate-notes', check: t => !!t.remote('acme/weatherly').refs['refs/tags/v1.1.1'] && t.remote('acme/weatherly').meta.releases.some(r => r.tag === 'v1.1.1') && t.world.peel(t.remote('acme/weatherly').refs['refs/tags/v1.1.1']) === t.remoteRef('acme/weatherly', 'main') },
          { title: 'Ask git to describe HEAD relative to the latest tag', solution: 'git describe', check: t => t.ran(/^git describe/) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'How does a tag differ from a branch?', choices: ['Tags are bigger', 'A tag never moves; a branch moves with new commits', 'Tags cannot be pushed', 'Branches cannot point at old commits'], answer: 1, explain: 'Tags mark fixed points like releases.' },
        { type: 'type', q: 'Type the command that creates an annotated tag v2.0.0 with the message "Release 2.0.0".', accept: ['git tag -a v2.0.0 -m "Release 2.0.0"', 'git tag -am "Release 2.0.0" v2.0.0', 'git tag v2.0.0 -a -m "Release 2.0.0"'], model: 'git tag -a v2.0.0 -m "Release 2.0.0"', explain: 'Annotated tags store tagger, date and message.' },
        { type: 'tf', q: '`git push` sends your new tags to the remote by default.', answer: false, explain: 'Push them explicitly: git push origin <tag> or --tags.' },
        { type: 'mc', q: 'Current version 3.4.2. You add a backwards-compatible feature. Next version?', choices: ['3.4.3', '3.5.0', '4.0.0', '3.4.2.1'], answer: 1, explain: 'Minor bump, patch resets.' },
        { type: 'mc', q: 'Current version 3.4.2. You remove a public API function. Next version?', choices: ['3.4.3', '3.5.0', '4.0.0', '3.4.2'], answer: 2, explain: 'Breaking change → major.' },
        { type: 'predict', q: 'What does this output mean?', code: '$ git describe --tags\nv1.1.0-3-g9e8f7b6', choices: ['Version 1.1.0 build 3', 'HEAD is 3 commits after tag v1.1.0, at commit 9e8f7b6', 'Three tags exist', 'The tag is broken'], answer: 1, explain: 'tag-distance-g<short id>.' },
      ],
    },
    {
      id: 'protected-branches',
      title: 'Protected branches and CODEOWNERS',
      summary: 'Work within required reviews and checks, and route reviews with CODEOWNERS.',
      minutes: 14,
      lab: {
        cwd: '~/payments',
        panels: ['github', 'graph', 'files'],
        setup(H) {
          H.remote('acme', 'payments', [{ message: 'Create payments', files: { 'payments/charge.js': 'export const charge = {};\n', '.github/CODEOWNERS': '* @acme/core\n' } }], { collaborators: ['you'] });
          H.protect('acme/payments', 'main', { requirePR: true, requiredReviews: 1 });
          H.cd('~');
          H.run('git clone -q https://github.com/acme/payments.git');
          H.cd('~/payments');
          H.world.labData = {};
        },
        onCommand(line, res, t) {
          const ld = t.world.labData;
          if (/^gh pr (view|checks|status)/.test(line) && !ld.approved) {
            const pr = (t.remote('acme/payments')?.meta.prs || []).find(p => p.state === 'open');
            if (pr) { ld.approved = true; t.review('acme/payments', pr.number, 'APPROVED', 'Payments owners approve.', 'Priya Sharma'); t.say(`[GitHub] Priya Sharma (@acme/payments-team) approved #${pr.number}.`); }
          }
        },
        suggestions: ['cat .github/CODEOWNERS'],
        tasks: [
          { title: 'Add "/payments/ @acme/payments-team" to .github/CODEOWNERS, commit on main and try to push', solution: 'echo "/payments/ @acme/payments-team" >> .github/CODEOWNERS && git commit -am "Make the payments team own payments/" && git push', check: t => t.events('push-rejected').length > 0 },
          { title: 'Move the commit to a branch chore/codeowners and reset main to origin/main', solution: 'git switch -c chore/codeowners && git switch main && git reset --hard origin/main', check: t => /payments-team/.test(t.fileAt('chore/codeowners', '.github/CODEOWNERS') || '') && t.ref('main') === t.ref('origin/main') },
          { title: 'Push the branch and open a pull request', solution: 'git switch chore/codeowners && git push -u origin chore/codeowners && gh pr create --fill', check: t => (t.remote('acme/payments')?.meta.prs || []).some(p => p.head === 'chore/codeowners' && p.state === 'open') },
          { title: 'Check what is blocking the merge', solution: 'gh pr view', check: t => t.ran(/^gh pr (view|checks|status)/) },
          { title: 'Once approved, merge it', solution: 'gh pr merge --squash --delete-branch', check: t => (t.remote('acme/payments')?.meta.prs || []).some(p => p.head === 'chore/codeowners' && p.state === 'merged') },
        ],
      },
      quiz: [
        { type: 'multi', q: 'Which can branch protection require?', choices: ['A pull request before merging', 'A number of approving reviews', 'Passing status checks', 'That commits are written in English'], answer: [0, 1, 2], explain: 'Plus code-owner reviews, linear history, and blocking force pushes.' },
        { type: 'mc', q: 'What does `.github/CODEOWNERS` do?', choices: ['Lists repository admins', 'Maps paths to the people/teams responsible, who get review requests (and can be required approvers)', 'Stores passwords', 'Defines CI jobs'], answer: 1, explain: 'e.g. /payments/ @acme/payments-team.' },
        { type: 'mc', q: 'You pushed to a protected main and got "GH006: Protected branch update failed". What is the right move?', choices: ['Ask an admin to disable protection', 'Move your work to a branch and open a PR', 'Force push', 'Delete main'], answer: 1, explain: 'Protection is doing its job.' },
        { type: 'tf', q: 'A PR author\'s own approval counts towards required reviews.', answer: false, explain: 'Approvals must come from other people with write access.' },
        { type: 'predict', q: 'Who is requested for review on a PR touching payments/charge.js?', code: '# .github/CODEOWNERS\n*            @acme/core\n/payments/   @acme/payments-team', choices: ['@acme/core', '@acme/payments-team', 'Both equally, always', 'Nobody'], answer: 1, explain: 'The last matching pattern wins.' },
      ],
    },
    {
      id: 'workflows-boss',
      title: 'Boss: Release day at Harbour',
      summary: 'Ship features and fixes through protected PRs with conventional titles, then tag and release.',
      minutes: 25,
      boss: true,
      lab: {
        cwd: '~',
        panels: ['github', 'graph'],
        setup(H) {
          H.remote('harbour', 'app', [
            { message: 'feat: track containers', files: { 'containers.js': 'export const containers = [];\n', 'ports.js': 'export const ports = ["Rotterdam", "Singapore"];\n' } },
          ], { collaborators: ['you'], description: 'Shipping logistics' });
          const bare = H.world.remotes.get('https://github.com/harbour/app.git');
          bare.refs['refs/tags/v1.2.0'] = bare.refs['refs/heads/main'];
          H.protect('harbour/app', 'main', { requirePR: true, requiredReviews: 1 });
        },
        events: autoApprove('harbour/app'),
        tasks: [
          { title: 'Clone harbour/app and go into it', solution: 'git clone https://github.com/harbour/app.git && cd app', check: t => !!t.repoAt('~/app') && t.inDir('~/app') },
          { title: 'Ship a feature (add Hamburg to ports.js) through a PR whose title follows Conventional Commits', solution: 'git switch -c feat/hamburg && echo \'export const ports = ["Rotterdam", "Singapore", "Hamburg"];\' > ports.js && git commit -am "feat(ports): add Hamburg" && git push -u origin feat/hamburg && gh pr create --title "feat(ports): add Hamburg" --body "Adds the port of Hamburg."', check: t => prsIn(t, 'harbour/app').some(p => CONV.test(p.title) && /^feat/.test(p.title)) },
          { title: 'Squash-merge it (it was approved) and delete the branch', solution: 'gh pr merge --squash --delete-branch', check: t => { const m = t.world.commit(t.remoteRef('harbour/app', 'main')).message; return /^feat/.test(m) && prsIn(t, 'harbour/app').some(p => p.state === 'merged'); } },
          { title: 'Release v1.3.0: annotated tag on the merged main, pushed, plus a GitHub release', solution: 'git switch main && git pull && git tag -a v1.3.0 -m "Release 1.3.0" && git push origin v1.3.0 && gh release create v1.3.0 --generate-notes', check: t => { const b = t.remote('harbour/app'); const tg = b.refs['refs/tags/v1.3.0']; return !!tg && t.world.objects.get(tg).type === 'tag' && /Hamburg/.test(t.world.objects.get(t.world.readTreeFlat(t.world.commit(t.world.peel(tg)).tree).get('ports.js')).content) && b.meta.releases.some(r => r.tag === 'v1.3.0'); } },
          { title: 'Bug report: container lookups are slow. Make containers.js store a Map, through a PR titled "fix: …", and merge it', detail: 'Change containers.js to `export const containers = new Map();`.', solution: 'git switch -c fix/containers-map && echo "export const containers = new Map();" > containers.js && git commit -am "fix: store containers in a Map" && git push -u origin fix/containers-map && gh pr create --title "fix: store containers in a Map" --body "Lookups by id were slow." && gh pr merge --squash --delete-branch', check: t => /^fix/.test(t.world.commit(t.remoteRef('harbour/app', 'main')).message) },
          { title: 'Release v1.3.1 and finish on an up-to-date main', solution: 'git switch main && git pull && git tag -a v1.3.1 -m "Release 1.3.1" && git push origin v1.3.1 && gh release create v1.3.1 --generate-notes', check: t => { const b = t.remote('harbour/app'); const tg = b.refs['refs/tags/v1.3.1']; return !!tg && t.world.peel(tg) === b.refs['refs/heads/main'] && b.meta.releases.some(r => r.tag === 'v1.3.1') && t.ref('main') === b.refs['refs/heads/main']; } },
        ],
      },
      quiz: [
        { type: 'mc', q: 'v1.3.0 is released. You merge one `fix:` PR. Next version?', choices: ['v1.3.1', 'v1.4.0', 'v2.0.0', 'v1.3.0 again'], answer: 0, explain: 'Patch release.' },
        { type: 'mc', q: 'You merge `feat!: drop the legacy API`. Next version after v1.3.1?', choices: ['v1.3.2', 'v1.4.0', 'v2.0.0', 'v1.3.1-beta'], answer: 2, explain: 'Breaking change → major.' },
        { type: 'order', q: 'Order a release on a protected main.', items: ['Merge the approved PRs', 'git switch main && git pull', 'git tag -a vX.Y.Z -m "…"', 'git push origin vX.Y.Z', 'gh release create vX.Y.Z --generate-notes'], explain: 'Tag the exact merged commit, then publish.' },
        { type: 'tf', q: 'If a published tag points at the wrong commit, the right fix is to move the tag.', answer: false, explain: 'Release a new version instead; moving tags confuses everyone who fetched it.' },
        { type: 'multi', q: 'What do Conventional Commit PR titles enable with squash merging?', choices: ['Generated changelogs', 'Automatic version bumps', 'Searchable history by type', 'Faster CI'], answer: [0, 1, 2], explain: 'The title becomes the commit on main.' },
        { type: 'mc', q: 'Why tag from the merged main rather than from your feature branch?', choices: ['Tags only work on main', 'The release should mark exactly the commit that is deployed', 'Feature branches cannot have tags', 'GitHub requires it'], answer: 1, explain: 'A release tag names production reality.' },
      ],
    },
  ],
};
