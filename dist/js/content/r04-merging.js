// Realm 4 · Merging: fast-forward, three-way merges, conflicts, resolution.

const noMarkers = (t, path) => !/^(<<<<<<<|=======|>>>>>>>)/m.test(t.file(path) || '');

export default {
  id: 'merging',
  n: 4,
  title: 'Merging',
  tagline: 'Bring lines of work together and settle conflicts calmly',
  badge: 'Peacemaker',
  intro: 'Branches are only useful if their work can come back together. Learn when git can simply **fast-forward**, how a **three-way merge** combines two histories, why **conflicts** happen, and a calm, repeatable way to **resolve** them.',
  lessons: [
    {
      id: 'fast-forward',
      title: 'Fast-forward merges',
      summary: 'When the receiving branch has not moved, merging just slides the label forward.',
      minutes: 12,
      lab: {
        cwd: '~/news',
        panels: ['graph'],
        setup(H) {
          H.repo('~/news');
          H.commit('Create site', { 'index.html': '<h1>Daily News</h1>\n' });
          const base = H.shell.repo.refs['refs/heads/main'];
          H.run('git switch -q -c feature/newsletter');
          H.commit('Add signup form', { 'signup.html': '<form></form>\n' });
          const newsTip = H.commit('Add thank-you page', { 'thanks.html': '<p>Thanks!</p>\n' });
          H.run('git switch -q -c feature/archive');
          const archiveTip = H.commit('Add archive page', { 'archive.html': '<ul></ul>\n' });
          H.run(`git switch -q -c feature/experiment ${base.slice(0, 7)}`);
          H.commit('Try a new font', { 'font.css': 'body { font-family: serif; }\n' });
          H.run('git switch -q main');
          H.world.labData = { newsTip, archiveTip };
        },
        suggestions: ['git log --oneline --graph --all'],
        tasks: [
          { title: 'Look at all branches as a graph', solution: 'git log --oneline --graph --all', check: t => t.ran(/^git log\b.*--graph/) },
          { title: 'Merge feature/newsletter into main', hint: 'You are already on main.', solution: 'git merge feature/newsletter', check: t => t.ref('main') === t.world.labData.newsTip, after: 'Fast-forward: main simply moved to the feature\'s tip. No merge commit.' },
          { title: 'Delete the merged feature/newsletter branch safely', solution: 'git branch -d feature/newsletter', check: t => !t.ref('feature/newsletter') },
          { title: 'Merge feature/archive but force a merge commit', detail: 'A fast-forward is possible here; make git record a merge commit anyway.', solution: 'git merge --no-ff --no-edit feature/archive', check: t => t.head().parents.length === 2 && t.head().parents[1] === t.world.labData.archiveTip },
          { title: 'Try to merge feature/experiment as fast-forward-only and watch git refuse', solution: 'git merge --ff-only feature/experiment', check: t => t.ran(/^git merge\b.*--ff-only.*feature\/experiment|^git merge feature\/experiment --ff-only/) && t.head().parents.length === 2 && t.head().parents[1] === t.world.labData.archiveTip },
        ],
      },
      quiz: [
        { type: 'mc', q: 'When is a fast-forward merge possible?', choices: ['Always', 'When the receiving branch has no commits that the other branch lacks', 'Only on main', 'When there are conflicts'], answer: 1, explain: 'The current tip must be an ancestor of the branch being merged.' },
        { type: 'mc', q: 'What does a fast-forward merge create?', choices: ['A merge commit', 'Nothing new: the branch label just moves forward', 'A copy of each commit', 'A tag'], answer: 1, explain: 'No new commits; history stays linear.' },
        { type: 'type', q: 'You are on main. Type the command that merges `feature/login` but always creates a merge commit.', accept: ['git merge --no-ff feature/login', 'git merge feature/login --no-ff', /^git merge --no-ff (--no-edit )?feature\/login$/], model: 'git merge --no-ff feature/login', explain: '`--no-ff` disables fast-forwarding.' },
        { type: 'mc', q: 'To bring `feature/x` into `main`, which branch must you be on?', choices: ['feature/x', 'main', 'Either', 'A new branch'], answer: 1, explain: 'Switch to the receiving branch, then merge the other one into it.' },
        { type: 'mc', q: 'What does `--ff-only` do if a fast-forward is impossible?', choices: ['Creates a merge commit', 'Refuses and changes nothing', 'Rebases automatically', 'Deletes the branch'], answer: 1, explain: 'It is a safety switch against surprise merge commits.' },
        { type: 'tf', q: 'After a fast-forward merge, `git branch -d feature` succeeds.', answer: true, explain: 'The feature\'s commits are all in main now.' },
      ],
    },
    {
      id: 'three-way',
      title: 'Three-way merges',
      summary: 'Base, ours and theirs: how git combines diverged branches into a merge commit.',
      minutes: 16,
      lab: {
        cwd: '~/shop',
        panels: ['graph', 'files'],
        setup(H) {
          H.repo('~/shop');
          H.commit('Create shop', { 'index.html': '<h1>Shop</h1>\n' });
          H.run('git switch -q -c feature/reviews');
          H.commit('Add review form', { 'reviews.js': 'export const reviews = [];\n' });
          const reviewsTip = H.commit('Add star ratings', { 'stars.js': 'export const max = 5;\n' });
          H.run('git switch -q main');
          H.commit('Add footer', { 'footer.html': '<footer></footer>\n' });
          H.commit('Fix header link', { 'index.html': '<h1><a href="/">Shop</a></h1>\n' });
          H.world.labData = { reviewsTip };
        },
        suggestions: ['git log --oneline --graph --all'],
        tasks: [
          { title: 'Merge feature/reviews into main with the default message', hint: '`--no-edit` accepts "Merge branch …" without opening the editor.', solution: 'git merge --no-edit feature/reviews', check: t => t.head().parents.length === 2 && t.head().parents[1] === t.world.labData.reviewsTip && t.inHead('stars.js') && t.inHead('footer.html') },
          { title: 'See the two lines join in the graph', solution: 'git log --oneline --graph', check: t => t.ran(/^git log\b.*--graph/) },
          { title: "Show the merge commit's second parent (the feature tip)", hint: '`HEAD^2` names the second parent.', solution: 'git show --oneline -s HEAD^2', check: t => t.ran(/HEAD\^2/) },
          { title: "List only main's own line of history", solution: 'git log --oneline --first-parent', check: t => t.ran(/^git log\b.*--first-parent/) },
          { title: 'Practise undoing a whole feature: revert the merge commit', hint: 'A merge has two parents, so tell revert which one is the mainline: `-m 1`.', solution: 'git revert -m 1 --no-edit HEAD', check: t => /^Revert "Merge/.test(t.head().message) && !t.inHead('stars.js') && t.inHead('footer.html') },
        ],
      },
      quiz: [
        { type: 'multi', q: 'Which three snapshots does a three-way merge compare?', choices: ['The common ancestor (base)', 'The tip of the current branch (ours)', 'The tip of the branch being merged (theirs)', 'The first commit in the repository'], answer: [0, 1, 2], explain: 'Base, ours and theirs.' },
        { type: 'mc', q: 'A merge commit has how many parents?', choices: ['Zero', 'One', 'Two (or more)', 'It depends on the number of files'], answer: 2, explain: 'First parent: the branch you were on. Second: the merged branch.' },
        { type: 'predict', q: 'Since the branches split, main changed footer.html and feature changed reviews.js. What does `git merge feature` do?', code: '$ git merge feature', choices: ['Conflict in both files', 'Creates a merge commit containing both changes', 'Fast-forwards', 'Refuses'], answer: 1, explain: 'Different files changed on each side merge cleanly.' },
        { type: 'mc', q: 'What does `git log --first-parent` show on main after several feature merges?', choices: ['Only the root commit', 'main\'s own line: one entry per merge plus direct commits', 'Only feature commits', 'Nothing'], answer: 1, explain: 'It follows only the first parent of each merge.' },
        { type: 'type', q: 'Type the command that undoes the merge commit at HEAD, keeping the first parent as the mainline, with the default message.', accept: ['git revert -m 1 --no-edit HEAD', 'git revert -m 1 HEAD --no-edit', 'git revert --no-edit -m 1 HEAD'], model: 'git revert -m 1 --no-edit HEAD', explain: '`-m 1` says which parent to keep.' },
        { type: 'tf', q: 'Merging copies the feature branch\'s commits and gives them new ids.', answer: false, explain: 'The original commits are kept as they are; the merge commit joins the histories. (Rebase is what creates new ids.)' },
      ],
    },
    {
      id: 'conflicts',
      title: 'Why conflicts happen',
      summary: 'What a conflict is, how to read the markers, and how to back out safely.',
      minutes: 14,
      lab: {
        cwd: '~/restaurant',
        panels: ['files', 'areas', 'graph'],
        setup(H) {
          H.repo('~/restaurant');
          H.commit('Add menu page', { 'menu.html': '<h1>Menu</h1>\n<p>Lunch: 12 dollars</p>\n<p>Dinner: 25 dollars</p>\n' });
          H.run('git switch -q -c promo-lunch');
          H.commit('Lunch promo price', { 'menu.html': '<h1>Menu</h1>\n<p>Lunch: 14 dollars</p>\n<p>Dinner: 25 dollars</p>\n' });
          H.run('git switch -q main');
          H.commit('Raise lunch price for ingredient costs', { 'menu.html': '<h1>Menu</h1>\n<p>Lunch: 16 dollars</p>\n<p>Dinner: 25 dollars</p>\n' });
          H.world.labData = { mainTip: H.shell.repo.refs['refs/heads/main'], seen: {} };
        },
        onCommand(line, res, t) {
          if (t.state() === 'merge') {
            const seen = t.world.labData.seen;
            if (/^git status/.test(line)) seen.status = true;
            if (/^cat\s+menu\.html/.test(line)) seen.cat = true;
            if (/^git diff$/.test(line)) seen.diff = true;
          }
        },
        suggestions: ['git merge promo-lunch'],
        tasks: [
          { title: 'Merge promo-lunch into main', solution: 'git merge promo-lunch', check: t => t.state() === 'merge' && t.hasConflicts() },
          { title: 'Ask git which files are conflicted', solution: 'git status', check: t => !!t.world.labData.seen.status },
          { title: 'Print menu.html and find the conflict markers', solution: 'cat menu.html', check: t => !!t.world.labData.seen.cat },
          { title: 'Show the conflict as a diff', solution: 'git diff', check: t => !!t.world.labData.seen.diff },
          { title: 'Back out of the merge completely', hint: 'Merges in progress can always be aborted.', solution: 'git merge --abort', check: t => !t.state() && t.headHash() === t.world.labData.mainTip && noMarkers(t, '~/restaurant/menu.html') },
        ],
      },
      quiz: [
        { type: 'mc', q: 'When does a merge conflict happen?', choices: ['Whenever two branches change the same file', 'When both sides changed the same lines differently (or one edited a file the other deleted)', 'Whenever a merge commit is needed', 'When branches have different names'], answer: 1, explain: 'Different parts of the same file merge automatically.' },
        { type: 'predict', q: 'You are on main and ran `git merge feature`. In the conflict below, which text came from main?', code: '<<<<<<< HEAD\ntimeout: 30\n=======\ntimeout: 60\n>>>>>>> feature', choices: ['timeout: 30', 'timeout: 60', 'Both', 'Neither'], answer: 0, explain: 'Between <<<<<<< HEAD and ======= is the current branch (main).' },
        { type: 'type', q: 'Type the command that cancels a merge in progress and returns to the state before it.', accept: ['git merge --abort'], model: 'git merge --abort', explain: 'Always safe during a merge.' },
        { type: 'tf', q: 'A merge conflict means the repository is corrupted.', answer: false, explain: 'It is git asking you to make a decision.' },
        { type: 'tf', q: 'If a merge completes without conflicts, the resulting code is guaranteed to work.', answer: false, explain: 'Git merges text, not meaning. Run the tests.' },
        { type: 'multi', q: 'Which habits reduce painful conflicts?', choices: ['Short-lived branches', 'Merging main into long-running branches regularly', 'Reformatting whole files in feature branches', 'Talking to teammates who work on the same area'], answer: [0, 1, 3], explain: 'Mass reformatting causes huge conflicts.' },
      ],
    },
    {
      id: 'resolving',
      title: 'Resolving conflicts like a pro',
      summary: 'Edit, choose a side, accept deletions, then add and commit to finish the merge.',
      minutes: 20,
      lab: {
        cwd: '~/restaurant',
        panels: ['files', 'areas', 'graph'],
        setup(H) {
          H.repo('~/restaurant');
          H.commit('Initial site', {
            'menu.html': '<h1>Menu</h1>\n<p>Soup of the day: tomato</p>\n<p>Dessert: cake</p>\n',
            'prices.json': '{ "soup": 5, "dessert": 6 }\n',
            'specials.html': '<p>Today: chef\'s choice</p>\n',
          });
          H.run('git switch -q -c spring-update');
          H.commit('Spring menu', { 'menu.html': '<h1>Menu</h1>\n<p>Soup of the day: asparagus</p>\n<p>Dessert: cake</p>\n', 'prices.json': '{ "soup": 6, "dessert": 6 }\n' }, { remove: ['specials.html'] });
          H.run('git switch -q main');
          H.commit('Weekend changes', { 'menu.html': '<h1>Menu</h1>\n<p>Soup of the day: pumpkin</p>\n<p>Dessert: cake</p>\n', 'prices.json': '{ "soup": 5.5, "dessert": 6 }\n', 'specials.html': '<p>Today: grilled fish</p>\n' });
        },
        suggestions: ['git merge spring-update', 'git status'],
        tasks: [
          { title: 'Merge spring-update into main', solution: 'git merge spring-update', check: t => t.state() === 'merge' && t.repo.conflicts.size === 3 },
          {
            title: 'Resolve menu.html by offering BOTH soups (pumpkin and asparagus), then mark it resolved',
            hint: '`edit menu.html`, write the final version without any marker lines, save, then `git add menu.html`.',
            solution: 'edit menu.html  (then)  git add menu.html',
            test: [{ cmd: 'edit menu.html', edit: '<h1>Menu</h1>\n<p>Soup of the day: pumpkin or asparagus</p>\n<p>Dessert: cake</p>\n' }, 'git add menu.html'],
            check: t => !t.repo.conflicts.has('menu.html') && /pumpkin/.test(t.file('~/restaurant/menu.html')) && /asparagus/.test(t.file('~/restaurant/menu.html')) && noMarkers(t, '~/restaurant/menu.html'),
          },
          { title: "Take the spring-update branch's prices.json as it is", hint: 'During a merge, `--theirs` means the branch being merged. Then stage it.', solution: 'git checkout --theirs prices.json && git add prices.json', check: t => !t.repo.conflicts.has('prices.json') && /"soup": 6\b/.test(t.file('~/restaurant/prices.json') || '') },
          { title: 'specials.html was deleted on spring-update. Accept the deletion.', hint: '`git rm` resolves a modify/delete conflict by deleting.', solution: 'git rm specials.html', check: t => !t.repo.conflicts.has('specials.html') && !t.exists('~/restaurant/specials.html') && !t.repo.index.has('specials.html') },
          { title: 'Finish the merge', solution: 'git commit --no-edit', check: t => !t.state() && t.head().parents.length === 2 },
          { title: 'Prove no conflict markers were committed', solution: 'git grep -n "<<<<<<<"', check: t => t.ran(/^git grep\b/) && ['menu.html', 'prices.json'].every(p => !/^(<<<<<<<|=======|>>>>>>>)/m.test(t.headFile(p) || '')) },
        ],
      },
      quiz: [
        { type: 'order', q: 'Order the steps to resolve a conflicted merge.', items: ['git status (find conflicted files)', 'Edit each file into its final form, removing markers', 'git add <file> for each resolved file', 'git commit (conclude the merge)'], explain: 'Find, fix, mark, conclude.' },
        { type: 'mc', q: 'During `git merge feature` on main, what does `git checkout --theirs file.txt` give you?', choices: ['main\'s version', 'feature\'s version', 'The common ancestor', 'An empty file'], answer: 1, explain: 'In a merge, "theirs" is the branch being merged in.' },
        { type: 'mc', q: 'What does `git add` mean for a conflicted file?', choices: ['Stage it for a later commit, unrelated to the conflict', 'Mark the conflict in that file as resolved, using the working-directory version', 'Undo the merge', 'Keep both versions'], answer: 1, explain: 'Git does not check for leftover markers, so look first.' },
        { type: 'type', q: 'Type a command that searches tracked files for leftover `<<<<<<<` markers, with line numbers.', accept: ['git grep -n "<<<<<<<"', 'git grep -n <<<<<<<', "git grep -n '<<<<<<<'", 'grep -rn "<<<<<<<" .'], model: 'git grep -n "<<<<<<<"', explain: 'Do this before concluding a merge.' },
        { type: 'mc', q: 'The other branch deleted a file you modified. What are your options?', choices: ['Keep it (git add) or accept the deletion (git rm)', 'Only git merge --abort', 'Only keep it', 'Git decides automatically'], answer: 0, explain: 'A modify/delete conflict needs a decision either way.' },
        { type: 'mc', q: 'You resolved all files. `git status` says "All conflicts fixed but you are still merging." What next?', choices: ['git merge --abort', 'git commit (or git merge --continue)', 'git push', 'git reset --hard'], answer: 1, explain: 'Commit to record the merge.' },
        { type: 'tf', q: 'The best resolution is always to pick one side completely.', answer: false, explain: 'Often the right answer combines both changes.' },
      ],
    },
    {
      id: 'merging-boss',
      title: 'Boss: Release-day merge train',
      summary: 'Merge three feature branches, resolving two conflicts, and leave main clean.',
      minutes: 25,
      boss: true,
      lab: {
        cwd: '~/brightside',
        panels: ['graph', 'files', 'areas'],
        setup(H) {
          H.repo('~/brightside');
          H.commit('Create fitness app', {
            'app.js': 'const config = {\n  theme: "light",\n  screens: ["home"],\n};\n',
            'settings.json': '{ "theme": "light", "units": "km" }\n',
          });
          H.run('git switch -q -c feature/streaks');
          const streaks = H.commit('Track workout streaks', { 'streaks.js': 'export const streak = days => days.length;\n' });
          H.run('git switch -q main');
          H.run('git switch -q -c feature/dark-theme');
          const dark = H.commit('Add dark theme', { 'app.js': 'const config = {\n  theme: "dark",\n  screens: ["home"],\n};\n', 'settings.json': '{ "theme": "dark", "units": "km" }\n' });
          H.run('git switch -q main');
          H.run('git switch -q -c feature/workout-timer');
          const timer = H.commit('Add workout timer screen', { 'app.js': 'const config = {\n  theme: "light",\n  screens: ["home", "timer"],\n};\n', 'timer.js': 'export const seconds = 60;\n' });
          H.run('git switch -q main');
          H.commit('Use miles for US users', { 'settings.json': '{ "theme": "light", "units": "miles" }\n' });
          H.world.labData = { streaks, dark, timer };
        },
        tasks: [
          { title: 'Merge feature/streaks into main', solution: 'git merge --no-edit feature/streaks', check: t => t.isAncestor(t.world.labData.streaks, t.ref('main')) && !t.state() },
          {
            title: 'Merge feature/dark-theme, keeping BOTH the dark theme and miles in settings.json',
            solution: 'git merge feature/dark-theme  →  edit settings.json  →  git add settings.json && git commit --no-edit',
            test: ['git merge feature/dark-theme', { cmd: 'edit settings.json', edit: '{ "theme": "dark", "units": "miles" }\n' }, 'git add settings.json && git commit --no-edit'],
            check: t => t.isAncestor(t.world.labData.dark, t.ref('main')) && !t.state() && /dark/.test(t.headFile('settings.json') || '') && /miles/.test(t.headFile('settings.json') || '') && !/^(<<<<<<<|=======|>>>>>>>)/m.test(t.headFile('settings.json') || ''),
          },
          {
            title: 'Merge feature/workout-timer, keeping the dark theme AND the timer screen in app.js',
            solution: 'git merge feature/workout-timer  →  edit app.js  →  git add app.js && git commit --no-edit',
            test: ['git merge feature/workout-timer', { cmd: 'edit app.js', edit: 'const config = {\n  theme: "dark",\n  screens: ["home", "timer"],\n};\n' }, 'git add app.js && git commit --no-edit'],
            check: t => t.isAncestor(t.world.labData.timer, t.ref('main')) && !t.state() && /dark/.test(t.headFile('app.js') || '') && /timer/.test(t.headFile('app.js') || '') && t.inHead('timer.js') && t.inHead('streaks.js') && !/^(<<<<<<<|=======|>>>>>>>)/m.test(t.headFile('app.js') || ''),
          },
          { title: 'Check for leftover conflict markers', solution: 'git grep -n "<<<<<<<"', check: t => t.ran(/^git grep\b/) || t.ran(/^grep\b/) },
          { title: 'Delete the three merged branches safely and leave a clean tree', solution: 'git branch -d feature/streaks feature/dark-theme feature/workout-timer', check: t => !t.ref('feature/streaks') && !t.ref('feature/dark-theme') && !t.ref('feature/workout-timer') && t.clean() },
        ],
      },
      quiz: [
        { type: 'mc', q: 'Two branches changed adjacent lines of the same function. What is likely?', choices: ['A clean merge', 'A conflict, because changes that touch or neighbour each other cannot be combined automatically', 'Git deletes one change', 'A fast-forward'], answer: 1, explain: 'Git needs at least one unchanged line between changes to merge them automatically.' },
        { type: 'mc', q: 'You merged branch A into main. Why might merging branch B now produce a conflict it would not have had before?', choices: ['Merges are random', 'main now contains A\'s changes, which may overlap with B\'s', 'Branch B was deleted', 'Git forgets the merge base'], answer: 1, explain: 'Each merge changes what the next merge compares against.' },
        { type: 'multi', q: 'Which are valid ways to resolve a conflicted file?', choices: ['Edit it into the combined version, then git add', 'git checkout --ours file, then git add', 'git checkout --theirs file, then git add', 'Delete the markers only, keeping both sides in random order'], answer: [0, 1, 2], explain: 'Any deliberate final version works. Keeping both sides blindly rarely does.' },
        { type: 'predict', q: 'What does the prompt show here?', code: '$ git merge feature\nCONFLICT (content): Merge conflict in app.js\nAutomatic merge failed; fix conflicts and then commit the result.', choices: ['(main)', '(main *|MERGING)', '(feature)', 'No branch'], answer: 1, explain: 'The repository is mid-merge until you commit or abort.' },
        { type: 'mc', q: 'After merging three features, what is the quickest check that each is fully in main?', choices: ['git branch --merged', 'git status', 'git stash list', 'git tag'], answer: 0, explain: 'All three should be listed as merged.' },
        { type: 'tf', q: 'You can abort a conflicted merge even after resolving some of the files.', answer: true, explain: '`git merge --abort` returns to the pre-merge state.' },
        { type: 'type', q: 'You are on main. Type the command that merges `feature/timer` using the default merge message, without opening an editor.', accept: ['git merge --no-edit feature/timer', 'git merge feature/timer --no-edit'], model: 'git merge --no-edit feature/timer', explain: '`--no-edit` accepts "Merge branch \'feature/timer\'".' },
      ],
    },
  ],
};
