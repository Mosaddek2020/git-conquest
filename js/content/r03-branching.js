// Realm 3 · Branching: what a branch is, create/switch, manage, stash.

export default {
  id: 'branching',
  n: 3,
  title: 'Branching',
  tagline: 'Parallel lines of work: create, switch, manage and shelve',
  badge: 'Many-Worlds Walker',
  intro: 'Branches let you work on several things at once without stepping on anyone, yourself included. Learn what a branch **really** is (a 41-byte pointer), how switching changes your files, how to keep branches tidy, and how to shelve unfinished work with **stash**.',
  lessons: [
    {
      id: 'what-is-a-branch',
      title: 'What a branch really is',
      summary: 'A movable pointer to a commit, and HEAD points at the current branch.',
      minutes: 14,
      lab: {
        cwd: '~/menu',
        panels: ['graph', 'files'],
        setup(H) {
          H.repo('~/menu');
          H.commit('Create menu', { 'menu.txt': 'Menu\n' });
          H.commit('Add soups', { 'soups.txt': 'tomato\n' });
          H.run('git branch desserts');
          H.world.labData = { base: H.shell.repo.refs['refs/heads/main'] };
        },
        suggestions: ['cat .git/HEAD', 'ls .git/refs/heads'],
        tasks: [
          { title: 'Read which branch HEAD points at', solution: 'cat .git/HEAD', check: t => t.ran(/^cat\s+(\.\/)?\.git\/HEAD$/) },
          { title: 'List the branch files inside .git', solution: 'ls .git/refs/heads', check: t => t.ran(/^ls\s+(\.\/)?\.git\/refs\/heads\/?$/) },
          { title: 'Print the desserts branch file: it is just a commit id', solution: 'cat .git/refs/heads/desserts', check: t => t.ran(/^cat\s+(\.\/)?\.git\/refs\/heads\/desserts$/) },
          { title: 'Create a branch called drinks without switching to it', hint: '`git branch <name>` creates; it does not switch.', solution: 'git branch drinks', check: t => !!t.ref('drinks') && t.branch() === 'main' },
          { title: 'Make a commit on main and watch which labels move', solution: 'echo "caesar" > salads.txt && git add salads.txt && git commit -m "Add salads"', check: t => t.ref('main') !== t.world.labData.base && t.ref('drinks') === t.world.labData.base && t.ref('desserts') === t.world.labData.base },
          { title: 'Confirm with a graph of all branches', solution: 'git log --oneline --graph --all', check: t => t.ran(/^git log\b.*--all/) || t.ran(/^git branch\s+-v/) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What is a git branch?', choices: ['A full copy of the project', 'A movable pointer (label) to a commit', 'A folder inside .git with all files', 'A server on GitHub'], answer: 1, explain: 'A branch is a tiny file holding one commit id.' },
        { type: 'mc', q: 'You are on `main` and commit. Which labels move?', choices: ['All branches', 'Only main (and HEAD with it)', 'Only HEAD', 'None'], answer: 1, explain: 'Only the current branch advances.' },
        { type: 'predict', q: 'What does this print?', code: '$ cat .git/HEAD', choices: ['A commit id, always', '"ref: refs/heads/<current branch>" (when not detached)', 'The list of branches', 'The last commit message'], answer: 1, explain: 'HEAD names the current branch.' },
        { type: 'tf', q: 'Creating a branch copies all the files in the project.', answer: false, explain: 'It writes one 41-byte file. That is why branching is instant.' },
        { type: 'mc', q: 'Is `main` special to git?', choices: ['Yes, git cannot work without it', 'No, it is a normal branch that teams agree to treat as official', 'Only on GitHub', 'Only for merges'], answer: 1, explain: 'It is a convention. Some repos use master, trunk or develop.' },
        { type: 'mc', q: 'Where does git store the tip of the branch `feature`?', choices: ['.git/HEAD', '.git/refs/heads/feature', '.git/branches.json', 'feature/ in the working directory'], answer: 1, explain: 'One file per branch (or packed into packed-refs).' },
      ],
    },
    {
      id: 'create-switch',
      title: 'Creating and switching branches',
      summary: 'git switch -c, git switch, and what switching does to your files.',
      minutes: 15,
      lab: {
        cwd: '~/recipes',
        panels: ['graph', 'areas', 'files'],
        setup(H) {
          H.repo('~/recipes');
          H.commit('Create recipe site', { 'index.html': '<h1>Recipes</h1>\n', 'contact.html': '<p>Email: hello@recipes.exmaple</p>\n' });
          H.commit('Add recipe cards', { 'cards.css': '.card { padding: 1rem; }\n' });
          H.world.labData = { mainTip: H.shell.repo.refs['refs/heads/main'] };
        },
        suggestions: ['git branch', 'git switch -c feature/vegan-filter'],
        tasks: [
          { title: 'Create and switch to a branch called feature/vegan-filter', solution: 'git switch -c feature/vegan-filter', check: t => t.branch() === 'feature/vegan-filter' },
          { title: 'Add filter.js and commit it on that branch', solution: 'echo "export const vegan = true;" > filter.js && git add filter.js && git commit -m "Add vegan filter"', check: t => !!t.fileAt('feature/vegan-filter', 'filter.js') && !t.fileAt('main', 'filter.js') },
          { title: 'Urgent fix needed: go back to main', detail: 'Notice filter.js disappears from the folder.', solution: 'git switch main', check: t => t.branch() === 'main' && !t.exists('~/recipes/filter.js') },
          {
            title: 'From main, create fix/contact-email and fix the typo exmaple → example in contact.html, then commit',
            hint: 'Create the branch, edit the file (`edit contact.html` or `sed -i "s/exmaple/example/" contact.html`), commit.',
            solution: 'git switch -c fix/contact-email && sed -i "s/exmaple/example/" contact.html && git commit -am "Fix typo in contact email"',
            check: t => /example/.test(t.fileAt('fix/contact-email', 'contact.html') || '') && t.world.commit(t.ref('fix/contact-email')).parents[0] === t.world.labData.mainTip,
          },
          { title: 'Return to feature/vegan-filter: filter.js should be back', solution: 'git switch feature/vegan-filter', check: t => t.branch() === 'feature/vegan-filter' && t.exists('~/recipes/filter.js') },
          { title: 'Jump back to the previous branch with the shortcut', hint: 'One character means "previous".', solution: 'git switch -', check: t => t.ran(/^git (switch|checkout) -$/) && t.branch() === 'fix/contact-email' },
        ],
      },
      quiz: [
        { type: 'type', q: 'Type the command that creates a branch `feature/search` and switches to it.', accept: ['git switch -c feature/search', 'git checkout -b feature/search'], model: 'git switch -c feature/search', explain: '`switch -c` (or classic `checkout -b`).' },
        { type: 'mc', q: 'You switch from a branch that has `dark.css` to one that does not. What happens to `dark.css` in your folder?', choices: ['It stays', 'Git removes it from the working directory; it is still safe in the other branch\'s commits', 'It is deleted forever', 'Git asks you'], answer: 1, explain: 'Switching rewrites the working directory to match the target commit.' },
        { type: 'mc', q: 'Git refuses to switch: "Your local changes would be overwritten." What are your options?', choices: ['Delete the repository', 'Commit, stash, or discard the changes first', 'Use git push', 'Rename the branch'], answer: 1, explain: 'Git protects uncommitted work.' },
        { type: 'type', q: 'Type the command that creates `hotfix` starting from `main`, no matter which branch you are on now.', accept: ['git switch -c hotfix main', 'git checkout -b hotfix main', 'git branch hotfix main'], model: 'git switch -c hotfix main', explain: 'The last argument is the start point.' },
        { type: 'tf', q: 'Untracked files stay in the working directory when you switch branches.', answer: true, explain: 'They belong to no branch.' },
        { type: 'mc', q: 'Which is the classic equivalent of `git switch -c x`?', choices: ['git branch -c x', 'git checkout -b x', 'git checkout x', 'git new x'], answer: 1, explain: '`checkout -b` creates and switches.' },
        { type: 'mc', q: 'Why do teams prefer one branch per task?', choices: ['Git requires it', 'Unfinished work stays isolated, and each task can be reviewed and merged or dropped on its own', 'It saves disk space', 'It makes commits faster'], answer: 1, explain: 'Isolation, focused reviews and easy rollback.' },
      ],
    },
    {
      id: 'manage-branches',
      title: 'Managing branches',
      summary: 'List, rename and delete branches; know which are merged.',
      minutes: 12,
      lab: {
        cwd: '~/gallery',
        panels: ['graph'],
        setup(H) {
          H.repo('~/gallery');
          H.commit('Create gallery site', { 'index.html': '<h1>Gallery</h1>\n' });
          H.run('git branch old-fix');
          H.commit('Add thumbnails', { 'thumbs.css': 'img { width: 120px; }\n' });
          H.run('git branch typo-fix');
          H.run('git branch test2-final');
          H.run('git switch -q -c spike-layout');
          H.commit('Try a masonry layout', { 'layout.css': '.grid { columns: 3; }\n' });
          H.run('git switch -q main');
          H.run('git switch -q -c newstuff');
          H.commit('Add lightbox', { 'lightbox.js': 'export const open = () => {};\n' });
          H.run('git switch -q main');
          H.commit('Add footer', { 'footer.html': '<footer>© Gallery</footer>\n' });
        },
        suggestions: ['git branch -v', 'git branch --merged'],
        tasks: [
          { title: 'List the branches with their last commits', solution: 'git branch -v', check: t => t.ran(/^git branch\s+-vv?$/) },
          { title: 'Find the branches already merged into main', solution: 'git branch --merged', check: t => t.ran(/^git branch\s+--merged/) },
          { title: 'Safely delete old-fix, typo-fix and test2-final', hint: '`git branch -d` accepts several names.', solution: 'git branch -d old-fix typo-fix test2-final', check: t => !t.ref('old-fix') && !t.ref('typo-fix') && !t.ref('test2-final') && !!t.ref('spike-layout') },
          { title: 'Try to safely delete spike-layout and read why git refuses', solution: 'git branch -d spike-layout', check: t => t.ran(/^git branch\s+-d\s+spike-layout/) && !!t.ref('spike-layout') },
          { title: 'Rename newstuff to feature/lightbox', solution: 'git branch -m newstuff feature/lightbox', check: t => !!t.ref('feature/lightbox') && !t.ref('newstuff') },
          { title: 'Print only the name of the current branch', solution: 'git branch --show-current', check: t => t.ran(/^git branch\s+--show-current/) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What is the difference between `git branch -d` and `-D`?', choices: ['None', '-d refuses to delete unmerged work; -D deletes anyway', '-D deletes on GitHub too', '-d deletes the commits as well'], answer: 1, explain: '-d is the safe version.' },
        { type: 'type', q: 'Type the command that renames the current branch to `main`.', accept: ['git branch -m main', 'git branch -M main', 'git branch --move main'], model: 'git branch -m main', explain: '`-m` moves (renames).' },
        { type: 'mc', q: 'What does `git branch --merged` list?', choices: ['Branches with merge commits', 'Branches whose tips are already in the current branch\'s history', 'Branches on GitHub', 'All branches'], answer: 1, explain: 'Those are safe to delete with -d.' },
        { type: 'mc', q: 'You try to delete the branch you are on. What happens?', choices: ['It is deleted and you land on main', 'Git refuses; switch to another branch first', 'The repository breaks', 'HEAD becomes detached'], answer: 1, explain: 'You cannot delete the checked-out branch.' },
        { type: 'tf', q: 'Renaming a branch locally also renames it on GitHub.', answer: false, explain: 'Remote names change only when you push the new name and delete the old one.' },
        { type: 'multi', q: 'Which branch names follow common conventions?', choices: ['feature/search-filters', 'fix/PAY-142-refund-rounding', 'my branch', 'test2-final-REAL'], answer: [0, 1], explain: 'Type prefix plus a short description (and optionally a ticket). Spaces are not allowed.' },
      ],
    },
    {
      id: 'stash',
      title: 'Stash: pause your work',
      summary: 'Shelve uncommitted changes, switch context, and bring them back.',
      minutes: 14,
      lab: {
        cwd: '~/shop',
        panels: ['areas', 'graph', 'files'],
        setup(H) {
          H.repo('~/shop');
          H.commit('Create shop', { 'checkout.js': 'export const total = items => items.length;\n', 'reviews.js': 'export const reviews = [];\n' });
          H.run('git switch -q -c feature/reviews');
          H.commit('Add review form', { 'form.html': '<form id="review"></form>\n' });
          H.write('reviews.js', 'export const reviews = [];\nexport const maxStars = 5;\n');
          H.write('stars.css', '.star { color: gold; }\n');
        },
        suggestions: ['git status', 'git stash list'],
        tasks: [
          { title: 'Shelve all your unfinished work, including the new stars.css', hint: 'Plain `git stash` leaves untracked files behind.', solution: 'git stash -u', check: t => t.repo.stash.length >= 1 && t.clean() && !t.exists('~/shop/stars.css') },
          { title: 'Switch to main', solution: 'git switch main', check: t => t.branch() === 'main' },
          { title: 'Create fix/checkout-total and commit a fix there', detail: 'Change checkout.js so the total sums prices: `items.reduce((s, i) => s + i.price, 0)`.', solution: 'git switch -c fix/checkout-total && echo "export const total = items => items.reduce((s, i) => s + i.price, 0);" > checkout.js && git commit -am "Sum item prices in checkout total"', check: t => /reduce/.test(t.fileAt('fix/checkout-total', 'checkout.js') || '') },
          { title: 'Go back to feature/reviews', solution: 'git switch feature/reviews', check: t => t.branch() === 'feature/reviews' },
          { title: 'Bring your work back and remove it from the stash', solution: 'git stash pop', check: t => t.repo.stash.length === 0 && /maxStars/.test(t.file('~/shop/reviews.js') || '') && t.exists('~/shop/stars.css') },
          { title: 'Check the stash list is empty', solution: 'git stash list', check: t => t.ran(/^git stash list/) && t.repo.stash.length === 0 },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What does `git stash` save by default?', choices: ['Everything in the folder', 'Uncommitted changes to tracked files (staged and unstaged)', 'Only staged changes', 'Committed work'], answer: 1, explain: 'Untracked files need `-u`.' },
        { type: 'mc', q: 'Difference between `git stash pop` and `git stash apply`?', choices: ['None', 'pop applies and removes the stash; apply keeps it in the list', 'apply removes it', 'pop only works on main'], answer: 1, explain: 'apply is useful when you want the same changes on several branches.' },
        { type: 'type', q: 'Type the command that stashes your changes including untracked files, with the description "half-done form".', accept: [/^git stash (push )?-u -m "half-done form"$/, /^git stash (push )?-m "half-done form" -u$/, /^git stash (push )?--include-untracked -m "half-done form"$/], model: 'git stash push -u -m "half-done form"', explain: '`-u` for untracked, `-m` for a message.' },
        { type: 'mc', q: 'Which stash is `stash@{0}`?', choices: ['The oldest', 'The newest', 'The one from main', 'The first one you named'], answer: 1, explain: 'The stash is a stack; 0 is the top.' },
        { type: 'tf', q: 'Stashes are pushed to GitHub with git push.', answer: false, explain: 'Stashes are local only.' },
        { type: 'mc', q: 'You will be away from a messy change for a week. What is usually safer than a stash?', choices: ['Delete the changes', 'A WIP commit on your feature branch', 'git reset --hard', 'Copy the folder to the desktop'], answer: 1, explain: 'Commits are visible in history and can be pushed; stashes are easy to forget.' },
      ],
    },
    {
      id: 'branching-boss',
      title: 'Boss: Context-switch chaos',
      summary: 'Pause a feature, ship an urgent fix from main, tidy branches, and resume without losing anything.',
      minutes: 20,
      boss: true,
      lab: {
        cwd: '~/wayfarer',
        panels: ['graph', 'areas', 'files'],
        setup(H) {
          H.repo('~/wayfarer');
          H.commit('Create booking site', { 'index.html': '<h1>Wayfarer</h1>\n', 'confirm.html': '<p>Booking confirmed for 2025</p>\n' });
          H.run('git branch old-banner');
          H.commit('Add destination pages', { 'destinations.html': '<ul><li>Lisbon</li></ul>\n' });
          H.run('git branch hotfix-2025');
          H.run('git switch -q -c newstuff');
          H.commit('Add photo gallery', { 'gallery.js': 'export const photos = [];\n' });
          H.run('git switch -q main');
          H.commit('Add search box', { 'search.html': '<input>\n' });
          H.world.labData = { mainTip: H.shell.repo.refs['refs/heads/main'] };
          H.run('git switch -q -c feature/price-alerts');
          H.commit('Add price alert model', { 'alerts.js': 'export const alerts = [];\n' });
          H.write('alerts.js', 'export const alerts = [];\nexport const notify = a => a;\n');
          H.write('alerts.css', '.alert { border: 1px solid; }\n');
        },
        tasks: [
          { title: 'Pause your price-alerts work, including the new file', solution: 'git stash -u', check: t => t.repo.stash.length >= 1 && t.clean() },
          { title: 'Branch fix/confirmation-year from main and fix the year (2025 → 2026) in confirm.html', solution: 'git switch main && git switch -c fix/confirmation-year && sed -i "s/2025/2026/" confirm.html && git commit -am "Show the correct year on the booking confirmation"', check: t => /2026/.test(t.fileAt('fix/confirmation-year', 'confirm.html') || '') && t.world.commit(t.ref('fix/confirmation-year')).parents[0] === t.world.labData.mainTip },
          { title: 'Delete the branches that are already merged into main', detail: 'Keep any branch holding unmerged work.', solution: 'git switch main && git branch -d old-banner hotfix-2025', check: t => !t.ref('old-banner') && !t.ref('hotfix-2025') && (!!t.ref('newstuff') || !!t.ref('feature/photo-gallery')) },
          { title: 'Rename newstuff to feature/photo-gallery', solution: 'git branch -m newstuff feature/photo-gallery', check: t => !!t.ref('feature/photo-gallery') && !t.ref('newstuff') },
          { title: 'Resume price-alerts exactly where you left off', solution: 'git switch feature/price-alerts && git stash pop', check: t => t.branch() === 'feature/price-alerts' && t.repo.stash.length === 0 && t.exists('~/wayfarer/alerts.css') && /notify/.test(t.file('~/wayfarer/alerts.js') || '') },
        ],
      },
      quiz: [
        { type: 'order', q: 'Order the steps to handle an urgent fix while mid-feature with uncommitted work.', items: ['git stash -u', 'git switch main', 'git switch -c fix/urgent', 'commit the fix', 'git switch feature/x', 'git stash pop'], explain: 'Shelve, branch from main, fix, return, restore.' },
        { type: 'mc', q: 'Why branch the fix from `main` rather than from your feature branch?', choices: ['It is faster', 'So the fix does not include your unfinished feature work', 'Git requires it', 'Feature branches cannot have children'], answer: 1, explain: 'A fix branch from main contains only main plus the fix.' },
        { type: 'mc', q: 'Which branches can `git branch -d` delete without complaint?', choices: ['Any branch', 'Branches whose commits are all reachable from the current branch (or their upstream)', 'Only remote branches', 'Only the current branch'], answer: 1, explain: 'Fully merged branches.' },
        { type: 'predict', q: 'You are on `feature/a`. What happens?', code: '$ git branch -d feature/a', choices: ['It is deleted', 'error: cannot delete the branch you are on', 'HEAD detaches', 'It is renamed'], answer: 1, explain: 'Switch away first.' },
        { type: 'tf', q: 'After `git stash -u`, `git status` shows a clean working tree.', answer: true, explain: 'Tracked changes and untracked files are both shelved.' },
        { type: 'mc', q: 'You popped a stash onto the wrong branch. What is the cleanest fix if nothing else changed?', choices: ['git stash (shelve it again), switch to the right branch, git stash pop', 'git reset --hard origin/main', 'Delete the repository', 'git push --force'], answer: 0, explain: 'Stash again, move, pop.' },
        { type: 'multi', q: 'Which statements about branches are true?', choices: ['Creating a branch is nearly instant', 'Deleting a branch removes its label, not immediately its commits', 'Each branch stores a separate copy of every file', 'HEAD usually points at a branch'], answer: [0, 1, 3], explain: 'Branches are pointers.' },
      ],
    },
  ],
};
