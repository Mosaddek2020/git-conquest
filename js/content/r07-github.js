// Realm 7 · GitHub: repositories, authentication, issues, pull requests, code review.

const PRIYA = { name: 'Priya Sharma', email: 'priya@example.com' };
const issueBy = (t, owner, pred) => (t.remote(owner)?.meta.issues || []).find(pred);
const prBy = (t, owner, pred) => (t.remote(owner)?.meta.prs || []).find(pred);

export default {
  id: 'github',
  n: 7,
  title: 'GitHub',
  tagline: 'Repositories, authentication, issues, pull requests and review',
  badge: 'Octo Navigator',
  intro: 'GitHub is where most teams meet. Publish your repositories, authenticate the modern way (tokens or **SSH keys**), track work with **issues**, propose changes with **pull requests**, and practise **code review** from both sides of the table.',
  lessons: [
    {
      id: 'github-repos',
      title: 'Repositories on GitHub',
      summary: 'Publish a local project with gh repo create, and what a GitHub repository adds.',
      minutes: 14,
      lab: {
        cwd: '~/weather',
        panels: ['github', 'graph'],
        setup(H) {
          H.repo('~/weather');
          H.commit('Create weather dashboard', { 'index.html': '<h1>Weather</h1>\n', 'README.md': '# Weather dashboard\n\nShows a 5-day forecast.\n' });
          H.commit('Add forecast chart', { 'chart.js': 'export const days = 5;\n' });
        },
        suggestions: ['git remote -v', 'gh auth status'],
        tasks: [
          { title: 'Check: this repository has no remote yet', solution: 'git remote -v', check: t => t.ran(/^git remote( -v)?$/) },
          { title: 'Create a public GitHub repository named weather from this folder and push it', hint: '`gh repo create <name> --public --source=. --push`', solution: 'gh repo create weather --public --source=. --push', check: t => t.remoteRef('you/weather', 'main') === t.ref('main') },
          { title: 'Confirm that origin now points at GitHub', solution: 'git remote -v', check: t => t.history.filter(l => /^git remote( -v)?$/.test(l)).length >= 2 && /github\.com\/you\/weather/.test(t.config('remote.origin.url') || '') },
          { title: 'Read the repository the way a visitor sees it', solution: 'gh repo view', check: t => t.ran(/^gh repo view/) },
          { title: 'Add a LICENSE file, commit and push it', detail: 'Any text is fine for this exercise, e.g. "MIT License".', solution: 'echo "MIT License" > LICENSE && git add LICENSE && git commit -m "Add MIT license" && git push', check: t => { const b = t.remote('you/weather'); if (!b) return false; const h = b.refs['refs/heads/main']; return [...t.world.readTreeFlat(t.world.commit(h).tree).keys()].includes('LICENSE'); } },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What does `gh repo create app --public --source=. --push` do?', choices: ['Clones an existing repo', 'Creates a GitHub repo, adds it as origin and pushes the current local repository', 'Creates a local repository only', 'Deletes the remote'], answer: 1, explain: 'The fastest way to publish a local project.' },
        { type: 'mc', q: 'You created a GitHub repo WITH a README, then try to push your separate local repo to it. What happens?', choices: ['It merges automatically', 'The push is rejected: the two histories are unrelated', 'GitHub deletes the README', 'It works'], answer: 1, explain: 'Create the remote empty, or clone it first and add your files.' },
        { type: 'multi', q: 'Which files make a public repository welcoming and legally reusable?', choices: ['README.md', 'LICENSE', '.gitignore', 'node_modules/'], answer: [0, 1, 2], explain: 'Without a license, others may not legally reuse your code.' },
        { type: 'tf', q: 'Anyone can push to a public repository.', answer: false, explain: 'Public means anyone can read. Writing requires permission.' },
        { type: 'type', q: 'Type the commands-free alternative: the git command that connects your repo to `https://github.com/you/app.git` as origin.', accept: ['git remote add origin https://github.com/you/app.git'], model: 'git remote add origin https://github.com/you/app.git', explain: 'Then `git push -u origin main`.' },
        { type: 'mc', q: 'A repository on GitHub is…', choices: ['A copy of your working directory', 'A bare repository (history and refs) plus GitHub features like issues and PRs', 'A zip file of the code', 'A branch'], answer: 1, explain: 'There is no working directory on the server.' },
      ],
    },
    {
      id: 'authentication',
      title: 'Authentication: tokens and SSH keys',
      summary: 'Why passwords no longer work, and how to set up HTTPS tokens or SSH keys.',
      minutes: 16,
      lab: {
        cwd: '~/api',
        panels: ['github', 'files'],
        setup(H) {
          H.remote('you', 'api', [{ message: 'Create API', files: { 'api.js': 'export const routes = [];\n' } }]);
          H.cd('~');
          H.run('git clone -q https://github.com/you/api.git');
          H.cd('~/api');
          H.world.labData = {};
        },
        onCommand(line, res, t) {
          if (/git push/.test(line) && res.out.some(l => /Permission denied \(publickey\)/.test(l))) t.world.labData.denied = true;
        },
        suggestions: ['git remote -v'],
        tasks: [
          { title: 'Switch origin to the SSH address', detail: 'SSH URL: `git@github.com:you/api.git`', solution: 'git remote set-url origin git@github.com:you/api.git', check: t => t.config('remote.origin.url') === 'git@github.com:you/api.git' },
          { title: 'Commit a change and try to push. Read the error.', solution: 'echo "// health" >> api.js && git commit -am "Add health comment" && git push', check: t => !!t.world.labData.denied },
          { title: 'Generate an ed25519 SSH key pair with your email as the comment', solution: 'ssh-keygen -t ed25519 -C "you@example.com"', check: t => t.exists('~/.ssh/id_ed25519.pub') },
          { title: 'Print your PUBLIC key', solution: 'cat ~/.ssh/id_ed25519.pub', check: t => t.ran(/^cat\s+(~|\/home\/dev)\/\.ssh\/id_ed25519\.pub$/) },
          { title: 'Register the public key with GitHub', solution: 'gh ssh-key add ~/.ssh/id_ed25519.pub --title "lab laptop"', check: t => t.world.github.sshKeys.length > 0 },
          { title: 'Test the SSH connection to GitHub', solution: 'ssh -T git@github.com', check: t => t.ran(/^ssh\s+-T\s+git@github\.com/) },
          { title: 'Push again', solution: 'git push', check: t => t.remoteRef('you/api', 'main') === t.ref('main') },
        ],
      },
      quiz: [
        { type: 'mc', q: 'Why does `git push` over HTTPS reject your GitHub account password?', choices: ['Your password is wrong', 'GitHub removed password authentication for git; use a token or SSH key', 'HTTPS is not supported', 'You need to push to master'], answer: 1, explain: 'Use `gh auth login`, a token, or SSH.' },
        { type: 'mc', q: 'Which SSH key file do you add to GitHub?', choices: ['~/.ssh/id_ed25519', '~/.ssh/id_ed25519.pub', '~/.ssh/known_hosts', '~/.gitconfig'], answer: 1, explain: 'Only the public (.pub) key leaves your machine.' },
        { type: 'type', q: 'Type the command that tests your SSH connection to GitHub.', accept: ['ssh -T git@github.com'], model: 'ssh -T git@github.com', explain: '"Hi you! You\'ve successfully authenticated…"' },
        { type: 'type', q: 'Type the command that switches origin to `git@github.com:you/api.git`.', accept: ['git remote set-url origin git@github.com:you/api.git'], model: 'git remote set-url origin git@github.com:you/api.git', explain: 'The repository stays the same; only the transport changes.' },
        { type: 'mc', q: '"Permission denied (publickey)" means…', choices: ['The repository does not exist', 'GitHub did not accept any SSH key from your machine', 'You must use --force', 'Your token expired'], answer: 1, explain: 'Add the key, or check which key the agent offers.' },
        { type: 'multi', q: 'Which are good security habits?', choices: ['One SSH key per machine, clearly named', 'Committing tokens to a private repo', 'Two-factor authentication on GitHub', 'Fine-grained tokens with expiry for scripts'], answer: [0, 2, 3], explain: 'Never commit secrets, even to private repositories.' },
      ],
    },
    {
      id: 'issues',
      title: 'Issues',
      summary: 'Report bugs and track tasks, with labels and closing keywords.',
      minutes: 12,
      lab: {
        cwd: '~/website',
        panels: ['github'],
        setup(H) {
          H.remote('agency', 'website', [{ message: 'Create site', files: { 'index.html': '<h1>Agency</h1>\n', 'contact.html': '<form></form>\n' } }], { collaborators: ['you'] });
          H.issue('agency/website', { title: 'Contact form broken on mobile', body: 'Spinner never stops on iPhone.', labels: ['bug'] });
          H.issue('agency/website', { title: 'Logo looks blurry', body: 'On the homepage.', labels: ['bug'] });
          H.cd('~');
          H.run('git clone -q https://github.com/agency/website.git');
          H.cd('~/website');
        },
        suggestions: ['gh issue list'],
        tasks: [
          { title: 'List the open issues', solution: 'gh issue list', check: t => t.ran(/^gh issue list/) },
          { title: 'Report a new bug with a clear title, a body, and the bug label', detail: 'For example: the footer links point to 404 pages.', solution: 'gh issue create --title "Footer links return 404" --body "All three footer links lead to Not Found pages." --label bug', check: t => !!issueBy(t, 'agency/website', i => i.author === 'you' && i.labels.includes('bug') && i.body.length > 5 && i.title.length > 8) },
          { title: 'Comment on issue #1 to say you can reproduce it', solution: 'gh issue comment 1 --body "I can reproduce this on iOS 18."', check: t => (issueBy(t, 'agency/website', i => i.number === 1)?.comments.length || 0) > 0 },
          { title: 'Issue #2 turned out to be the user\'s screen settings. Close it.', solution: 'gh issue close 2', check: t => issueBy(t, 'agency/website', i => i.number === 2)?.state === 'closed' },
          { title: 'Read your new issue', solution: 'gh issue view 3', check: t => t.ran(/^gh issue view\s+#?3/) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'A PR into main says "Fixes #42". What happens when it merges?', choices: ['Nothing', 'Issue #42 closes automatically, linked to the PR', 'Issue #42 is deleted', 'A new issue opens'], answer: 1, explain: 'Closing keywords: fixes, closes, resolves.' },
        { type: 'multi', q: 'What belongs in a good bug report?', choices: ['Steps to reproduce', 'Expected vs actual behaviour', 'Environment (browser, OS, version)', '"It doesn\'t work" as the only text'], answer: [0, 1, 2], explain: 'Make it easy for someone else to see the bug.' },
        { type: 'tf', q: 'Issues and pull requests share one numbering sequence in a repository.', answer: true, explain: 'If issue #41 exists, the next PR might be #42.' },
        { type: 'type', q: 'Type the command that closes issue 7.', accept: ['gh issue close 7', 'gh issue close #7'], model: 'gh issue close 7', explain: 'Or let a PR close it with "Fixes #7".' },
        { type: 'mc', q: 'What is the `good first issue` label for?', choices: ['Bugs that crash production', 'Small, well-described tasks suitable for newcomers', 'Issues opened first', 'Duplicate issues'], answer: 1, explain: 'A welcoming entry point for new contributors.' },
      ],
    },
    {
      id: 'pull-requests',
      title: 'Pull requests',
      summary: 'Propose, update and merge a branch through a PR, then sync your main.',
      minutes: 18,
      lab: {
        cwd: '~/site',
        panels: ['github', 'graph'],
        setup(H) {
          H.remote('lumen-studio', 'site', [{ message: 'Create site', files: { 'index.html': '<h1>Wellcome to Lumen</h1>\n' } }], { collaborators: ['you'] });
          H.issue('lumen-studio/site', { title: 'Typo on homepage: "Wellcome"', body: 'Should be "Welcome".', labels: ['bug'] });
          H.cd('~');
          H.run('git clone -q https://github.com/lumen-studio/site.git');
          H.cd('~/site');
        },
        suggestions: ['gh issue list', 'git switch -c fix/homepage-typo'],
        tasks: [
          { title: 'Create a branch for the fix', detail: 'For example `fix/homepage-typo`.', solution: 'git switch -c fix/homepage-typo', check: t => t.branch() && t.branch() !== 'main' },
          { title: 'Fix the typo and commit', solution: 'sed -i "s/Wellcome/Welcome/" index.html && git commit -am "Fix welcome typo on the homepage"', check: t => t.branch() !== 'main' && /Welcome/.test(t.headFile('index.html') || '') && !/Wellcome/.test(t.headFile('index.html') || '') },
          { title: 'Publish the branch with an upstream', solution: 'git push -u origin fix/homepage-typo', check: t => !!t.remoteRef('lumen-studio/site', t.branch()) },
          { title: 'Open a pull request that will close issue #1 when merged', solution: 'gh pr create --title "Fix welcome typo" --body "Fixes #1"', check: t => !!prBy(t, 'lumen-studio/site', p => p.state === 'open' && /(fix|close|resolve)(e[sd]|s)?\s+#1\b/i.test(`${p.title} ${p.body}`)) },
          { title: 'Squash-merge it and delete the branch', solution: 'gh pr merge 2 --squash --delete-branch', check: t => !!prBy(t, 'lumen-studio/site', p => p.state === 'merged' && p.mergeMethod === 'squash') },
          { title: 'Be on an up-to-date main, with issue #1 closed', solution: 'git switch main && git pull', allowEarly: true, check: t => t.branch() === 'main' && t.ref('main') === t.remoteRef('lumen-studio/site', 'main') && issueBy(t, 'lumen-studio/site', i => i.number === 1)?.state === 'closed' },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What is a pull request?', choices: ['A git command that pulls changes', 'A GitHub proposal to merge one branch into another, with review and checks', 'A request to clone a repository', 'A force push'], answer: 1, explain: 'Despite the name, it is not the same as git pull.' },
        { type: 'mc', q: 'A reviewer asked for changes. How do you update your open PR?', choices: ['Open a new PR', 'Commit on the same branch and push; the PR updates automatically', 'Edit the PR description only', 'Merge it anyway'], answer: 1, explain: 'A PR follows its head branch.' },
        { type: 'mc', q: 'Which merge method produces exactly one new commit on main for the whole PR?', choices: ['Create a merge commit', 'Squash and merge', 'Rebase and merge', 'Fast-forward'], answer: 1, explain: 'Squash combines the PR into one commit.' },
        { type: 'type', q: 'Type the gh command that opens a PR titled `Add search` whose body says `Fixes #12`.', accept: [/^gh pr create (--title|-t) "Add search" (--body|-b) "Fixes #12"$/, /^gh pr create (--body|-b) "Fixes #12" (--title|-t) "Add search"$/], model: 'gh pr create --title "Add search" --body "Fixes #12"', explain: 'The keyword links and closes the issue on merge.' },
        { type: 'tf', q: 'After a PR is merged on GitHub, your local main updates automatically.', answer: false, explain: 'Pull to update your local main.' },
        { type: 'mc', q: 'After a squash merge, `git branch -d feature` refuses. Why?', choices: ['The PR failed', 'main contains a new squashed commit, not the feature\'s commits, so git thinks they are unmerged', 'The branch is protected', 'You are on the feature branch'], answer: 1, explain: 'Confirm the PR merged, then use -D.' },
      ],
    },
    {
      id: 'code-review',
      title: 'Code review',
      summary: 'Review a teammate\'s pull request: read it, run it, request changes, approve.',
      minutes: 18,
      lab: {
        cwd: '~/shop',
        panels: ['github', 'files', 'graph'],
        setup(H) {
          H.remote('acme', 'shop', [{ message: 'Create shop', files: { 'cart.js': 'export const total = items => items.reduce((s, i) => s + i.price, 0);\n' } }], { collaborators: ['you', 'Priya Sharma'] });
          H.teammate('acme/shop', { branch: 'feature/discounts', files: { 'discount.js': 'export const apply = (total, pct) => {\n  const once = total * (1 - pct);\n  return once * (1 - pct); // BUG: discount applied twice\n};\n' }, message: 'Add discount codes', author: PRIYA });
          H.pr('acme/shop', { title: 'Add discount codes', body: 'Customers can enter a code at checkout.', head: 'feature/discounts', base: 'main', author: 'Priya Sharma' });
          H.cd('~');
          H.run('git clone -q https://github.com/acme/shop.git');
          H.cd('~/shop');
          H.world.labData = {};
        },
        onCommand(line, res, t) {
          const ld = t.world.labData;
          if (/npm (run )?test/.test(line) && t.branch() === 'feature/discounts') { if (res.code === 0) ld.passed = true; else ld.failed = true; }
        },
        events(ev, t) {
          const ld = t.world.labData;
          if (ev.type === 'pr-review' && ev.author === 'you' && ev.state === 'CHANGES_REQUESTED' && !ld.fixed) {
            ld.fixed = true;
            t.teammate('acme/shop', { branch: 'feature/discounts', files: { 'discount.js': 'export const apply = (total, pct) => total * (1 - pct);\n' }, message: 'Apply the discount once', author: PRIYA });
            t.say('[GitHub] Priya Sharma pushed "Apply the discount once" to feature/discounts.');
          }
        },
        suggestions: ['gh pr list'],
        tasks: [
          { title: 'See which pull requests are open', solution: 'gh pr list', check: t => t.ran(/^gh pr list/) },
          { title: 'Read the changes in PR #1', solution: 'gh pr diff 1', check: t => t.ran(/^gh pr diff\s+#?1/) },
          { title: 'Check the branch out locally', solution: 'gh pr checkout 1', check: t => t.branch() === 'feature/discounts' },
          { title: 'Run the tests on it', solution: 'npm test', check: t => !!t.world.labData.failed },
          { title: 'Request changes, explaining the problem', solution: 'gh pr review 1 --request-changes --body "The discount is applied twice in discount.js."', check: t => !!prBy(t, 'acme/shop', p => p.number === 1 && p.reviews.some(r => r.author === 'you' && r.state === 'CHANGES_REQUESTED')) },
          { title: "Pull Priya's fix and run the tests again", solution: 'git pull && npm test', check: t => !!t.world.labData.passed },
          { title: 'Approve the pull request', solution: 'gh pr review 1 --approve', check: t => !!prBy(t, 'acme/shop', p => p.number === 1 && p.reviews.some(r => r.author === 'you' && r.state === 'APPROVED')) },
          { title: 'Go back to main', solution: 'git switch main', check: t => t.branch() === 'main' },
        ],
      },
      quiz: [
        { type: 'mc', q: 'Which review comment follows good etiquette?', choices: ['"This is wrong."', '"The discount is applied twice here (line 3), so 10% becomes 19%. Could we apply it once?"', '"Why would anyone write this?"', '"LGTM" without reading'], answer: 1, explain: 'Specific, about the code, with a suggestion.' },
        { type: 'type', q: 'Type the command that checks out pull request 21 locally.', accept: ['gh pr checkout 21', 'gh pr checkout #21'], model: 'gh pr checkout 21', explain: 'So you can run and test it.' },
        { type: 'mc', q: 'Can you approve your own pull request on GitHub?', choices: ['Yes', 'No: approval must come from someone else', 'Only on public repos', 'Only with --force'], answer: 1, explain: 'Review means a second person.' },
        { type: 'mc', q: 'What does "nit:" at the start of a review comment usually mean?', choices: ['A blocking problem', 'A minor, optional suggestion', 'A security issue', 'An approval'], answer: 1, explain: 'It separates nice-to-have from must-fix.' },
        { type: 'multi', q: 'Which are three possible review verdicts on GitHub?', choices: ['Comment', 'Request changes', 'Approve', 'Force merge'], answer: [0, 1, 2], explain: 'Merging is a separate action.' },
        { type: 'tf', q: 'Reading the diff in the browser is always enough to review a change.', answer: false, explain: 'Some bugs only show up when you run the code or think about what was not changed.' },
      ],
    },
    {
      id: 'github-boss',
      title: 'Boss: One feature, end to end',
      summary: 'Issue, branch, PR, review, protected merge and sync: the full GitHub flow.',
      minutes: 25,
      boss: true,
      lab: {
        cwd: '~',
        panels: ['github', 'graph', 'files'],
        setup(H) {
          H.remote('fieldnotes', 'web', [
            { message: 'Create Fieldnotes', files: { 'notes.js': 'export const notes = [];\n', 'export.js': 'export const toMarkdown = note => note.body;\n' } },
          ], { collaborators: ['you'], description: 'Fieldnotes web app' });
          H.protect('fieldnotes/web', 'main', { requirePR: true, requiredReviews: 1 });
          H.world.labData = {};
        },
        events(ev, t) {
          const ld = t.world.labData;
          if (ev.type === 'pr-created' && ev.url === 'https://github.com/fieldnotes/web.git' && !ld.reviewed) {
            ld.reviewed = true;
            ld.pr = ev.number;
            t.review('fieldnotes/web', ev.number, 'CHANGES_REQUESTED', 'Looks right! Please add a test (export.test.js) for a note without a title.', 'Priya Sharma');
            t.say(`[GitHub] Priya Sharma requested changes on #${ev.number}: "Please add a test (export.test.js) for a note without a title."`);
          }
          if (ev.type === 'push' && ld.reviewed && !ld.approved && ev.url === 'https://github.com/fieldnotes/web.git' && ev.branch !== 'main') {
            const bare = t.world.remotes.get(ev.url);
            const files = [...t.world.readTreeFlat(t.world.commit(ev.hash).tree).keys()];
            if (files.some(f => /test/.test(f))) {
              ld.approved = true;
              t.review('fieldnotes/web', ld.pr, 'APPROVED', 'Thanks, ship it!', 'Priya Sharma');
              t.say(`[GitHub] Priya Sharma approved #${ld.pr}.`);
            }
            void bare;
          }
        },
        tasks: [
          { title: 'Clone fieldnotes/web and go into it', solution: 'git clone https://github.com/fieldnotes/web.git && cd web', check: t => !!t.repoAt('~/web') && t.inDir('~/web') },
          { title: 'File an issue: exported notes lose their titles', solution: 'gh issue create --title "Exported notes lose their titles" --body "toMarkdown() only outputs the body." --label bug', check: t => { const i = issueBy(t, 'fieldnotes/web', x => x.author === 'you'); if (i) t.world.labData.issue = i.number; return !!i; } },
          { title: 'On a fix/ branch, make toMarkdown include the title, and commit', detail: 'For example: `` export const toMarkdown = note => `# ${note.title}\\n\\n${note.body}`; ``', solution: 'git switch -c fix/export-titles && edit export.js && git commit -am "Include note titles in Markdown export"', test: ['git switch -c fix/export-titles', { cmd: 'edit export.js', edit: 'export const toMarkdown = note => `# ${note.title}\\n\\n${note.body}`;\n' }, 'git commit -am "Include note titles in Markdown export"'], check: t => /^fix\//.test(t.branch() || '') && /title/.test(t.headFile('export.js') || '') },
          { title: 'Try pushing straight to main, and read why GitHub refuses', solution: 'git push origin HEAD:main', check: t => t.events('push-rejected').length > 0 || t.ran(/git push\b.*\bmain\b/) },
          { title: 'Publish your branch and open a PR that closes your issue', solution: 'git push -u origin fix/export-titles && gh pr create --title "Include titles in Markdown export" --body "Fixes #1"', check: t => !!prBy(t, 'fieldnotes/web', p => p.state === 'open' && new RegExp(`(fix|close|resolve)(e[sd]|s)?\\s+#${t.world.labData.issue}\\b`, 'i').test(`${p.title} ${p.body}`)) },
          { title: 'Answer the review: add export.test.js, commit, push', solution: 'echo "test(\'note without a title\', () => {});" > export.test.js && git add export.test.js && git commit -m "Test export of untitled notes" && git push', check: t => !!t.world.labData.approved },
          { title: 'Squash-merge the approved PR and delete the branch', solution: 'gh pr merge 2 --squash --delete-branch', check: t => !!prBy(t, 'fieldnotes/web', p => p.state === 'merged') },
          { title: 'Finish on an up-to-date main, with your issue closed', solution: 'git switch main && git pull && gh issue view 1', allowEarly: true, check: t => t.branch() === 'main' && t.ref('main') === t.remoteRef('fieldnotes/web', 'main') && issueBy(t, 'fieldnotes/web', i => i.number === t.world.labData.issue)?.state === 'closed' },
        ],
      },
      quiz: [
        { type: 'order', q: 'Order the GitHub flow for a bug fix.', items: ['gh issue create', 'git switch -c fix/…', 'commit the fix', 'git push -u origin fix/…', 'gh pr create (Fixes #N)', 'review & checks', 'gh pr merge', 'git switch main && git pull'], explain: 'From report to merged fix and synced main.' },
        { type: 'mc', q: 'main is protected and requires reviews. What happens on `git push origin main`?', choices: ['It succeeds', 'GitHub rejects it: changes must go through a pull request', 'It creates a PR automatically', 'It deletes main'], answer: 1, explain: 'Protected branch rules are enforced on the server.' },
        { type: 'mc', q: 'Your PR has "Changes requested". What do you do?', choices: ['Close it and open another', 'Push new commits to the same branch addressing the comments, and reply', 'Merge with admin rights', 'Force-push main'], answer: 1, explain: 'The PR updates with each push.' },
        { type: 'tf', q: 'A PR stays mergeable even if a reviewer has requested changes and nobody re-reviewed.', answer: false, explain: 'Requested changes block merging until resolved (with protection rules).' },
        { type: 'mc', q: 'Where does "Fixes #7" need to be for the issue to close automatically?', choices: ['In a comment on the issue', 'In the PR title or description (or a commit message) merged into the default branch', 'In the branch name', 'In README.md'], answer: 1, explain: 'It acts when merged into the default branch.' },
        { type: 'type', q: 'Type the gh command that squash-merges PR 15 and deletes its branch.', accept: ['gh pr merge 15 --squash --delete-branch', 'gh pr merge 15 -s -d', 'gh pr merge 15 --delete-branch --squash', 'gh pr merge #15 --squash --delete-branch'], model: 'gh pr merge 15 --squash --delete-branch', explain: 'Then pull main locally.' },
        { type: 'multi', q: 'Which make a PR easier to review?', choices: ['Small and focused', 'A description with how to test it', 'Mixing three unrelated changes', 'Screenshots for UI changes'], answer: [0, 1, 3], explain: 'One purpose per PR.' },
      ],
    },
  ],
};
