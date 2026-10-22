// Realm 5 · Rewriting History: rebase, interactive rebase, cherry-pick, the golden rule.

const noMarkers = s => !/^(<<<<<<<|=======|>>>>>>>)/m.test(s || '');
const msgsSince = (t, base, ref) => t.commits(t.repo, ref).filter(c => !t.isAncestor(c.hash, t.ref(base))).map(c => c.message.split('\n')[0]).reverse();

// Rewrites an interactive-rebase todo: plan = [[action, messageRegex], ...] in the desired order.
export function todoPlan(plan) {
  return (text) => {
    const lines = text.split('\n').filter(l => /^pick /.test(l));
    const out = [];
    for (const [action, re] of plan) {
      const line = lines.find(l => re.test(l.replace(/^pick \w+ /, '')));
      if (line) out.push(line.replace(/^pick/, action));
    }
    return out.join('\n') + '\n';
  };
}

export default {
  id: 'rewriting',
  n: 5,
  title: 'Rewriting History',
  tagline: 'Rebase, interactive rebase, cherry-pick, and the golden rule',
  badge: 'History Sculptor',
  intro: 'Git lets you reshape commits before you share them: replay a branch on a new base, squash a messy series into a clean story, or copy a single fix to another branch. With that power comes one rule you must never break: **do not rewrite history other people have.**',
  lessons: [
    {
      id: 'rebase',
      title: 'Rebase: replaying commits',
      summary: 'Move your branch onto the latest main by replaying its commits, and handle conflicts on the way.',
      minutes: 18,
      lab: {
        cwd: '~/reports',
        panels: ['graph', 'files', 'areas'],
        setup(H) {
          H.repo('~/reports');
          H.commit('Create reports app', { 'report.js': 'title = "Monthly report"\nrows = []\n' });
          H.run('git switch -q -c feature/export');
          H.commit('Add CSV export', { 'export.js': 'export const toCsv = rows => rows.join(",");\n' });
          H.commit('Mark report as exportable', { 'report.js': 'title = "Monthly report (exportable)"\nrows = []\n' });
          H.run('git switch -q main');
          H.commit('Rename report to sales report', { 'report.js': 'title = "Monthly sales report"\nrows = []\n' });
          H.commit('Update README', { 'README.md': '# Reports\n' });
          H.run('git switch -q feature/export');
          H.world.labData = { mainTip: H.shell.repo.refs['refs/heads/main'] };
        },
        suggestions: ['git log --oneline --graph --all'],
        tasks: [
          { title: 'Look at how the two branches diverged', solution: 'git log --oneline --graph --all', check: t => t.ran(/^git log\b.*--graph/) },
          { title: 'Rebase feature/export onto main', detail: 'It will stop at a conflict in report.js.', solution: 'git rebase main', check: t => t.state() === 'rebase' || (t.isAncestor(t.world.labData.mainTip, t.ref('feature/export')) && !t.state()) },
          {
            title: 'Resolve report.js keeping both ideas (sales AND exportable), then continue the rebase',
            hint: 'Edit the file to e.g. `title = "Monthly sales report (exportable)"`, `git add report.js`, then `git rebase --continue`.',
            solution: 'edit report.js → git add report.js → git rebase --continue',
            test: [{ cmd: 'edit report.js', edit: 'title = "Monthly sales report (exportable)"\nrows = []\n' }, 'git add report.js', 'git rebase --continue'],
            check: t => !t.state() && t.branch() === 'feature/export' && t.isAncestor(t.world.labData.mainTip, t.headHash()) && /sales/.test(t.headFile('report.js') || '') && /exportable/.test(t.headFile('report.js') || '') && noMarkers(t.headFile('report.js')),
          },
          { title: 'Land the feature on main with a fast-forward', solution: 'git switch main && git merge feature/export', check: t => t.ref('main') === t.ref('feature/export') },
          { title: 'Confirm the history is a straight line', solution: 'git log --oneline --graph', check: t => t.history.filter(l => /^git log\b.*--graph/.test(l)).length >= 2 && t.commits(t.repo, 'main').every(c => c.parents.length < 2) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What does `git rebase main` do when run on a feature branch?', choices: ['Merges feature into main', 'Replays the feature\'s commits on top of main\'s tip, creating new commits', 'Deletes main', 'Copies main into feature as one commit'], answer: 1, explain: 'Same changes, new parents, new ids.' },
        { type: 'tf', q: 'After a rebase, the replayed commits keep their original ids.', answer: false, explain: 'A commit\'s id includes its parent, so new parents mean new ids.' },
        { type: 'mc', q: 'A rebase stops with a conflict. After fixing the file and `git add`, what do you run?', choices: ['git commit', 'git rebase --continue', 'git merge --continue', 'git push'], answer: 1, explain: 'Rebase then applies the next commit.' },
        { type: 'mc', q: 'During a rebase conflict, what does `--ours` refer to?', choices: ['Your feature commit being replayed', 'The branch you are rebasing onto (e.g. main)', 'The common ancestor', 'Nothing during a rebase'], answer: 1, explain: 'It is the opposite of a merge, because rebase builds on top of the target.' },
        { type: 'type', q: 'Type the command that fetches and then replays your local commits on top of the remote ones.', accept: ['git pull --rebase', 'git pull -r'], model: 'git pull --rebase', explain: 'Keeps local history linear.' },
        { type: 'mc', q: 'You are halfway through a confusing rebase and want everything back as it was. What do you run?', choices: ['git rebase --skip', 'git rebase --abort', 'git reset --soft', 'git stash'], answer: 1, explain: '--abort restores the branch to its pre-rebase state.' },
      ],
    },
    {
      id: 'interactive-rebase',
      title: 'Interactive rebase',
      summary: 'Squash, fixup, reword, drop and reorder commits before you share them.',
      minutes: 20,
      lab: {
        cwd: '~/search',
        panels: ['graph', 'files'],
        setup(H) {
          H.repo('~/search');
          H.commit('Create API', { 'api.js': 'export const routes = [];\n' });
          H.run('git switch -q -c feature/search');
          H.commit('Add search endpoint', { 'search.js': 'export const search = q => [];\n' });
          H.commit('Add search tests', { 'search.test.js': 'test("search", () => {});\n' });
          H.commit('WIP', { 'search.js': 'export const search = q => db.find(q);\n' });
          H.commit('fix tests', { 'search.test.js': 'test("search finds books", () => {});\n' });
          H.commit('debug print', { 'debug.js': 'console.log("here");\n' });
        },
        suggestions: ['git log --oneline main..', 'git rebase -i main'],
        tasks: [
          { title: 'List only the commits on your branch', solution: 'git log --oneline main..feature/search', check: t => t.ran(/^git log\b.*main\.\./) },
          {
            title: 'Rewrite the branch into two clean commits: "Add search endpoint" and "Add search tests"',
            detail: 'WIP belongs to the endpoint, "fix tests" belongs to the tests, and the debug print must go.',
            hint: 'In the todo list: move `WIP` under the endpoint line and change it to `fixup`; move `fix tests` under the tests line as `fixup`; change `debug print` to `drop`.',
            solution: 'git rebase -i main',
            test: [{ cmd: 'git rebase -i main', edit: todoPlan([['pick', /Add search endpoint/], ['fixup', /^WIP/], ['pick', /Add search tests/], ['fixup', /fix tests/], ['drop', /debug/]]) }],
            check: t => { const m = msgsSince(t, 'main', 'feature/search'); return m.join('|') === 'Add search endpoint|Add search tests' && /db\.find/.test(t.fileAt('feature/search', 'search.js') || '') && /finds books/.test(t.fileAt('feature/search', 'search.test.js') || '') && !t.fileAt('feature/search', 'debug.js'); },
          },
          {
            title: 'Reword "Add search tests" to "Test the search endpoint"',
            hint: '`git rebase -i main`, change `pick` to `reword` on that line, save, then edit the message.',
            solution: 'git rebase -i main',
            test: [{ cmd: 'git rebase -i main', edits: [todoPlan([['pick', /Add search endpoint/], ['reword', /Add search tests/]]), 'Test the search endpoint\n'] }],
            check: t => msgsSince(t, 'main', 'feature/search').join('|') === 'Add search endpoint|Test the search endpoint',
          },
          { title: 'Review the final story of your branch', solution: 'git log --oneline main..feature/search', check: t => t.history.filter(l => /^git log\b.*main\.\./.test(l)).length >= 2 },
        ],
      },
      quiz: [
        { type: 'mc', q: 'In an interactive rebase todo, what is the difference between `squash` and `fixup`?', choices: ['None', 'squash combines messages for you to edit; fixup keeps only the previous commit\'s message', 'fixup deletes the commit', 'squash reorders commits'], answer: 1, explain: 'Both meld the commit into the one above.' },
        { type: 'mc', q: 'Which command opens an editor to rewrite the last four commits?', choices: ['git rebase HEAD~4', 'git rebase -i HEAD~4', 'git reset HEAD~4', 'git commit --amend -4'], answer: 1, explain: '`-i` is interactive.' },
        { type: 'mc', q: 'In the todo list, which commit does a `fixup` line join?', choices: ['The one below it', 'The one above it', 'The first commit', 'The last commit'], answer: 1, explain: 'Squash and fixup always meld into the previous line\'s commit.' },
        { type: 'mc', q: 'What happens if you delete a line from the todo list?', choices: ['Nothing', 'That commit is dropped', 'The rebase fails', 'The commit moves to the end'], answer: 1, explain: 'Deleting a line is the same as `drop`.' },
        { type: 'type', q: 'Type the command that creates a commit marked as a fixup of commit `a1b2c3d`.', accept: ['git commit --fixup a1b2c3d', 'git commit --fixup=a1b2c3d'], model: 'git commit --fixup a1b2c3d', explain: 'Later, `git rebase -i --autosquash` places it automatically.' },
        { type: 'order', q: 'Order the todo lines to fold "fix typo" into "Add login page" and keep "Add logout".', items: ['pick 111 Add login page', 'fixup 333 fix typo', 'pick 222 Add logout'], explain: 'A fixup must sit directly under the commit it belongs to.' },
        { type: 'tf', q: 'Interactive rebase is safe to use on main after your teammates have pulled it.', answer: false, explain: 'It rewrites history. Use it on private branches.' },
      ],
    },
    {
      id: 'cherry-pick',
      title: 'Cherry-pick',
      summary: 'Copy one commit onto another branch: backport fixes and rescue misplaced commits.',
      minutes: 14,
      lab: {
        cwd: '~/rides',
        panels: ['graph', 'files'],
        setup(H) {
          H.repo('~/rides');
          H.commit('Release 2.4', { 'app.js': 'version = "2.4"\n', 'fare.js': 'export const fare = km => 2 + km / 0;\n' });
          H.run('git branch release/2.4');
          H.commit('Start new booking flow', { 'booking.js': 'export const steps = 3;\n' });
          const fix = H.commit('Fix crash when the fare is zero', { 'fare.js': 'export const fare = km => 2 + km * 1.5;\n' });
          H.commit('Redesign the map', { 'map.js': 'export const zoom = 14;\n' });
          H.run('git switch -q -c feature/map');
          H.commit('Use rounded map icons', { 'icons.css': '.pin { border-radius: 50%; }\n' });
          const banner = H.commit('Add surge pricing banner', { 'surge.html': '<div>Prices are higher right now</div>\n' });
          H.world.labData = { fix, banner, mainTip: H.shell.repo.refs['refs/heads/main'] };
        },
        suggestions: ['git log --oneline --graph --all'],
        tasks: [
          { title: 'Copy the fare fix onto release/2.4, recording where it came from', hint: 'Switch to the release branch, then `git cherry-pick -x <id>`.', solution: 'git switch release/2.4 && git cherry-pick -x main~1', check: t => { const h = t.ref('release/2.4'); const c = h && t.world.commit(h); return c && /Fix crash when the fare is zero/.test(c.message) && /cherry picked from commit/.test(c.message) && /1\.5/.test(t.fileAt('release/2.4', 'fare.js') || ''); } },
          { title: 'The surge banner was committed on the wrong branch. Create feature/surge from main and copy it there', solution: 'git switch -c feature/surge main && git cherry-pick feature/map', check: t => { const h = t.ref('feature/surge'); return h && /surge pricing banner/.test(t.world.commit(h).message) && t.world.commit(h).parents[0] === t.world.labData.mainTip; } },
          { title: 'Remove the banner commit from feature/map (it was never pushed)', solution: 'git switch feature/map && git reset --hard HEAD~1', check: t => { const h = t.ref('feature/map'); return h && h !== t.world.labData.banner && /rounded map icons/.test(t.world.commit(h).message); } },
          { title: 'Check all branches in the graph', solution: 'git log --oneline --graph --all', check: t => t.history.filter(l => /^git log\b.*--all/.test(l)).length >= 1 && t.ran(/cherry-pick/) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What does `git cherry-pick <commit>` do?', choices: ['Moves the commit to the current branch and deletes the original', 'Applies that commit\'s change on the current branch as a new commit', 'Merges the commit\'s whole branch', 'Checks out the commit'], answer: 1, explain: 'A copy with a new id; the original stays.' },
        { type: 'type', q: 'Type the command that cherry-picks `7c3e9a1` and adds a "(cherry picked from commit …)" line to the message.', accept: ['git cherry-pick -x 7c3e9a1'], model: 'git cherry-pick -x 7c3e9a1', explain: '`-x` records the source.' },
        { type: 'mc', q: 'Which is a good use of cherry-pick?', choices: ['Syncing two long-lived branches every day', 'Backporting one bug fix to a maintained release branch', 'Replacing all merges', 'Uploading to GitHub'], answer: 1, explain: 'Occasional, targeted copies.' },
        { type: 'mc', q: 'A cherry-pick conflicts. How do you finish after resolving the file and adding it?', choices: ['git cherry-pick --continue', 'git merge --continue', 'git commit --amend', 'git rebase --continue'], answer: 0, explain: 'Or --abort to cancel.' },
        { type: 'tf', q: 'If the original commit is changed later, its cherry-picked copy changes too.', answer: false, explain: 'The copy is an independent commit.' },
        { type: 'mc', q: 'You committed to `main` by mistake (not pushed); it belongs on `feature/x`. Which sequence fixes it?', choices: ['git push --force', 'git switch feature/x, git cherry-pick main, git switch main, git reset --hard HEAD~1', 'git revert main', 'git branch -D main'], answer: 1, explain: 'Copy it where it belongs, then remove it from main.' },
      ],
    },
    {
      id: 'golden-rule',
      title: 'The golden rule: merge vs rebase',
      summary: 'Rewrite private history freely, never shared history. A practical policy for teams.',
      minutes: 15,
      lab: {
        cwd: '~/ledger',
        panels: ['graph', 'github'],
        setup(H) {
          H.remote('ledgerly', 'ledger', [
            { message: 'Create ledger', files: { 'ledger.js': 'export const entries = [];\n' } },
          ], { collaborators: ['you'] });
          H.cd('~');
          H.run('git clone -q https://github.com/ledgerly/ledger.git');
          H.cd('~/ledger');
          H.run('git switch -q -c develop');
          H.commit('Add accounts', { 'accounts.js': 'export const accounts = [];\n' });
          H.run('git push -q -u origin develop');
          H.run('git switch -q -c feature/tax HEAD~1');
          H.commit('Add tax rates', { 'tax.js': 'export const vat = 0.2;\n' });
          H.commit('Apply tax to entries', { 'tax.js': 'export const vat = 0.2;\nexport const withTax = x => x * 1.2;\n' });
          H.teammate('ledgerly/ledger', { branch: 'develop', files: { 'reports.js': 'export const monthly = [];\n' }, message: 'Add monthly reports', author: { name: 'Ama Owusu', email: 'ama@ledgerly.example' } });
          H.run('git fetch -q');
          H.run('git switch -q develop');
          H.run('git merge -q --ff-only origin/develop');
          H.run('git switch -q feature/tax');
          H.world.labData = { developTip: H.shell.repo.refs['refs/heads/develop'] };
        },
        suggestions: ['git log --oneline --graph --all'],
        tasks: [
          { title: 'feature/tax is private. Bring it up to date by rebasing onto develop.', solution: 'git rebase develop', check: t => t.isAncestor(t.world.labData.developTip, t.ref('feature/tax')) && !t.state() && t.world.commit(t.ref('feature/tax')).parents.length === 1 },
          { title: 'develop is shared. Integrate the feature with a merge commit (no rebase of develop).', solution: 'git switch develop && git merge --no-ff --no-edit feature/tax', check: t => { const h = t.ref('develop'); return h && t.world.commit(h).parents.length === 2 && t.isAncestor(t.world.labData.developTip, h); } },
          { title: 'Share develop with a normal (non-force) push', solution: 'git push', check: t => t.remoteRef('ledgerly/ledger', 'develop') === t.ref('develop') && !t.ran(/--force/) },
          { title: 'Review the history you created', solution: 'git log --oneline --graph --all', check: t => t.history.filter(l => /^git log\b.*--graph/.test(l)).length >= 1 && t.ran(/^git push/) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What is the golden rule of rebasing?', choices: ['Always rebase before pushing', 'Never rewrite commits that others may have built on', 'Never use merge', 'Rebase only on Fridays'], answer: 1, explain: 'Rewriting shared history breaks everyone else\'s copy.' },
        { type: 'multi', q: 'Which actions are safe on a branch your teammates pull every day?', choices: ['git merge feature', 'git revert <commit>', 'git rebase -i HEAD~5 then force push', 'git commit --amend on a pushed commit'], answer: [0, 1], explain: 'Only operations that add history are safe.' },
        { type: 'mc', q: 'A common team policy is:', choices: ['Rebase main every morning', 'Rebase your own feature branch to stay current; merge features into main through PRs', 'Never branch', 'Force-push main after every merge'], answer: 1, explain: 'Private: rebase. Shared: merge.' },
        { type: 'mc', q: 'Why does a rebased shared branch confuse teammates?', choices: ['It deletes their files', 'Their repositories hold the old commits, while the branch now has new copies with different ids', 'GitHub blocks it', 'It renames the branch'], answer: 1, explain: 'Git sees two diverged histories.' },
        { type: 'tf', q: 'Merge commits are a mistake and should always be avoided.', answer: false, explain: 'They are an honest record. Linear history is a team preference.' },
        { type: 'type', q: 'You just finished a rebase and regret it (nobody has pulled). Type the command that moves the branch back to where it was before.', accept: ['git reset --hard ORIG_HEAD', 'git reset --hard HEAD@{1}'], model: 'git reset --hard ORIG_HEAD', explain: 'ORIG_HEAD records the position before the last rebase or reset. The reflog also works.' },
      ],
    },
    {
      id: 'rewriting-boss',
      title: 'Boss: Ready for review',
      summary: 'Rebase, polish a messy branch into three clean commits, and backport a security fix.',
      minutes: 25,
      boss: true,
      lab: {
        cwd: '~/ledgerly',
        panels: ['graph', 'files', 'areas'],
        setup(H) {
          H.repo('~/ledgerly');
          H.commit('Create Ledgerly', { 'app.js': 'export const app = {};\n', 'config.json': '{ "dbUrl": "local" }\n' });
          H.run('git branch release/1.x');
          H.run('git switch -q -c feature/invoices');
          H.commit('Add invoice model', { 'invoice.js': 'export class Invoice {}\n' });
          H.commit('WIP', { 'invoice.js': 'export class Invoice {\n  total = 0;\n}\n' });
          H.commit('Add PDF exprt', { 'pdf.js': 'export const toPdf = inv => "pdf";\n' });
          H.commit('debug logging', { 'debug.js': 'console.log("invoice", 1);\n' });
          H.commit('emails', { 'email.js': 'export const send = inv => true;\n', 'config.json': '{ "dbUrl": "local", "smtp": "mail.local" }\n' });
          H.commit('fix pdf', { 'pdf.js': 'export const toPdf = inv => `pdf:${inv.total}`;\n' });
          H.run('git switch -q main');
          H.commit('Update README', { 'README.md': '# Ledgerly\n' });
          const security = H.commit('Fix SQL injection in search', { 'search.js': 'export const search = q => db.query("?", [q]);\n' });
          H.commit('Rename config key to databaseUrl', { 'config.json': '{ "databaseUrl": "local" }\n' });
          H.run('git switch -q feature/invoices');
          H.world.labData = { security, mainTip: H.shell.repo.refs['refs/heads/main'] };
        },
        tasks: [
          {
            title: 'Rebase feature/invoices onto main; in config.json keep databaseUrl AND smtp',
            solution: 'git rebase main → edit config.json → git add config.json → git rebase --continue',
            test: ['git rebase main', { cmd: 'edit config.json', edit: '{ "databaseUrl": "local", "smtp": "mail.local" }\n' }, 'git add config.json', 'git rebase --continue'],
            check: t => !t.state() && t.isAncestor(t.world.labData.mainTip, t.ref('feature/invoices')) && /databaseUrl/.test(t.fileAt('feature/invoices', 'config.json') || '') && /smtp/.test(t.fileAt('feature/invoices', 'config.json') || '') && noMarkers(t.fileAt('feature/invoices', 'config.json')),
          },
          {
            title: 'Polish the branch into exactly: "Add invoice model", "Add invoice PDF export", "Add invoice email sending"',
            detail: 'All of the work must survive (the WIP total, the PDF fix), and the debug commit must be gone.',
            solution: 'git rebase -i main',
            test: [{ cmd: 'git rebase -i main', edits: [todoPlan([['pick', /Add invoice model/], ['fixup', /^WIP/], ['reword', /Add PDF exprt/], ['fixup', /fix pdf/], ['reword', /^emails/], ['drop', /debug/]]), 'Add invoice PDF export\n', 'Add invoice email sending\n'] }],
            check: t => msgsSince(t, 'main', 'feature/invoices').join('|') === 'Add invoice model|Add invoice PDF export|Add invoice email sending' && /total = 0/.test(t.fileAt('feature/invoices', 'invoice.js') || '') && /inv\.total/.test(t.fileAt('feature/invoices', 'pdf.js') || '') && !t.fileAt('feature/invoices', 'debug.js') && t.isAncestor(t.world.labData.mainTip, t.ref('feature/invoices')),
          },
          { title: 'Backport the SQL injection fix to release/1.x, recording its origin', solution: 'git switch release/1.x && git cherry-pick -x <security fix id>', test: [t => `git switch release/1.x && git cherry-pick -x ${t.world.labData.security.slice(0, 7)}`], check: t => { const h = t.ref('release/1.x'); const c = h && t.world.commit(h); return c && /Fix SQL injection/.test(c.message) && /cherry picked from commit/.test(c.message); } },
          { title: 'Finish with a clean working tree', solution: 'git status', allowEarly: true, check: t => t.clean() && !t.state() && t.ran(/^git status/) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'Your private feature branch is behind main and full of WIP commits. Best preparation for review?', choices: ['Merge main into it daily and push', 'Rebase onto main, then interactive rebase to clean up the commits', 'Force-push main', 'Delete the branch and start over'], answer: 1, explain: 'Private branch: polish freely.' },
        { type: 'order', q: 'Order these todo lines so the fix lands in the PDF commit and the debug commit disappears.', items: ['pick 1a Add invoice model', 'pick 2b Add invoice PDF export', 'fixup 4d fix pdf', 'drop 3c debug logging'], explain: 'fixup goes directly under its target; drop can be anywhere.' },
        { type: 'mc', q: 'Which tool moves a single fix to a release branch without bringing other work?', choices: ['git merge main', 'git rebase main', 'git cherry-pick <fix>', 'git revert <fix>'], answer: 2, explain: 'Cherry-pick copies one commit.' },
        { type: 'mc', q: 'Which `reword` behaviour is correct?', choices: ['Changes the files of a commit', 'Keeps the changes, lets you edit the message', 'Removes the commit', 'Merges two commits'], answer: 1, explain: 'For changing files, use `edit`.' },
        { type: 'tf', q: 'If you rebase a feature branch you already pushed, a normal `git push` will be rejected.', answer: true, explain: 'The remote branch is no longer an ancestor; you need --force-with-lease (only if nobody else uses the branch).' },
        { type: 'mc', q: 'Mid-rebase you see "CONFLICT" in a commit you thought was simple. What is always safe?', choices: ['git rebase --abort', 'git push --force', 'rm -rf .git', 'git reset --hard origin/main'], answer: 0, explain: 'It returns the branch to its state before the rebase.' },
        { type: 'multi', q: 'Which statements about cherry-pick are true?', choices: ['The new commit has a new id', '-x records the original commit id in the message', 'It removes the commit from the source branch', 'It can conflict like a merge'], answer: [0, 1, 3], explain: 'The source branch is untouched.' },
      ],
    },
  ],
};
