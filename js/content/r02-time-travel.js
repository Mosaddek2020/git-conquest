// Realm 2 · Time Travel: reading history, detached HEAD, amend, reset, revert, reflog.

export default {
  id: 'time-travel',
  n: 2,
  title: 'Time Travel',
  tagline: 'Search history, visit the past, and undo almost anything',
  badge: 'Chrononaut',
  intro: 'Git remembers everything, and in this realm you learn to use that memory. Search history like a detective, visit old versions, fix your last commit, and choose the right undo: **reset** for private history, **revert** for shared history, and the **reflog** when you think something is lost.',
  lessons: [
    {
      id: 'history-detective',
      title: 'Reading history like a detective',
      summary: 'Name any commit and filter git log by author, date, message, path and content.',
      minutes: 18,
      lab: {
        cwd: '~/bookshop',
        panels: ['graph', 'files'],
        setup(H) {
          H.repo('~/bookshop');
          const joel = 'Joel Kim <joel@pages.example>', mei = 'Mei Chen <mei@pages.example>', sara = 'Sara Oduya <sara@pages.example>';
          H.commit('Create the bookshop', { 'index.html': '<h1>Pages Bookshop</h1>\n', 'shipping/rates.json': '{ "US": 5, "CA": 8, "UK": 12 }\n' }, { author: sara, hours: 1 });
          H.commit('Add search page', { 'search.html': '<input placeholder="Search books">\n' }, { author: mei, hours: 200 });
          H.commit('Add gift wrapping option', { 'checkout.js': 'export const giftWrap = 2.5;\n' }, { author: sara, hours: 60 });
          H.world.labData = { bad: H.commit('Update rates for 2026', { 'shipping/rates.json': '{ "US": 5, "CA": 80, "UK": 12 }\n' }, { author: joel, hours: 80 }) };
          H.commit('Improve search results ranking', { 'search.js': 'export const boostTitle = 2;\n' }, { author: mei, hours: 40 });
          H.commit('Fix typo on the homepage', { 'index.html': '<h1>Pages Bookshop</h1>\n<p>Welcome, readers.</p>\n' }, { author: mei, hours: 30 });
          H.run('git switch -q -c promo');
          H.commit('Add spring sale banner', { 'banner.html': '<div>Spring sale: 20% off</div>\n' }, { author: sara, hours: 5 });
          H.commit('Show sale prices in cart', { 'checkout.js': 'export const giftWrap = 2.5;\nexport const discount = 0.2;\n' }, { author: sara, hours: 3 });
          H.run('git switch -q main');
          H.hours(4);
        },
        suggestions: ['git log --oneline', 'git log --oneline --graph --all'],
        tasks: [
          { title: 'Show only the five most recent commits, one line each', hint: 'Combine `--oneline` with a count such as `-n 5` or `-5`.', solution: 'git log --oneline -n 5', check: t => t.ran(/^git log\b.*(-n\s*5\b|-5\b|--max-count=5)/) },
          { title: 'List only the commits that touched shipping/rates.json', hint: 'Put the path after `--`.', solution: 'git log --oneline -- shipping/rates.json', check: t => t.ran(/^git log\b.*shipping\/rates\.json/) },
          { title: 'Find the commit that added or removed the text 80', hint: 'The "pickaxe" option searches the code changes: `-S`.', solution: 'git log -S 80 --oneline', check: t => t.ran(/^git log\b.*-S\s*\S+/) },
          {
            title: 'Show that commit in full: who made the shipping mistake?',
            solution: 'git show <id>',
            test: ['git show HEAD~2'],
            check: t => t.history.some(l => { const m = l.match(/^git show\s+(\S+)/); return m && t.ref(m[1]) === t.world.labData.bad; }),
            after: 'Joel Kim changed CA from 8 to 80. Mystery solved.',
          },
          { title: "List Mei's commits from the last week only", hint: 'Combine `--author` and `--since="1 week ago"`.', solution: 'git log --oneline --author=Mei --since="1 week ago"', check: t => t.ran(/^git log\b(?=.*--author)(?=.*--since)/) },
          { title: 'Show the commits on the promo branch that are not on main yet', hint: 'Use a range: `main..promo`.', solution: 'git log --oneline main..promo', check: t => t.ran(/^git log\b.*main\.\.promo/) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'Which option finds commits whose **code changes** added or removed the text `freeShipping`?', choices: ['--grep=freeShipping', '-S freeShipping', '--author=freeShipping', '--format=freeShipping'], answer: 1, explain: '`-S` (the pickaxe) searches changes; `--grep` searches messages.' },
        { type: 'mc', q: 'What is `HEAD~2`?', choices: ['The second parent of a merge', 'The grandparent of the current commit', 'Two commits in the future', 'The branch named HEAD~2'], answer: 1, explain: '`~n` walks n generations back along first parents. `^2` is the second parent.' },
        { type: 'mc', q: 'What does `git log main..feature` list?', choices: ['Commits on main not on feature', 'Commits on feature not on main', 'All commits on both', 'Only merge commits'], answer: 1, explain: '`A..B` = reachable from B but not from A: what feature adds.' },
        { type: 'type', q: 'Type a command that lists, one line each, only the commits that touched `src/payments/`.', accept: [/^git log --oneline (-- )?src\/payments\/?$/, /^git log (-- )?src\/payments\/? --oneline$/], model: 'git log --oneline -- src/payments/', explain: 'Put paths after `--` to limit the log.' },
        { type: 'mc', q: 'You want release notes for everything between tags v1.3.0 and v1.4.0. Which command?', choices: ['git log v1.4.0..v1.3.0', 'git log v1.3.0..v1.4.0 --oneline', 'git show v1.4.0', 'git diff v1.3.0'], answer: 1, explain: 'Commits reachable from v1.4.0 but not from v1.3.0.' },
        { type: 'multi', q: 'Which of these can stand in for a commit id in git commands?', choices: ['HEAD~1', 'main', 'v2.0.1 (a tag)', 'HEAD@{2}', 'README.md'], answer: [0, 1, 2, 3], explain: 'Branches, tags, relative and reflog names all resolve to commits. A file name does not.' },
        { type: 'predict', q: 'What does this print?', code: '$ git log --format="%h %an" -1', choices: ['The full id and message of every commit', 'The short id and author name of the latest commit', 'Only the author', 'An error'], answer: 1, explain: '`%h` short id, `%an` author name, `-1` one commit.' },
      ],
    },
    {
      id: 'detached-head',
      title: 'Visiting the past',
      summary: 'Check out old commits, understand detached HEAD, and get back safely.',
      minutes: 15,
      lab: {
        cwd: '~/invoices',
        panels: ['graph', 'files'],
        setup(H) {
          H.repo('~/invoices');
          H.commit('Add invoice model', { 'invoice.js': 'export class Invoice {}\n' });
          H.commit('Add PDF export', { 'export.js': 'export function toPdf(inv) { return "pdf"; }\n' });
          H.run('git tag v1.0');
          H.world.labData = { v1: H.shell.repo.refs['refs/tags/v1.0'] };
          H.commit('Redesign invoice header', { 'header.css': 'h1 { font-size: 3rem; }\n' });
          H.commit('Switch PDF export to new engine', { 'export.js': 'export function toPdf(inv) { return engine2(inv); }\n' });
        },
        onCommand(line, res, t) {
          const repo = t.repo;
          if (repo && /^git status/.test(line) && !t.branch()) t.world.labData.sawDetached = true;
        },
        suggestions: ['git tag', 'git log --oneline'],
        tasks: [
          { title: 'List the tags in this repository', solution: 'git tag', check: t => t.ran(/^git tag$/) },
          { title: 'Visit the v1.0 release (detached HEAD)', hint: '`git switch --detach v1.0` or the classic `git checkout v1.0`.', solution: 'git switch --detach v1.0', check: t => !t.branch() && t.headHash() === t.world.labData.v1 },
          { title: 'Confirm with git status that HEAD is detached', solution: 'git status', check: t => !!t.world.labData.sawDetached },
          { title: 'Make an experimental commit here', detail: 'Change any file and commit it while detached.', solution: 'echo "/* bigger font */" >> export.js && git commit -am "Experiment: bigger font in PDFs"', check: t => !t.branch() && t.head()?.parents[0] === t.world.labData.v1 },
          { title: 'Save the experiment on a new branch called font-experiment', hint: '`git switch -c <name>` creates a branch where you are.', solution: 'git switch -c font-experiment', check: t => { const h = t.ref('font-experiment'); return !!h && t.world.commit(h).parents[0] === t.world.labData.v1; } },
          { title: 'Return to main', solution: 'git switch main', check: t => t.branch() === 'main' },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What does "detached HEAD" mean?', choices: ['The repository is corrupted', 'HEAD points directly at a commit instead of at a branch', 'You deleted the HEAD file', 'You are not in a repository'], answer: 1, explain: 'It is normal when you check out a commit or tag.' },
        { type: 'mc', q: 'You made two commits while detached and then ran `git switch main`. What happened to them?', choices: ['They were merged into main', 'They still exist but no branch points at them; the reflog can find them', 'They were pushed', 'They were deleted instantly'], answer: 1, explain: 'Create a branch at their id to keep them: `git branch rescue <id>`.' },
        { type: 'type', q: 'Type the command that creates a branch called `rescue` at your current (detached) position and switches to it.', accept: ['git switch -c rescue', 'git checkout -b rescue'], model: 'git switch -c rescue', explain: 'A branch gives the commits a name.' },
        { type: 'type', q: 'Type the command that takes you back to the branch you were on before.', accept: ['git switch -', 'git checkout -'], model: 'git switch -', explain: '`-` means "previous".' },
        { type: 'tf', q: 'You can build and run tests while in detached HEAD state.', answer: true, explain: 'Your working directory is a full copy of that commit.' },
        { type: 'mc', q: 'You have uncommitted edits to a file that differs in the commit you want to visit. What does git do?', choices: ['Silently overwrites your edits', 'Refuses and asks you to commit or stash first', 'Merges them', 'Deletes the commit'], answer: 1, explain: 'Git protects uncommitted work: "Your local changes would be overwritten by checkout."' },
      ],
    },
    {
      id: 'amend',
      title: 'Fixing the last commit',
      summary: 'git commit --amend: fix the message, add forgotten files, and why only before pushing.',
      minutes: 12,
      lab: {
        cwd: '~/shop',
        panels: ['graph', 'areas'],
        setup(H) {
          H.repo('~/shop');
          H.commit('Add product page', { 'product.html': '<h1>Product</h1>\n' });
          H.commit('Add cart icon', { 'cart.svg': '<svg></svg>\n' });
          H.commit('Add serach box', { 'search.js': 'export function search(q) { return []; }\n' }, { author: 'root <root@build-server>' });
          H.write('search.css', '.search { width: 100%; }\n');
        },
        suggestions: ['git log --oneline', 'git status'],
        tasks: [
          { title: 'Fix the typo in the last commit message (serach → search)', detail: 'Do not create a new commit: replace the last one.', hint: '`git commit --amend -m "…"`', solution: 'git commit --amend -m "Add search box"', check: t => t.count() === 3 && /search/i.test(t.head().message) && !/serach/i.test(t.head().message) },
          { title: 'Add the forgotten search.css to that same commit, keeping the message', hint: 'Stage it, then amend with `--no-edit`.', solution: 'git add search.css && git commit --amend --no-edit', check: t => t.count() === 3 && t.inHead('search.css') && !/serach/i.test(t.head().message) },
          { title: 'The commit says its author is root. Make yourself the author.', hint: '`git commit --amend --no-edit --author="Your Name <you@example.com>"`', solution: 'git commit --amend --no-edit --author="Dev Learner <dev@example.com>"', check: t => t.count() === 3 && t.head().author.name !== 'root' },
          { title: 'Look at the reflog to see the commits you replaced', solution: 'git reflog', check: t => t.ran(/^git reflog/), after: 'Each amend created a new commit; the old ones are still listed here.' },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What does `git commit --amend` actually do?', choices: ['Edits the last commit in place', 'Replaces the last commit with a new one (new id) built from the staging area', 'Adds a new commit on top', 'Deletes the last commit'], answer: 1, explain: 'Commits are immutable; amend makes a replacement and moves the branch to it.' },
        { type: 'type', q: 'You forgot to stage `logo.svg` in your last (unpushed) commit. It is now staged. Type the command that adds it to that commit without changing the message.', accept: ['git commit --amend --no-edit'], model: 'git commit --amend --no-edit', explain: '`--no-edit` keeps the existing message.' },
        { type: 'mc', q: 'When should you NOT amend?', choices: ['When the commit is only on your machine', 'When the commit has already been pushed to a shared branch', 'When the message has a typo', 'When you forgot a file'], answer: 1, explain: 'Others may have built on it; replacing it rewrites shared history.' },
        { type: 'tf', q: 'Amend can change a commit from three commits ago.', answer: false, explain: 'Only the last commit. Use interactive rebase for older ones.' },
        { type: 'predict', q: 'The last commit has id 3e1f0a2. You run this. What is the new HEAD id?', code: '$ git commit --amend -m "Better message"', choices: ['3e1f0a2', 'A different id', 'HEAD~1', 'It asks you to choose'], answer: 1, explain: 'The message is part of the hashed content, so the id changes.' },
      ],
    },
    {
      id: 'reset',
      title: 'Reset: soft, mixed, hard',
      summary: 'Move a branch back in time, and choose what happens to your staged and working changes.',
      minutes: 20,
      lab: {
        cwd: '~/cart',
        panels: ['graph', 'areas', 'files'],
        setup(H) {
          H.repo('~/cart');
          H.commit('Add cart', { 'cart.js': 'export const cart = [];\n' });
          H.commit('Add coupon field', { 'coupon.js': 'export const field = "code";\n' });
          H.commit('Add coupon validation', { 'coupon.js': 'export const field = "code";\nexport const valid = c => c.length === 8;\n' });
          H.commit('Add debug logging', { 'cart.js': 'export const cart = [];\nconsole.log("DEBUG", cart);\n' });
          H.commit('Add tax calculation', { 'tax.js': 'export const rate = 0.2;\n' });
        },
        suggestions: ['git log --oneline', 'git status'],
        tasks: [
          { title: 'Undo "Add tax calculation" but keep its change staged', hint: '`git reset --soft HEAD~1`', solution: 'git reset --soft HEAD~1', check: t => t.head().message === 'Add debug logging' && t.staged('tax.js') },
          { title: 'Now unstage it too (the file should become untracked)', hint: 'A mixed reset to HEAD resets the staging area only.', solution: 'git reset', check: t => t.head().message === 'Add debug logging' && !t.staged('tax.js') && t.status().untracked.includes('tax.js') },
          {
            title: 'Throw away the "Add debug logging" commit and its changes completely',
            hint: '`--hard` resets the staging area and the working directory as well.',
            solution: 'git reset --hard HEAD~1',
            check: t => t.head().message === 'Add coupon validation' && !/DEBUG/.test(t.file('~/cart/cart.js') || '') ,
            after: 'Notice tax.js survived: reset --hard never touches untracked files.',
          },
          { title: 'Commit tax.js again with a clear message', solution: 'git add tax.js && git commit -m "Add tax calculation"', check: t => t.inHead('tax.js') && t.head().parents[0] && t.world.commit(t.head().parents[0]).message === 'Add coupon validation' },
          { title: 'Make a quick experiment in cart.js, then discard every uncommitted change with one reset', solution: 'echo "experiment" >> cart.js && git reset --hard', check: t => t.ran(/^(.*&& )?git reset --hard\s*$/) && !t.status().unstaged.length },
        ],
      },
      quiz: [
        { type: 'mc', q: 'After `git reset --soft HEAD~1`, where are the changes from the undone commit?', choices: ['Gone', 'Staged', 'Unstaged in the working directory', 'In the stash'], answer: 1, explain: '--soft only moves the branch.' },
        { type: 'mc', q: 'What does plain `git reset HEAD~1` (no mode) do?', choices: ['Same as --hard', 'Moves the branch back and unstages the changes, keeping your files (--mixed)', 'Only unstages files', 'Deletes the last commit and its changes'], answer: 1, explain: '--mixed is the default.' },
        { type: 'mc', q: 'Which reset mode can destroy uncommitted work?', choices: ['--soft', '--mixed', '--hard', 'All of them'], answer: 2, explain: 'Only --hard overwrites the working directory.' },
        { type: 'tf', q: '`git reset --hard` deletes untracked files.', answer: false, explain: 'It resets tracked files. `git clean` removes untracked files.' },
        { type: 'type', q: 'Type the command that combines your last three (unpushed) commits into one by undoing them but keeping all their changes staged.', accept: ['git reset --soft HEAD~3', 'git reset --soft HEAD^^^'], model: 'git reset --soft HEAD~3', explain: 'Then one `git commit` records the combined change.' },
        { type: 'mc', q: 'Your local main is a mess and you want it identical to GitHub\'s main (after fetching). Which command?', choices: ['git revert origin/main', 'git reset --hard origin/main', 'git reset --soft main', 'git checkout origin/main'], answer: 1, explain: 'Moves main to origin/main and resets the files. Uncommitted work is lost.' },
        { type: 'mc', q: 'You reset too far by accident. What gets you back?', choices: ['Nothing, it is permanent', 'git reflog to find the old id, then git reset --hard <id>', 'git revert', 'git init'], answer: 1, explain: 'Committed work stays recoverable through the reflog.' },
      ],
    },
    {
      id: 'revert',
      title: 'Revert: the safe undo',
      summary: 'Undo a commit in shared history by adding its inverse instead of rewriting.',
      minutes: 14,
      lab: {
        cwd: '~/recipes',
        panels: ['graph', 'github', 'files'],
        setup(H) {
          H.remote('pinecone', 'recipes', [
            { message: 'Add recipe list', files: { 'recipes.js': 'export const recipes = ["soup", "pie"];\n' } },
            { message: 'Change servings formula', files: { 'servings.js': 'export const per = (total, people) => total / 0;\n' } },
            { message: 'Add favourites', files: { 'favourites.js': 'export const favs = new Set();\n' } },
            { message: 'Add search', files: { 'search.js': 'export const search = q => q;\n' } },
          ], { collaborators: ['you'] });
          H.cd('~');
          H.run('git clone -q https://github.com/pinecone/recipes.git');
          H.cd('~/recipes');
          const tip = H.shell.repo.refs['refs/heads/main'];
          const favourites = H.world.commit(tip).parents[0];
          H.world.labData = { bad: H.world.commit(favourites).parents[0] };
        },
        suggestions: ['git log --oneline', 'git log -S "/ 0" --oneline'],
        tasks: [
          { title: 'Find and show the commit that broke the servings formula', hint: 'It divides by zero. `git log -S "/ 0"` or read the log, then `git show <id>`.', solution: 'git show HEAD~2', check: t => t.history.some(l => { const m = l.match(/^git show\s+(\S+)/); return m && t.ref(m[1]) === t.world.labData.bad; }) },
          { title: 'Undo it with a new commit, without touching later work', hint: '`git revert <id>` (add `--no-edit` to accept the default message).', solution: 'git revert --no-edit HEAD~2', check: t => /^Revert "Change servings formula"/.test(t.head().message) && !/\/ 0/.test(t.file('~/recipes/servings.js') || '') && t.inHead('search.js') && t.inHead('favourites.js') },
          { title: 'Confirm history only moved forward', detail: 'origin/main must still be part of your history.', solution: 'git log --oneline', check: t => t.ran(/^git log/) && t.isAncestor(t.ref('origin/main'), t.headHash()) },
          { title: 'Share the fix with the team', hint: 'Revert keeps history compatible, so a normal push works.', solution: 'git push', check: t => t.remoteRef('pinecone/recipes', 'main') === t.headHash() },
        ],
      },
      quiz: [
        { type: 'mc', q: 'Why is revert safe on a shared branch while reset is not?', choices: ['Revert is faster', 'Revert adds a new commit instead of removing existing ones, so everyone\'s history still matches', 'Revert deletes the bad commit from GitHub', 'Reset does not work on shared branches'], answer: 1, explain: 'History only moves forward; teammates just pull the revert.' },
        { type: 'type', q: 'Type the command that undoes the commit `a1b2c3d` using the default message.', accept: ['git revert --no-edit a1b2c3d', 'git revert a1b2c3d --no-edit'], model: 'git revert --no-edit a1b2c3d', explain: 'Without --no-edit git opens the editor with "Revert …".' },
        { type: 'mc', q: 'You revert a commit from two weeks ago. What happens to the commits made after it?', choices: ['They are removed', 'They stay; only the old commit\'s changes are undone', 'They are reverted too', 'They become a branch'], answer: 1, explain: 'Revert targets one commit\'s changes.' },
        { type: 'tf', q: 'After a revert, the original bad commit no longer appears in `git log`.', answer: false, explain: 'Both the commit and its revert remain in history.' },
        { type: 'mc', q: 'A revert stops with a conflict. What do you do?', choices: ['Delete the repository', 'Resolve the conflict, git add the file, then git revert --continue', 'git push --force', 'git reset --hard origin/main'], answer: 1, explain: 'Same flow as a merge conflict, or `git revert --abort` to cancel.' },
        { type: 'mc', q: 'Which situation calls for `git revert` rather than `git reset`?', choices: ['Dropping a local experiment nobody has seen', 'Undoing a deployed commit on main that teammates have pulled', 'Unstaging a file', 'Fixing the last unpushed commit message'], answer: 1, explain: 'Shared history: revert.' },
      ],
    },
    {
      id: 'reflog',
      title: 'Reflog: the safety net',
      summary: 'Recover from hard resets, bad amends and deleted branches.',
      minutes: 14,
      lab: {
        cwd: '~/kitchen',
        panels: ['graph', 'files'],
        setup(H) {
          H.repo('~/kitchen');
          H.commit('Add pantry list', { 'pantry.txt': 'rice\nbeans\n' });
          H.commit('Add spice rack', { 'spices.txt': 'cumin\npaprika\n' });
          H.run('git switch -q -c ingredient-search');
          H.commit('Search by ingredient', { 'search.js': 'export const byIngredient = i => i;\n' });
          const searchTip = H.commit('Rank search results', { 'search.js': 'export const byIngredient = i => i;\nexport const rank = r => r;\n' });
          H.run('git switch -q main');
          H.commit('Add fridge inventory', { 'fridge.txt': 'milk\n' });
          const mainTip = H.commit('Add expiry dates', { 'fridge.txt': 'milk (May 3)\n' });
          H.run('git branch -D ingredient-search');
          H.run('git reset --hard HEAD~2');
          H.world.labData = { searchTip, mainTip };
        },
        suggestions: ['git reflog', 'git log --oneline --all'],
        tasks: [
          { title: 'Open the reflog', solution: 'git reflog', check: t => t.ran(/^git reflog/) },
          { title: 'Put main back where it was before the hard reset', hint: 'Find the line just before "reset: moving to HEAD~2" and reset to that id, or use `HEAD@{1}`.', solution: 'git reset --hard HEAD@{1}', check: t => t.headHash() === t.world.labData.mainTip && t.branch() === 'main' },
          { title: 'Recreate the deleted ingredient-search branch at its last commit', hint: 'Look for "Rank search results" in the reflog, then `git branch ingredient-search <id>`.', solution: 'git branch ingredient-search <id>', test: [t => `git branch ingredient-search ${t.world.labData.searchTip.slice(0, 7)}`], check: t => t.ref('ingredient-search') === t.world.labData.searchTip },
          { title: 'Show every branch in a graph to confirm nothing is lost', solution: 'git log --oneline --graph --all', check: t => t.ran(/^git log\b.*--all/) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What does the reflog record?', choices: ['Every commit on GitHub', 'Every position HEAD (and your branches) had on this machine', 'Uncommitted edits', 'Deleted files'], answer: 1, explain: 'It is a local diary of moves.' },
        { type: 'tf', q: 'The reflog can recover edits that were never committed.', answer: false, explain: 'It tracks commits only. Commit early to stay safe.' },
        { type: 'type', q: 'Type the command that undoes your most recent reset by jumping back to where HEAD was one move ago.', accept: ['git reset --hard HEAD@{1}', 'git reset --hard @{1}'], model: 'git reset --hard HEAD@{1}', explain: '`HEAD@{1}` is HEAD\'s previous position.' },
        { type: 'type', q: 'The reflog shows lost commit `5e8a1c3`. Type the command that creates a branch `rescued` pointing at it.', accept: ['git branch rescued 5e8a1c3', 'git switch -c rescued 5e8a1c3', 'git checkout -b rescued 5e8a1c3'], model: 'git branch rescued 5e8a1c3', explain: 'A branch makes the commit reachable again.' },
        { type: 'mc', q: 'Is your reflog pushed to GitHub?', choices: ['Yes, with every push', 'No, it exists only in your local repository', 'Only for main', 'Only with --force'], answer: 1, explain: 'Recover on the machine where the work happened.' },
        { type: 'mc', q: 'You deleted a branch with `git branch -D`. What was actually deleted?', choices: ['All its commits, immediately', 'Only the branch label; the commits stay until garbage collection', 'The whole repository', 'Nothing'], answer: 1, explain: 'That is why the reflog can bring it back.' },
      ],
    },
    {
      id: 'time-travel-boss',
      title: 'Boss: Bad Friday',
      summary: 'Combine revert, amend, reset and reflog to clean up a repository before the weekend.',
      minutes: 22,
      boss: true,
      lab: {
        cwd: '~/recipe-app',
        panels: ['graph', 'areas', 'files'],
        setup(H) {
          H.remote('pinecone', 'recipe-app', [
            { message: 'Add recipe list', files: { 'recipes.js': 'export const recipes = [];\n' } },
            { message: 'Add servings calculator', files: { 'servings.js': 'export const perPerson = (grams, people) => grams / 0;\n' } },
            { message: 'Add favourites', files: { 'favourites.js': 'export const favs = new Set();\n' } },
            { message: 'Add shopping list', files: { 'shopping.js': 'export const list = [];\n' } },
          ], { collaborators: ['you'] });
          H.cd('~');
          H.run('git clone -q https://github.com/pinecone/recipe-app.git');
          H.cd('~/recipe-app');
          H.run('git switch -q -c ingredient-search');
          const searchTip = H.commit('Search recipes by ingredient', { 'search.js': 'export const byIngredient = i => i;\n' });
          H.run('git switch -q main');
          H.run('git branch -D ingredient-search');
          H.commit('Add recipe raitngs', { 'ratings.js': 'export const stars = [1, 2, 3, 4, 5];\n' });
          H.commit('debug: print everything', { 'debug.js': 'console.log(globalThis);\n' });
          H.write('ratings.css', '.stars { color: gold; }\n');
          const repo = H.shell.repo;
          H.world.labData = { searchTip, origin: repo.refs['refs/remotes/origin/main'] };
        },
        tasks: [
          { title: 'Drop the unpushed debug commit completely', solution: 'git reset --hard HEAD~1', check: t => !t.firstParent().some(c => /^debug/i.test(c.message)) && !t.exists('~/recipe-app/debug.js') && t.isAncestor(t.world.labData.origin, t.headHash()) },
          { title: 'Fix the "raitngs" typo and include the forgotten ratings.css in that same commit', solution: 'git add ratings.css && git commit --amend -m "Add recipe ratings"', check: t => /ratings/.test(t.head().message) && !/raitngs/.test(t.head().message) && t.inHead('ratings.css') && t.head().parents[0] === t.world.labData.origin },
          { title: 'Undo the divide-by-zero servings bug without rewriting shared history', solution: 'git revert --no-edit HEAD~3', check: t => t.firstParent().some(c => /^Revert "Add servings calculator"/.test(c.message)) && !/\/ 0/.test(t.file('~/recipe-app/servings.js') || '') && t.isAncestor(t.world.labData.origin, t.headHash()) && t.inHead('ratings.css') },
          { title: 'Bring back the deleted ingredient-search branch', solution: 'git branch ingredient-search <id from reflog>', test: [t => `git branch ingredient-search ${t.world.labData.searchTip.slice(0, 7)}`], check: t => t.ref('ingredient-search') === t.world.labData.searchTip },
          { title: 'Leave a clean working tree and review all branches', solution: 'git status && git log --oneline --graph --all', check: t => t.clean() && t.ran(/git log\b.*--all/) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'A bug commit is on main, already pushed and pulled by teammates. Which undo?', choices: ['git reset --hard HEAD~1', 'git revert <commit>', 'git commit --amend', 'git branch -D main'], answer: 1, explain: 'Shared history: add an inverse commit.' },
        { type: 'mc', q: 'Your last commit is unpushed and has a typo. Which tool?', choices: ['git revert HEAD', 'git commit --amend', 'git reflog', 'git push --force'], answer: 1, explain: 'Private, last commit: amend.' },
        { type: 'order', q: 'Order these steps to recover a branch you deleted by mistake.', items: ['git reflog', 'Find the id of the branch\'s last commit', 'git branch <name> <id>', 'git log --oneline <name> to confirm'], explain: 'Find it, label it, check it.' },
        { type: 'multi', q: 'Which actions rewrite history (only safe for unpushed commits)?', choices: ['git commit --amend', 'git reset --hard HEAD~2', 'git revert HEAD', 'git rebase -i'], answer: [0, 1, 3], explain: 'Revert adds history; the others replace it.' },
        { type: 'predict', q: 'You run this on main with two unpushed commits on top of origin/main. What does `git status` say afterwards?', code: '$ git reset --hard origin/main', choices: ['Your branch is ahead of origin/main by 2 commits', 'Your branch is up to date with origin/main', 'HEAD detached', 'You have unmerged paths'], answer: 1, explain: 'main now points exactly at origin/main.' },
        { type: 'mc', q: 'Which of these is NOT recoverable with git?', choices: ['A commit lost after reset --hard', 'A branch deleted with -D', 'Edits never committed or staged, wiped by reset --hard', 'A commit replaced by amend'], answer: 2, explain: 'Git can only bring back what it once stored.' },
        { type: 'mc', q: 'What does `HEAD^2` refer to?', choices: ['The grandparent', 'The second parent of a merge commit', 'Two commits ahead', 'HEAD in the reflog two moves ago'], answer: 1, explain: '`~` walks generations; `^n` picks the nth parent.' },
        { type: 'mc', q: 'Which statement captures the realm\'s golden rule?', choices: ['Never undo anything', 'Rewrite only private history; once shared, add new commits instead', 'Always use reset --hard', 'Always force-push after undoing'], answer: 1, explain: 'Private: amend/reset. Shared: revert.' },
      ],
    },
  ],
};
