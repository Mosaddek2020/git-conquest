// Realm 6 · Remotes: clone/origin, fetch vs pull, push & upstream, divergence, force-with-lease & prune.

const AMA = { name: 'Ama Owusu', email: 'ama@acme.example' };
const NORA = { name: 'Nora Lind', email: 'nora@acme.example' };

function storefront(H, extra = {}) {
  H.remote('acme', 'storefront', [
    { message: 'Create storefront', files: { 'index.html': '<h1>Storefront</h1>\n', 'prices.js': 'export const round = p => Math.round(p);\n' } },
    { message: 'Add product grid', files: { 'grid.js': 'export const columns = 3;\n' } },
    ...(extra.commits || []),
  ], { collaborators: ['you'], description: 'The ACME web shop' });
}

export default {
  id: 'remotes',
  n: 6,
  title: 'Remotes',
  tagline: 'Clone, fetch, pull and push: your repository meets the world',
  badge: 'Signal Keeper',
  intro: 'Up to now everything lived on your machine. In this realm your repository talks to others: **clone** a project, understand **origin** and remote-tracking branches, **fetch** and **pull** teammates\' work, **push** your own, reconcile **divergent** histories, and force-push only with a **lease**.',
  lessons: [
    {
      id: 'clone-origin',
      title: 'Clone, origin and remote-tracking branches',
      summary: 'What git clone creates, what origin is, and why origin/main is only a bookmark.',
      minutes: 16,
      lab: {
        cwd: '~',
        panels: ['graph', 'github', 'files'],
        setup(H) {
          storefront(H);
          H.teammate('acme/storefront', { branch: 'checkout-v2', files: { 'checkout.js': 'export const steps = 2;\n' }, message: 'Prototype two-step checkout', author: AMA });
        },
        suggestions: ['git clone https://github.com/acme/storefront.git'],
        tasks: [
          { title: 'Clone the acme/storefront repository', detail: 'URL: `https://github.com/acme/storefront.git`', solution: 'git clone https://github.com/acme/storefront.git', check: t => !!t.repoAt('~/storefront') },
          { title: 'Go into it and list the remotes with their URLs', solution: 'cd storefront && git remote -v', check: t => t.inDir('~/storefront') && t.ran(/git remote -v/) },
          { title: 'List local AND remote-tracking branches', solution: 'git branch -a', check: t => t.ran(/^git branch\s+(-a|--all)/) },
          { title: 'Show which upstream your main tracks', solution: 'git branch -vv', check: t => t.ran(/^git branch\s+-vv/) },
          { title: 'Start working on checkout-v2, a branch that so far exists only on GitHub', hint: '`git switch checkout-v2` creates a local branch that tracks origin/checkout-v2.', solution: 'git switch checkout-v2', check: t => t.branch() === 'checkout-v2' && t.config('branch.checkout-v2.remote') === 'origin' },
          { title: 'Show everything git knows about origin', solution: 'git remote show origin', check: t => t.ran(/^git remote show( origin)?$/) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What is `origin`?', choices: ['A special server owned by GitHub', 'The default name git gives the remote you cloned from', 'The first commit', 'Your main branch'], answer: 1, explain: 'It is just a nickname for a URL.' },
        { type: 'mc', q: 'What is `origin/main`?', choices: ['GitHub\'s live main branch', 'Your local, read-only bookmark of where main was on origin at your last fetch/pull/push', 'A branch you can commit on', 'A tag'], answer: 1, explain: 'It only moves when you talk to the remote.' },
        { type: 'type', q: 'Type the command that lists remotes with their URLs.', accept: ['git remote -v', 'git remote --verbose'], model: 'git remote -v', explain: 'Shows fetch and push URLs.' },
        { type: 'type', q: 'Type the command that adds a remote named `upstream` with the URL `https://github.com/acme/app.git`.', accept: ['git remote add upstream https://github.com/acme/app.git'], model: 'git remote add upstream https://github.com/acme/app.git', explain: 'You can have as many remotes as you like.' },
        { type: 'mc', q: 'After cloning, `git branch` shows only `main`, yet GitHub has five branches. Why?', choices: ['Clone only downloads main', 'Clone downloads all branches as origin/* bookmarks, but creates a local branch only for the default one', 'The other branches are private', 'You need --all-branches'], answer: 1, explain: '`git switch <name>` creates the local branch from origin/<name> on demand.' },
        { type: 'multi', q: 'Which URLs can point at the same GitHub repository?', choices: ['https://github.com/acme/app.git', 'git@github.com:acme/app.git', 'acme/app.zip', 'ftp://github.com/acme/app'], answer: [0, 1], explain: 'HTTPS and SSH both work; they differ in authentication.' },
      ],
    },
    {
      id: 'fetch-pull',
      title: 'Fetch vs pull',
      summary: 'Download and inspect before integrating, and what git pull really does.',
      minutes: 15,
      lab: {
        cwd: '~/storefront',
        panels: ['graph', 'github'],
        setup(H) {
          storefront(H);
          H.cd('~');
          H.run('git clone -q https://github.com/acme/storefront.git');
          H.cd('~/storefront');
          H.teammate('acme/storefront', { files: { 'prices.js': 'export const round = p => Math.round(p * 100) / 100;\n' }, message: 'Fix currency rounding', author: AMA });
          H.teammate('acme/storefront', { files: { 'giftcards.js': 'export const giftCards = [];\n' }, message: 'Add gift cards', author: NORA });
          H.world.labData = {};
        },
        onCommand(line, res, t) {
          const ld = t.world.labData;
          if (!ld.second && t.ref('main') === t.remoteRef('acme/storefront', 'main')) {
            ld.second = true;
            t.teammate('acme/storefront', { files: { 'wishlist.js': 'export const wishlist = [];\n' }, message: 'Add wishlist', author: AMA });
            t.say('[GitHub] Ama Owusu just pushed "Add wishlist" to main.');
          }
        },
        suggestions: ['git status', 'git fetch'],
        tasks: [
          { title: 'Ask git status whether you are up to date', detail: 'Notice what it claims, and why it can be wrong.', solution: 'git status', check: t => t.ran(/^git status/) },
          { title: 'Download what teammates pushed, without changing your branch', solution: 'git fetch', check: t => t.ref('origin/main') === t.remoteRef('acme/storefront', 'main') || t.world.labData.second },
          { title: 'List the commits that arrived and that you do not have yet', solution: 'git log --oneline main..origin/main', check: t => t.ran(/^git log\b.*main\.\.origin\/main/) },
          { title: 'See how the files differ', solution: 'git diff main origin/main', check: t => t.ran(/^git diff\b.*origin\/main/) },
          { title: 'Integrate them into main', solution: 'git merge origin/main', check: t => t.world.labData.second },
          { title: 'Someone just pushed again. This time fetch and integrate in one step.', solution: 'git pull', check: t => t.ran(/^git pull/) && t.ref('main') === t.remoteRef('acme/storefront', 'main') && t.inHead('wishlist.js') },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What does `git fetch` change?', choices: ['Your current branch and files', 'Only the remote-tracking branches like origin/main (and downloads objects)', 'The remote repository', 'Nothing at all'], answer: 1, explain: 'Your work is untouched.' },
        { type: 'mc', q: '`git pull` is equivalent to…', choices: ['git fetch + git push', 'git fetch + git merge (or rebase) of the upstream', 'git clone', 'git push --force'], answer: 1, explain: 'Pull = fetch + integrate.' },
        { type: 'type', q: 'After fetching, type the command that lists commits on origin/main that your main does not have.', accept: ['git log main..origin/main', 'git log --oneline main..origin/main', 'git log main..origin/main --oneline', 'git log ..origin/main', 'git log --oneline ..origin/main'], model: 'git log --oneline main..origin/main', explain: 'A..B: in B, not in A.' },
        { type: 'mc', q: '`git status` says "up to date with origin/main" but a teammate pushed an hour ago. Why?', choices: ['git status is broken', 'status compares with your last-known origin/main; you have not fetched', 'The teammate\'s push failed', 'status ignores remotes'], answer: 1, explain: 'Fetch first, then status is accurate.' },
        { type: 'tf', q: '`git fetch` can create merge conflicts.', answer: false, explain: 'It never touches your branches. Conflicts can only happen when you integrate.' },
        { type: 'mc', q: 'Which setting makes `git pull` refuse instead of creating a merge commit when branches diverged?', choices: ['pull.rebase true', 'pull.ff only', 'fetch.prune true', 'push.default simple'], answer: 1, explain: 'Fast-forward only.' },
      ],
    },
    {
      id: 'push-upstream',
      title: 'Push and upstream',
      summary: 'Publish commits, understand rejected pushes, and set upstreams with -u.',
      minutes: 16,
      lab: {
        cwd: '~/storefront',
        panels: ['graph', 'github'],
        setup(H) {
          storefront(H);
          H.cd('~');
          H.run('git clone -q https://github.com/acme/storefront.git');
          H.cd('~/storefront');
          H.teammate('acme/storefront', { files: { 'giftcards.js': 'export const giftCards = [];\n' }, message: 'Add gift cards', author: NORA });
        },
        suggestions: ['git status'],
        tasks: [
          { title: 'Fix the rounding in prices.js and commit on main', detail: 'Make round() keep two decimals: `Math.round(p * 100) / 100`.', solution: 'echo "export const round = p => Math.round(p * 100) / 100;" > prices.js && git commit -am "Round prices to two decimals"', check: t => /100/.test(t.headFile('prices.js') || '') && t.count() >= 3 },
          { title: 'Push it, and read why GitHub refuses', solution: 'git push', check: t => t.events('push-rejected').length > 0 },
          { title: 'Integrate the teammate\'s commit by replaying yours on top', solution: 'git pull --rebase', check: t => t.isAncestor(t.remoteRef('acme/storefront', 'main'), t.headHash()) && t.head().parents.length === 1 },
          { title: 'Push again', solution: 'git push', check: t => t.remoteRef('acme/storefront', 'main') === t.ref('main') },
          { title: 'Create feature/wishlist with a commit and publish it with an upstream', solution: 'git switch -c feature/wishlist && echo "export const list = [];" > wishlist.js && git add wishlist.js && git commit -m "Add wishlist" && git push -u origin feature/wishlist', check: t => !!t.remoteRef('acme/storefront', 'feature/wishlist') && t.config('branch.feature/wishlist.remote') === 'origin' },
          { title: 'Show each branch with its upstream and ahead/behind status', solution: 'git branch -vv', check: t => t.ran(/^git branch\s+-vv/) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'Your push is rejected with "(fetch first)". What does it mean?', choices: ['Your internet is down', 'The remote has commits you do not have; integrate them before pushing', 'You must use --force', 'The branch is protected'], answer: 1, explain: 'Pushes must be fast-forwards.' },
        { type: 'type', q: 'Type the command that pushes the new branch `feature/search` to origin and sets it as the upstream.', accept: ['git push -u origin feature/search', 'git push --set-upstream origin feature/search'], model: 'git push -u origin feature/search', explain: 'After that, plain git push / git pull work.' },
        { type: 'mc', q: 'What is an upstream branch?', choices: ['The main branch', 'The remote branch a local branch is linked to for push/pull and ahead/behind', 'The original repository of a fork, always', 'A branch on a different server'], answer: 1, explain: 'Set with -u or git branch -u.' },
        { type: 'predict', q: 'What does git status say?', code: '$ git status\n# local main has 2 commits that origin/main does not', choices: ['Your branch is behind', 'Your branch is ahead of \'origin/main\' by 2 commits', 'Your branch has diverged', 'Nothing to commit'], answer: 1, explain: '"(use git push to publish your local commits)"' },
        { type: 'tf', q: 'By default, `git push` pushes all your local branches.', answer: false, explain: 'It pushes the current branch to its upstream.' },
        { type: 'mc', q: 'Which config makes the first `git push` of a new branch set its upstream automatically?', choices: ['push.autoSetupRemote true', 'pull.rebase true', 'fetch.prune true', 'init.defaultBranch main'], answer: 0, explain: 'Saves typing -u every time.' },
      ],
    },
    {
      id: 'divergence',
      title: 'Divergent branches',
      summary: 'When both sides moved: choose merge or rebase, and set a pull policy.',
      minutes: 15,
      lab: {
        cwd: '~/app',
        world: { globalConfig: {} },
        panels: ['graph', 'github'],
        setup(H) {
          H.remote('acme', 'app', [{ message: 'Create app', files: { 'app.js': 'export const app = {};\n' } }], { collaborators: ['you'] });
          H.cd('~');
          H.run('git clone -q https://github.com/acme/app.git');
          H.cd('~/app');
          H.commit('Add login form', { 'login.js': 'export const form = {};\n' });
          H.commit('Validate passwords', { 'password.js': 'export const min = 12;\n' });
          H.teammate('acme/app', { files: { 'nav.js': 'export const links = [];\n' }, message: 'Add navigation', author: AMA });
          H.teammate('acme/app', { files: { 'footer.js': 'export const year = 2026;\n' }, message: 'Add footer', author: NORA });
        },
        suggestions: ['git fetch', 'git status'],
        tasks: [
          { title: 'Fetch, then read what git status says about your branch', solution: 'git fetch && git status', check: t => t.ran(/git fetch/) && t.history.some(l => /git status/.test(l)) && !!t.ref('origin/main') && t.ref('origin/main') === t.remoteRef('acme/app', 'main') },
          { title: 'Try a plain git pull and read the error', solution: 'git pull', check: t => t.ran(/^git pull$/) },
          { title: 'Choose a policy: make pulls rebase by default, for all your repositories', solution: 'git config --global pull.rebase true', check: t => t.world.globalConfig['pull.rebase'] === 'true' },
          { title: 'Pull again', solution: 'git pull', check: t => t.isAncestor(t.remoteRef('acme/app', 'main'), t.headHash()) && t.commits().every(c => c.parents.length < 2) },
          { title: 'Push the reconciled main', solution: 'git push', check: t => t.remoteRef('acme/app', 'main') === t.ref('main') },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What does "your branch and origin/main have diverged" mean?', choices: ['The remote was deleted', 'Both sides have commits the other lacks', 'You are behind only', 'Your branch has conflicts'], answer: 1, explain: 'Neither is an ancestor of the other.' },
        { type: 'mc', q: 'With `pull.rebase true`, what does `git pull` do on divergence?', choices: ['Creates a merge commit', 'Replays your local commits on top of the remote ones', 'Refuses', 'Force-pushes'], answer: 1, explain: 'Linear history.' },
        { type: 'type', q: 'Type the command that sets merge as your pull strategy for all repositories.', accept: ['git config --global pull.rebase false'], model: 'git config --global pull.rebase false', explain: 'false = merge, true = rebase.' },
        { type: 'multi', q: 'Which commands show what each side has?', choices: ['git log origin/main..main', 'git log main..origin/main', 'git log --oneline --graph --all', 'git push --force'], answer: [0, 1, 2], explain: 'Ranges in both directions, or the full graph.' },
        { type: 'tf', q: 'The fix for "divergent branches" is git push --force.', answer: false, explain: 'That would erase your teammates\' commits. Integrate first.' },
        { type: 'mc', q: 'A `git pull --rebase` stops with a conflict and you are lost. What is a safe way out?', choices: ['git rebase --abort, then try git pull --no-rebase', 'Delete the repository', 'git push --force', 'git reset --hard HEAD~10'], answer: 0, explain: 'Abort restores your branch; a merge-pull is another option.' },
      ],
    },
    {
      id: 'force-prune',
      title: 'Force with lease, delete and prune',
      summary: 'Overwrite your own rewritten branch safely, delete remote branches, and prune stale bookmarks.',
      minutes: 18,
      lab: {
        cwd: '~/search',
        panels: ['graph', 'github'],
        setup(H) {
          H.remote('acme', 'search', [{ message: 'Create search service', files: { 'service.js': 'export const service = {};\n' } }], { collaborators: ['you'] });
          H.teammate('acme/search', { branch: 'feature/old-checkout', files: { 'old.js': 'old\n' }, message: 'Old checkout experiment', author: NORA });
          H.cd('~');
          H.run('git clone -q https://github.com/acme/search.git');
          H.cd('~/search');
          H.run('git switch -q feature/old-checkout');
          H.run('git switch -q main');
          H.run('git switch -q -c feature/search');
          H.commit('Add search index', { 'index.js': 'export const index = new Map();\n' });
          H.commit('Add search query', { 'query.js': 'export const query = q => q;\n' });
          H.run('git push -q -u origin feature/search');
          H.teammate('acme/search', { files: { 'auth.js': 'export const auth = {};\n' }, message: 'Add auth middleware', author: AMA });
          const bare = H.world.remotes.get('https://github.com/acme/search.git');
          delete bare.refs['refs/heads/feature/old-checkout'];
          H.world.labData = {};
        },
        events(ev, t) {
          const ld = t.world.labData;
          if (ev.type === 'push-rejected' && !ld.nora) {
            ld.nora = true;
            const bare = t.world.remotes.get('https://github.com/acme/search.git');
            const base = bare.refs['refs/heads/feature/search'];
            t.teammate('acme/search', { branch: 'feature/search', files: { 'nora.js': 'export const typo = "fixed";\n' }, message: 'Fix typo in query docs', author: NORA });
            ld.noraCommit = bare.refs['refs/heads/feature/search'];
            void base;
            t.say('[GitHub] Nora Lind just pushed "Fix typo in query docs" to feature/search.');
          }
        },
        suggestions: ['git fetch', 'git log --oneline --graph --all'],
        tasks: [
          { title: 'Fetch, then rebase feature/search onto the latest origin/main', solution: 'git fetch && git rebase origin/main', check: t => t.isAncestor(t.remoteRef('acme/search', 'main'), t.ref('feature/search')) && !t.state() },
          { title: 'Try a normal push and read the rejection', solution: 'git push', check: t => t.events('push-rejected').length >= 1 },
          { title: 'Try git push --force-with-lease', detail: 'A teammate pushed in the meantime. Watch the lease protect them.', solution: 'git push --force-with-lease', check: t => t.ran(/--force-with-lease/) && t.events('push-rejected').length >= 2 },
          { title: "Fetch and include Nora's commit in your branch", hint: 'After `git fetch`, cherry-pick `origin/feature/search` onto your rebased branch.', solution: 'git fetch && git cherry-pick origin/feature/search', check: t => !!t.fileAt('feature/search', 'nora.js') && t.isAncestor(t.remoteRef('acme/search', 'main'), t.ref('feature/search')) },
          { title: 'Now publish your rewritten branch with the lease', solution: 'git push --force-with-lease', check: t => t.remoteRef('acme/search', 'feature/search') === t.ref('feature/search') },
          { title: 'Clean up: prune stale bookmarks and delete your local feature/old-checkout', solution: 'git fetch --prune && git branch -D feature/old-checkout', check: t => !t.ref('origin/feature/old-checkout') && !t.ref('feature/old-checkout') },
        ],
      },
      quiz: [
        { type: 'mc', q: 'How does `--force-with-lease` differ from `--force`?', choices: ['It is slower', 'It refuses if the remote branch moved since your last fetch, protecting others\' pushes', 'It only works on main', 'There is no difference'], answer: 1, explain: 'It checks the remote still matches your origin/<branch> bookmark.' },
        { type: 'mc', q: 'When is a force push (with lease) legitimate?', choices: ['To fix a rejected push on main', 'After rewriting your own feature branch that nobody else builds on', 'Every time you push', 'Never'], answer: 1, explain: 'Private branches only.' },
        { type: 'type', q: 'Type the command that deletes the branch `feature/old` on origin.', accept: ['git push origin --delete feature/old', 'git push origin :feature/old', 'git push --delete origin feature/old', 'git push origin -d feature/old'], model: 'git push origin --delete feature/old', explain: 'Deletes the remote branch, not your local one.' },
        { type: 'type', q: 'Type the command that fetches and removes remote-tracking branches deleted on the server.', accept: ['git fetch --prune', 'git fetch -p', 'git fetch origin --prune', 'git fetch --prune origin'], model: 'git fetch --prune', explain: 'Or set fetch.prune true.' },
        { type: 'predict', q: 'What does the `: gone` mean in this output?', code: '$ git branch -vv\n  feature/x  4f2a91c [origin/feature/x: gone] Add search', choices: ['The local branch was deleted', 'The upstream branch was deleted on the remote and pruned', 'The branch has conflicts', 'The commit is unreachable'], answer: 1, explain: 'A good hint that the local branch can be deleted too.' },
        { type: 'tf', q: 'Fetching immediately before `--force-with-lease` makes the lease check meaningless if you do not look at what you fetched.', answer: true, explain: 'The bookmark then matches the remote, so the lease passes even over commits you never saw.' },
      ],
    },
    {
      id: 'remotes-boss',
      title: 'Boss: The busy morning',
      summary: 'Clone, publish, get rejected, rebase, force-with-lease and prune on a busy repository.',
      minutes: 25,
      boss: true,
      lab: {
        cwd: '~',
        panels: ['graph', 'github', 'files'],
        setup(H) {
          H.remote('kestrel', 'payments', [
            { message: 'Create payments service', files: { 'refund.js': 'export const refund = amt => Math.floor(amt);\n', 'pay.js': 'export const pay = {};\n' } },
            { message: 'Add card payments', files: { 'card.js': 'export const card = {};\n' } },
          ], { collaborators: ['you'], description: 'Kestrel payments service' });
          H.teammate('kestrel/payments', { branch: 'feature/old-checkout', files: { 'old.js': 'x\n' }, message: 'Old checkout', author: NORA });
          H.world.labData = {};
        },
        events(ev, t) {
          const ld = t.world.labData;
          if (ev.type === 'push' && ev.branch === 'fix/refund-rounding' && !ld.moved) {
            ld.moved = true;
            t.teammate('kestrel/payments', { files: { 'currency.js': 'export const currencies = ["EUR", "USD"];\n' }, message: 'Add currency table', author: AMA });
            delete t.world.remotes.get('https://github.com/kestrel/payments.git').refs['refs/heads/feature/old-checkout'];
            t.say('[GitHub] Ama pushed "Add currency table" to main. Nora merged and deleted feature/old-checkout.');
          }
        },
        tasks: [
          { title: 'Clone kestrel/payments into ~/work', solution: 'mkdir -p ~/work && cd ~/work && git clone https://github.com/kestrel/payments.git && cd payments', check: t => !!t.repoAt('~/work/payments') },
          { title: 'Create fix/refund-rounding, fix refund.js to round to cents, commit, and publish it with an upstream', detail: 'Use `Math.round(amt * 100) / 100`.', solution: 'cd ~/work/payments && git switch -c fix/refund-rounding && echo "export const refund = amt => Math.round(amt * 100) / 100;" > refund.js && git commit -am "Round refunds to cents" && git push -u origin fix/refund-rounding', check: t => !!t.remoteRef('kestrel/payments', 'fix/refund-rounding') && t.config('branch.fix/refund-rounding.remote', t.repoAt('~/work/payments')) === 'origin' },
          { title: 'main moved. Rebase your fix branch onto the latest origin/main.', solution: 'git fetch && git rebase origin/main', check: t => { const r = t.repoAt('~/work/payments'); return t.isAncestor(t.remoteRef('kestrel/payments', 'main'), t.ref('fix/refund-rounding', r)) && !r.state; } },
          { title: 'Publish the rewritten branch safely', solution: 'git push --force-with-lease', check: t => { const r = t.repoAt('~/work/payments'); return t.remoteRef('kestrel/payments', 'fix/refund-rounding') === t.ref('fix/refund-rounding', r) && !t.history.some(l => /--force(\s|$)/.test(l)); } },
          { title: 'Make your local main match GitHub', solution: 'git switch main && git pull', check: t => t.ref('main', t.repoAt('~/work/payments')) === t.remoteRef('kestrel/payments', 'main') },
          { title: 'Remove the stale origin/feature/old-checkout bookmark', solution: 'git fetch --prune', check: t => !t.ref('origin/feature/old-checkout', t.repoAt('~/work/payments')) },
        ],
      },
      quiz: [
        { type: 'order', q: 'Order a safe daily routine for a feature branch on a busy repository.', items: ['git fetch', 'git rebase origin/main (on your feature branch)', 'run the tests', 'git push --force-with-lease'], explain: 'Update, verify, publish safely.' },
        { type: 'mc', q: 'You pushed fix/x yesterday. Today you rebased it. Why is `git push` rejected?', choices: ['The branch is protected', 'The rebased commits are new; the remote tip is no longer in your history', 'You need to pull first', 'GitHub is down'], answer: 1, explain: 'Rewritten history needs a (leased) force push.' },
        { type: 'multi', q: 'Which actions never change your local branches?', choices: ['git fetch', 'git fetch --prune', 'git pull', 'git remote -v'], answer: [0, 1, 3], explain: 'pull integrates into the current branch.' },
        { type: 'mc', q: 'Your main is behind origin/main and has no local commits. What does `git pull` do?', choices: ['Creates a merge commit', 'Fast-forwards main', 'Rebases', 'Refuses'], answer: 1, explain: 'No divergence, so a fast-forward.' },
        { type: 'tf', q: '`git push -u` is needed every time you push a branch.', answer: false, explain: 'Only the first time, to set the upstream.' },
        { type: 'mc', q: 'Which statement about remote-tracking branches is true?', choices: ['You commit on them', 'They update only when you fetch, pull or push', 'They live on GitHub', 'They are deleted after every push'], answer: 1, explain: 'They are local bookmarks.' },
        { type: 'type', q: 'Type the command that makes pulls rebase by default in every repository.', accept: ['git config --global pull.rebase true'], model: 'git config --global pull.rebase true', explain: 'A popular team default.' },
      ],
    },
  ],
};
