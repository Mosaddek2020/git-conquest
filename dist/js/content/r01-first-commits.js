// Realm 1 · First Commits: init, the three areas, commits, diff/log/show, .gitignore, rm/mv/restore.

const BAD_MSG = /^(wip|update|updates|changes|stuff|fix|fixed stuff|misc|test|asdf|commit)\.?$/i;
const imperative = (m) => {
  const first = (m || '').split('\n')[0];
  return first.length >= 8 && first.length <= 72 && !BAD_MSG.test(first) && !/^\w+(ed|ing)\b/i.test(first) && /^[A-Z]/.test(first);
};

export default {
  id: 'first-commits',
  n: 1,
  title: 'First Commits',
  tagline: 'Repositories, the three areas, and recording history',
  badge: 'Keeper of Snapshots',
  intro: 'This is where you start using git for real. You create repositories, learn the **three areas** every file moves through, write commits with messages your team will thank you for, inspect any change, keep junk out with `.gitignore`, and handle deletes, renames and restores.',
  lessons: [
    {
      id: 'init',
      title: 'Creating a repository',
      summary: 'git init, the hidden .git folder, and what a repository really is.',
      minutes: 10,
      lab: {
        cwd: '~',
        panels: ['files', 'areas', 'graph'],
        suggestions: ['mkdir travel-blog', 'git status'],
        tasks: [
          { title: 'Make a folder called travel-blog', solution: 'mkdir travel-blog', check: t => t.world.isDir(t.shell.resolvePath('~/travel-blog')) },
          { title: 'Move into it', solution: 'cd travel-blog', check: t => t.inDir('~/travel-blog') },
          { title: 'Turn the folder into a git repository', hint: 'One git command creates the hidden database.', solution: 'git init', check: t => !!t.repoAt('~/travel-blog') },
          { title: 'Reveal the hidden .git folder', hint: 'Plain `ls` hides dot-folders.', solution: 'ls -a', check: t => t.ran(/^ls\s+-\w*a/) },
          { title: 'Read the file that says which branch you are on', detail: 'It lives at `.git/HEAD`.', hint: '`cat` prints a file.', solution: 'cat .git/HEAD', check: t => t.ran(/^cat\s+(\.\/)?\.git\/HEAD$/), after: 'HEAD says the current branch is main, even though main has no commits yet.' },
          { title: 'Ask git what it sees', hint: 'The most-used git command of all.', solution: 'git status', check: t => t.inDir('~/travel-blog') && t.ran(/^git status/), after: '"No commits yet": the repository exists but is empty.' },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What does `git init` do?', choices: ['Uploads the folder to GitHub', 'Creates a .git folder that turns the current folder into a repository', 'Commits every file in the folder', 'Installs git'], answer: 1, explain: 'It creates the empty database. Nothing is tracked or committed yet.' },
        { type: 'mc', q: 'You delete the `.git` folder of a project. What happens?', choices: ['Nothing: the history is on GitHub', 'The files stay, but the entire local history and branches are gone', 'All files are deleted', 'Git recreates it automatically'], answer: 1, explain: 'The history lives in `.git`. Without it the folder is an ordinary folder.' },
        { type: 'tf', q: 'Right after `git init` in a folder with ten files, those ten files are already tracked by git.', answer: false, explain: 'Files become tracked only when you `git add` them.' },
        { type: 'mc', q: 'Why does `ls` not show `.git`?', choices: ['It is a file, not a folder', 'Names starting with a dot are hidden; use ls -a', 'It only exists on GitHub', 'It is created after the first commit'], answer: 1, explain: 'Dot-files and dot-folders are hidden by convention.' },
        { type: 'predict', q: 'What does this print in a brand-new repository?', code: '$ cat .git/HEAD', choices: ['Nothing, the file is empty', 'ref: refs/heads/main', 'The id of the first commit', 'fatal: no commits'], answer: 1, explain: 'HEAD names the current branch, even before that branch has any commits.' },
        { type: 'mc', q: '`git status` says "fatal: not a git repository". What is the most likely cause?', choices: ['Git is not installed', 'You are in a folder that is not inside any repository', 'You have no internet connection', 'You have uncommitted changes'], answer: 1, explain: 'Check `pwd`: you are probably in the wrong folder.' },
        { type: 'mc', q: 'Where should you run `git init` for a new project?', choices: ['In your home folder, so everything is tracked', 'In the project\'s top-level folder', 'Inside the .git folder', 'In every subfolder'], answer: 1, explain: 'One repository per project, rooted at the project folder.' },
      ],
    },
    {
      id: 'three-areas',
      title: 'The three areas',
      summary: 'Working directory, staging area and repository: how git status and git add really work.',
      minutes: 18,
      lab: {
        cwd: '~/travel-blog',
        panels: ['areas', 'graph', 'files'],
        setup(H) {
          H.repo('~/travel-blog');
          H.write('README.md', '# Travel blog\n');
          H.write('lisbon.md', '# Lisbon\nTrams, tiles and pastel de nata.\n');
          H.write('porto.md', '# Porto\nBridges and the river Douro.\n');
          H.write('draft-ideas.md', 'maybe: Seville? Madrid?\n');
        },
        suggestions: ['git status', 'git status -s'],
        tasks: [
          { title: 'See the state of the repository', solution: 'git status', check: t => t.ran(/^git status/) },
          { title: 'Stage only README.md', detail: 'Leave the other files untracked for now.', hint: '`git add` followed by one file name.', solution: 'git add README.md', check: t => t.repo.index.has('README.md') && t.repo.index.size === 1 },
          { title: 'Commit it', hint: '`git commit -m "…"` with a short description.', solution: 'git commit -m "Add README"', check: t => t.count() === 1 && t.inHead('README.md') && !t.inHead('lisbon.md') },
          { title: 'Stage lisbon.md and porto.md, but not draft-ideas.md', hint: 'git add accepts several file names.', solution: 'git add lisbon.md porto.md', check: t => t.repo.index.has('lisbon.md') && t.repo.index.has('porto.md') && !t.repo.index.has('draft-ideas.md') },
          { title: 'Commit the two city posts', solution: 'git commit -m "Add Lisbon and Porto posts"', check: t => t.count() === 2 && t.inHead('porto.md') && !t.inHead('draft-ideas.md') },
          {
            title: 'Make README.md show up as both staged and modified',
            detail: 'Append a line to README.md and stage it, then append another line without staging.',
            hint: 'Append with `echo "…" >> README.md`, stage it, then append again. `git status -s` will show `MM`.',
            solution: 'echo "Day 1: Lisbon" >> README.md && git add README.md && echo "Day 2: Porto" >> README.md',
            check: t => { const s = t.status(); return s.staged.some(x => x.path === 'README.md') && s.unstaged.some(x => x.path === 'README.md'); },
            after: 'The staging area holds the first edit; the working directory has both. They are different versions of the same file.',
          },
          { title: 'Commit only what is staged', detail: 'Do not stage the second edit yet.', hint: 'A plain commit only takes the staging area.', solution: 'git commit -m "Add day 1 to README"', check: t => t.count() === 3 && t.status().unstaged.some(x => x.path === 'README.md') && /Day 1/.test(t.headFile('README.md')) && !/Day 2/.test(t.headFile('README.md')) },
          { title: 'Stage and commit the remaining README change', solution: 'git add README.md && git commit -m "Add day 2 to README"', check: t => t.count() === 4 && /Day 2/.test(t.headFile('README.md') || '') && !t.status().unstaged.length },
        ],
      },
      quiz: [
        { type: 'order', q: 'Order the journey of a brand-new file into history.', items: ['Untracked (in the working directory)', 'Staged (git add)', 'Committed (git commit)'], explain: 'New files start untracked, are staged with git add, and recorded with git commit.' },
        { type: 'mc', q: 'What is the staging area (index)?', choices: ['A backup of the last commit', 'The draft of your next commit', 'A copy of GitHub', 'A list of ignored files'], answer: 1, explain: 'It holds exactly what the next commit will contain.' },
        { type: 'predict', q: 'You run these commands. What will the next `git commit` contain?', code: '$ echo "v1" > notes.txt\n$ git add notes.txt\n$ echo "v2" > notes.txt\n$ git commit -m "Add notes"', choices: ['notes.txt containing v1', 'notes.txt containing v2', 'Both versions', 'Nothing'], answer: 0, explain: 'git add copied the content at that moment (v1). The later edit is unstaged.' },
        { type: 'mc', q: 'In `git status -s`, what does `?? notes.txt` mean?', choices: ['notes.txt has a conflict', 'notes.txt is untracked', 'notes.txt is staged', 'notes.txt was deleted'], answer: 1, explain: '`??` marks untracked files.' },
        { type: 'mc', q: 'In `git status -s`, what does `MM style.css` mean?', choices: ['Modified twice in two commits', 'Staged changes, plus newer unstaged changes', 'Merged twice', 'Moved and modified'], answer: 1, explain: 'Left column: staged vs last commit. Right column: working directory vs staging area.' },
        { type: 'type', q: 'Type the command that stages every change in the current folder and below.', accept: ['git add .', 'git add -A', 'git add --all'], model: 'git add .', explain: '`git add .` (or `-A` for the whole repository).' },
        { type: 'tf', q: 'Git tracks empty folders.', answer: false, explain: 'Git tracks files. Put a placeholder like `.gitkeep` in a folder that must exist.' },
        { type: 'mc', q: 'Sam fixed a bug in login.js and half-finished a redesign in footer.css. How does he commit only the bug fix?', choices: ['git commit -am "Fix login"', 'git add login.js, then git commit', 'git add ., then git commit', 'He cannot; git commits every file'], answer: 1, explain: 'Stage only what belongs in the commit. `-am` and `add .` would include the footer.' },
      ],
    },
    {
      id: 'commits',
      title: 'Making commits',
      summary: 'git commit, what a commit contains, and messages your team will thank you for.',
      minutes: 16,
      lab: {
        cwd: '~/travel-blog',
        panels: ['graph', 'areas'],
        setup(H) {
          H.repo('~/travel-blog');
          H.commit('Start the travel blog', { 'README.md': '# Travel blog\n', 'packing.md': '# Packing list\n- passport\n' });
        },
        suggestions: ['git log --oneline'],
        tasks: [
          {
            title: 'Create japan.md and commit it with a clear, imperative message',
            detail: 'For example "Add Japan trip page". The lab rejects vague messages like "update" and past tense like "Added…".',
            hint: 'Create the file with `echo`, stage it, then `git commit -m "Add …"`.',
            solution: 'echo "# Japan" > japan.md && git add japan.md && git commit -m "Add Japan trip page"',
            check: t => t.inHead('japan.md') && imperative(t.head().message),
          },
          {
            title: 'Add two items to packing.md and commit with a title AND a body',
            detail: 'Use two `-m` options: the first becomes the title, the second the body.',
            hint: '`git commit -m "Title" -m "Why this change was needed"`',
            solution: 'echo "- rail pass" >> packing.md && echo "- adapter plug" >> packing.md && git add packing.md && git commit -m "Pack for the Japan trip" -m "Rail passes must be bought before arrival."',
            check: t => /rail|adapter|-/.test(t.headFile('packing.md') || '') && (t.headFile('packing.md') || '').split('\n').filter(l => l.startsWith('-')).length >= 3 && t.head().message.includes('\n\n'),
          },
          {
            title: 'Edit README.md and commit it using -a (no separate git add)',
            hint: '`git commit -am "…"` stages tracked files for you.',
            solution: 'echo "Next stop: Kyoto" >> README.md && git commit -am "Mention Kyoto in README"',
            check: t => t.ran(/^(.*&& )?git commit\s+(-am|-a -m|-a\s+-m|--all -m)/) && /Kyoto|Next|stop/i.test(t.headFile('README.md') || '') && (t.headFile('README.md') || '') !== '# Travel blog\n',
          },
          {
            title: 'Write a commit message in the editor',
            detail: 'Change any file, stage it, then run `git commit` with no `-m`. Write the message in the editor panel and save.',
            hint: 'Type the message on the first line. Lines starting with # are ignored. Save with the button or Ctrl+S.',
            solution: 'echo "- sunscreen" >> packing.md && git add packing.md && git commit',
            test: [{ cmd: 'echo "- sunscreen" >> packing.md && git add packing.md && git commit', edit: 'Pack sunscreen for July\n' }],
            check: t => t.count() >= 5 && t.ran(/(^|&& )git commit\s*$/),
          },
          { title: 'Review your commits in one-line form', solution: 'git log --oneline', check: t => t.ran(/^git log\b.*--oneline/) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'Which commit message follows the common convention best?', choices: ['fixed the bug', 'Fix crash when the cart is empty', 'changes', 'Fixes, updates and more'], answer: 1, explain: 'Imperative, specific, short: "If applied, this commit will fix crash when the cart is empty."' },
        { type: 'mc', q: 'What is a commit\'s **parent**?', choices: ['The person who approved it', 'The commit that came directly before it', 'The branch it belongs to', 'The first commit in the repository'], answer: 1, explain: 'Each commit stores the id of its parent, forming a chain.' },
        { type: 'tf', q: '`git commit -am "msg"` also commits brand-new files you have never added.', answer: false, explain: '`-a` only stages files git already tracks.' },
        { type: 'mc', q: 'You change one character of an old commit\'s message (for example with rebase). What happens to its id?', choices: ['It stays the same', 'It changes, because the id is a hash of the commit\'s contents including the message', 'Only the short id changes', 'Git refuses'], answer: 1, explain: 'Commits are immutable. "Editing" creates a new commit with a new id.' },
        { type: 'type', q: 'Type a commit command with the title `Add search box` and the body `Requested by the support team.`', accept: [/^git commit -m "Add search box" -m "Requested by the support team\.?"$/], model: 'git commit -m "Add search box" -m "Requested by the support team."', explain: 'Two `-m` options: the first is the title, the second the body.' },
        { type: 'mc', q: 'You ran `git commit` without `-m` and a Vim editor opened. How do you save and quit?', choices: ['Ctrl+C', 'Press Esc, type :wq, press Enter', 'Close the terminal', 'Type exit'], answer: 1, explain: 'In Vim: Esc to leave insert mode, :wq to write and quit. Or set core.editor to an editor you know.' },
        { type: 'multi', q: 'What does a commit contain?', choices: ['A pointer to a full snapshot (tree) of the staged files', 'Author and committer with timestamps', 'The message', 'The id of its parent commit(s)', 'The time the author spent coding'], answer: [0, 1, 2, 3], explain: 'Everything except time spent.' },
        { type: 'mc', q: 'Your message needs the word "and": "Fix login timeout and redesign footer". What does that suggest?', choices: ['The message is too short', 'It should probably be two separate commits', 'It needs a body', 'Nothing, this is ideal'], answer: 1, explain: 'One logical change per commit makes review and undo easier.' },
      ],
    },
    {
      id: 'diff-log',
      title: 'Seeing changes',
      summary: 'git diff, git diff --staged, git log and git show: answer "what changed?" at any time.',
      minutes: 18,
      lab: {
        cwd: '~/menu',
        panels: ['graph', 'areas', 'files'],
        setup(H) {
          H.repo('~/menu');
          H.world.labData = {};
          H.world.labData.first = H.commit('Create the menu', { 'menu.txt': 'Soup: tomato\nMain: pasta\nDessert: cake\n' }, { author: 'Ana Costa <ana@trattoria.example>', hours: 1 });
          H.commit('Add drinks list', { 'drinks.txt': 'Water\nCoffee\n' }, { author: 'Tomás Ruiz <tomas@trattoria.example>', hours: 24 });
          H.world.labData.soup = H.commit('Switch soup to pumpkin for autumn', { 'menu.txt': 'Soup: pumpkin\nMain: pasta\nDessert: cake\n' }, { author: 'Ana Costa <ana@trattoria.example>', hours: 48 });
          H.commit('Add tea to drinks', { 'drinks.txt': 'Water\nCoffee\nTea\n' }, { author: 'Tomás Ruiz <tomas@trattoria.example>', hours: 30 });
          H.write('drinks.txt', 'Water\nCoffee\nTea\nLemonade\n');
          H.run('git add drinks.txt');
          H.write('menu.txt', 'Soup: pumpkin\nMain: risotto\nDessert: cake\n');
        },
        suggestions: ['git status', 'git diff'],
        tasks: [
          { title: 'See the change that is NOT staged yet', solution: 'git diff', check: t => t.ran(/^git diff$/) },
          { title: 'See the change that IS staged', solution: 'git diff --staged', check: t => t.ran(/^git diff\s+--(staged|cached)$/) },
          { title: 'List only the commits written by Tomás', hint: '`git log` can filter by author.', solution: 'git log --author="Tomás"', check: t => t.ran(/^git log\b.*--author/) },
          {
            title: 'Show the commit that switched the soup to pumpkin',
            hint: 'Find its id with `git log --oneline`, then `git show <id>`. A relative name like HEAD~1 works too.',
            solution: 'git show HEAD~1',
            check: t => t.history.some(l => { const m = l.match(/^git show\s+(\S+)$/); return m && t.ref(m[1]) === t.world.labData.soup; }),
          },
          {
            title: 'Print menu.txt exactly as it was in the very first commit',
            hint: '`git show <commit>:<file>` prints a file from any commit. The first commit is the oldest in `git log`.',
            solution: 'git show HEAD~3:menu.txt',
            check: t => t.history.some(l => { const m = l.match(/^git show\s+([^:\s]+):(\.\/)?menu\.txt$/); return m && t.ref(m[1]) === t.world.labData.first; }),
          },
          {
            title: 'Commit only the staged drinks change',
            detail: 'The risotto edit must stay uncommitted for now.',
            hint: 'A plain `git commit -m` commits only the staging area.',
            solution: 'git commit -m "Add lemonade to drinks"',
            check: t => /Lemonade/.test(t.headFile('drinks.txt') || '') && /pasta/.test(t.headFile('menu.txt') || '') && /risotto/.test(t.file('~/menu/menu.txt') || ''),
          },
          { title: 'Check what you are about to commit, then commit the risotto change', hint: 'Stage it, run `git diff --staged` to double-check, then commit.', solution: 'git add menu.txt && git diff --staged && git commit -m "Replace pasta with risotto"', check: t => /risotto/.test(t.headFile('menu.txt') || '') && t.ran(/git diff\s+--(staged|cached)/) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'You staged all your changes. What does plain `git diff` show now?', choices: ['All the staged changes', 'Nothing, because it compares the working directory to the staging area', 'The last commit', 'An error'], answer: 1, explain: 'Use `git diff --staged` to see staged changes.' },
        { type: 'mc', q: 'Which command shows what your next commit will contain?', choices: ['git diff', 'git diff --staged', 'git log -p', 'git show'], answer: 1, explain: '`--staged` (or `--cached`) compares the last commit with the staging area.' },
        { type: 'predict', q: 'What does this diff tell you?', code: '@@ -2 +2 @@\n-Main: pasta\n+Main: risotto', choices: ['A line was added at the end', 'Line 2 changed from pasta to risotto', 'The file was renamed', 'Two lines were deleted'], answer: 1, explain: 'A changed line appears as one removal (-) and one addition (+).' },
        { type: 'type', q: 'Type the command that prints `config.yml` exactly as it was two commits before HEAD.', accept: ['git show HEAD~2:config.yml', 'git show HEAD^^:config.yml', 'git show @~2:config.yml'], model: 'git show HEAD~2:config.yml', explain: '`<commit>:<path>` names a file inside a commit.' },
        { type: 'mc', q: 'What does `HEAD~1` refer to?', choices: ['The next commit', 'The parent of the current commit', 'The first commit', 'The branch named HEAD'], answer: 1, explain: '`~1` goes back one generation; `~2` two.' },
        { type: 'mc', q: 'You created `notes.txt` but have not added it. Does `git diff` show it?', choices: ['Yes, as all added lines', 'No, untracked files are not compared', 'Only with --staged', 'Only after a commit'], answer: 1, explain: 'Untracked files are invisible to diff until staged.' },
        { type: 'multi', q: 'Which commands help you find out who changed something and why?', choices: ['git log --author="Ana"', 'git log --grep="timeout"', 'git show <commit>', 'git init'], answer: [0, 1, 2], explain: 'Filter the log by person or message, then show the commit.' },
        { type: 'type', q: 'Type the command that shows every branch\'s history as a compact graph.', accept: ['git log --oneline --graph --all', /^git log( --(oneline|graph|all)){3}$/], model: 'git log --oneline --graph --all', explain: 'The three options in any order.' },
      ],
    },
    {
      id: 'gitignore',
      title: 'Ignoring files',
      summary: 'Keep dependencies, build output, logs and secrets out of your repository with .gitignore.',
      minutes: 15,
      lab: {
        cwd: '~/webshop',
        panels: ['areas', 'files', 'graph'],
        setup(H) {
          H.repo('~/webshop');
          H.commit('Create the web shop', { 'index.js': 'require("./src/server");\n', 'package.json': '{ "name": "webshop", "dependencies": { "express": "^4" } }\n', 'src/server.js': 'console.log("listening");\n', 'debug.log': 'started\n' });
          H.write('node_modules/express/index.js', 'module.exports = {};\n');
          H.write('node_modules/express/package.json', '{}\n');
          H.write('dist/bundle.js', '/* built */\n');
          H.write('.env', 'DB_PASSWORD=hunter2\n');
          H.write('.vscode/settings.json', '{ "editor.tabSize": 2 }\n');
          H.write('error.log', 'oops\n');
          H.write('src/cart.js', 'export const cart = [];\n');
        },
        suggestions: ['git status', 'edit .gitignore'],
        tasks: [
          { title: 'Look at the mess git sees', solution: 'git status', check: t => t.ran(/^git status/) },
          {
            title: 'Write a .gitignore that hides dependencies, build output, logs, secrets and the editor folder',
            detail: 'After this, `git status` should list only `.gitignore` and `src/cart.js` as untracked.',
            hint: 'Patterns: `node_modules/`, `dist/`, `*.log`, `.env`, `.vscode/`. Open the editor with `edit .gitignore`.',
            solution: 'printf "node_modules/\\ndist/\\n*.log\\n.env\\n.vscode/\\n" > .gitignore',
            check: t => { const s = t.status(); const u = new Set(s.untracked); return u.has('.gitignore') && u.has('src/cart.js') && u.size === 2 && s.ignored.includes('.env') && s.ignored.includes('error.log'); },
          },
          {
            title: 'Stop tracking debug.log, but keep the file on disk',
            detail: 'It was committed by mistake. Your new pattern does not affect files that are already tracked.',
            hint: '`git rm --cached <file>`',
            solution: 'git rm --cached debug.log',
            check: t => !t.tracked('debug.log') && t.exists('~/webshop/debug.log'),
          },
          { title: 'Commit .gitignore, the debug.log removal and src/cart.js', solution: 'git add .gitignore src/cart.js && git commit -m "Ignore generated files and add the cart module"', check: t => t.inHead('.gitignore') && t.inHead('src/cart.js') && !t.inHead('debug.log') && t.clean() },
          { title: 'Confirm what is being ignored', solution: 'git status --ignored', check: t => t.ran(/^git status\b.*--ignored/) },
        ],
      },
      quiz: [
        { type: 'multi', q: 'Which of these normally belong in `.gitignore`?', choices: ['node_modules/', '.env (with real passwords)', 'package.json', 'dist/ (build output)', 'README.md'], answer: [0, 1, 3], explain: 'Ignore what is generated, installed or secret. Commit the dependency list and docs.' },
        { type: 'mc', q: '`config.json` is already committed. You add `config.json` to `.gitignore`. What happens?', choices: ['Git deletes it from history', 'Nothing changes: it is still tracked until you git rm --cached it', 'Git stops tracking it immediately', 'The file is deleted from disk'], answer: 1, explain: '.gitignore only affects untracked files.' },
        { type: 'mc', q: 'What does the pattern `*.log` match?', choices: ['Only files in the root folder ending in .log', 'Files ending in .log in any folder', 'A folder named log', 'The file *.log literally'], answer: 1, explain: 'Without a slash, a pattern matches at any depth.' },
        { type: 'mc', q: 'What does a leading slash do, as in `/build`?', choices: ['Matches build anywhere', 'Anchors the pattern to the repository root', 'Negates the pattern', 'Matches only folders'], answer: 1, explain: '`/build` matches only the top-level build.' },
        { type: 'type', q: 'Type the command that stops tracking `.env` while keeping the file on your disk.', accept: ['git rm --cached .env'], model: 'git rm --cached .env', explain: 'Without `--cached`, git rm would also delete your local file.' },
        { type: 'tf', q: 'If you commit a password and then delete it in the next commit, the password is safe.', answer: false, explain: 'It remains in history. Change the password immediately.' },
        { type: 'mc', q: 'Why should you commit the `.gitignore` file itself?', choices: ['Git requires it', 'So the whole team shares the same rules', 'It speeds up git', 'You should not commit it'], answer: 1, explain: 'It is part of the project configuration.' },
      ],
    },
    {
      id: 'rm-mv-restore',
      title: 'Remove, rename, restore',
      summary: 'git rm, git mv and git restore: deletes, renames and undoing edits safely.',
      minutes: 15,
      lab: {
        cwd: '~/travel-blog',
        panels: ['areas', 'graph', 'files'],
        setup(H) {
          H.repo('~/travel-blog');
          H.commit('Start the blog', { 'README.md': '# Travel blog\n', 'style.css': 'body { font-family: Georgia; }\n' });
          H.commit('Add plans and a draft', { 'old-plans.md': '# 2019 plans\nVisit Rome.\n', 'draft.md': '# Lisbon trip\nDraft notes.\n' });
        },
        suggestions: ['git status'],
        tasks: [
          { title: 'Delete old-plans.md so that the deletion is already staged', hint: 'Use git\'s own delete command.', solution: 'git rm old-plans.md', check: t => t.status().staged.some(s => s.path === 'old-plans.md' && s.kind === 'deleted') },
          { title: 'Rename draft.md to lisbon-trip.md with git', solution: 'git mv draft.md lisbon-trip.md', check: t => t.status().staged.some(s => s.kind === 'renamed' && s.path === 'lisbon-trip.md') },
          { title: 'Commit the clean-up', solution: 'git commit -m "Remove old plans and rename the Lisbon draft"', check: t => t.inHead('lisbon-trip.md') && !t.inHead('draft.md') && !t.inHead('old-plans.md') },
          {
            title: 'Break style.css on purpose, then restore it',
            detail: 'Run `echo "oops" > style.css`, look at `git diff`, then bring the committed version back.',
            hint: '`git restore <file>` copies the version from the staging area over your edit.',
            solution: 'echo "oops" > style.css && git restore style.css',
            check: t => t.ran(/>\s*style\.css/) && t.file('~/travel-blog/style.css') === t.headFile('style.css'),
          },
          {
            title: 'Stage an edit to README.md, then unstage it (keep the edit)',
            hint: 'Edit, `git add`, then `git restore --staged README.md`.',
            solution: 'echo "Now with more trips" >> README.md && git add README.md && git restore --staged README.md',
            check: t => { const s = t.status(); return t.ran(/restore\s+--staged/) && s.unstaged.some(x => x.path === 'README.md') && !s.staged.some(x => x.path === 'README.md'); },
          },
          {
            title: 'Bring back old-plans.md from the commit before you deleted it',
            hint: '`git restore --source=<commit> <file>`. The deletion happened in HEAD, so the commit before is HEAD~1.',
            solution: 'git restore --source=HEAD~1 old-plans.md',
            check: t => /Visit Rome/.test(t.file('~/travel-blog/old-plans.md') || ''),
          },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What is the difference between `rm notes.txt` and `git rm notes.txt`?', choices: ['None', 'git rm also stages the deletion', 'rm also stages the deletion', 'git rm keeps the file on disk'], answer: 1, explain: 'Plain rm only deletes; you still need to stage the deletion.' },
        { type: 'type', q: 'Type the command that throws away your unstaged edits to `app.js`.', accept: ['git restore app.js', 'git checkout -- app.js', 'git checkout app.js'], model: 'git restore app.js', explain: 'git restore copies the staged version back over your edit. The edit is gone for good.' },
        { type: 'type', q: 'Type the command that takes `app.js` out of the staging area but keeps your edit.', accept: ['git restore --staged app.js', 'git reset app.js', 'git reset HEAD app.js', 'git reset -- app.js'], model: 'git restore --staged app.js', explain: 'Unstaging never touches the working file.' },
        { type: 'mc', q: 'You renamed a file with plain `mv`. What does `git status` show before you stage anything?', choices: ['renamed: old -> new', 'The old file deleted and the new file untracked', 'Nothing', 'A conflict'], answer: 1, explain: 'Once you stage both sides, git detects the rename from the identical content.' },
        { type: 'tf', q: '`git restore <file>` can be undone if you change your mind.', answer: false, explain: 'Discarded uncommitted edits are gone. Stash or copy first if unsure.' },
        { type: 'mc', q: 'A file was deleted three commits ago. How do you get it back?', choices: ['It is lost forever', 'git restore --source=<a commit that still had it> <file>', 'git init', 'git pull'], answer: 1, explain: 'Any commit that contained the file can provide it.' },
        { type: 'mc', q: 'Which command stops tracking a file without deleting it from your disk?', choices: ['git rm <file>', 'git rm --cached <file>', 'git restore <file>', 'git mv <file>'], answer: 1, explain: '`--cached` acts only on the staging area.' },
      ],
    },
    {
      id: 'first-commits-boss',
      title: 'Boss: Ship version one',
      summary: 'Put a messy project under git properly and ship clean, focused commits.',
      minutes: 20,
      boss: true,
      lab: {
        cwd: '~/club-site',
        panels: ['areas', 'graph', 'files'],
        setup(H) {
          const files = {
            'index.html': '<h1>Riverside FC</h1>\n<p>Welcome to the club.</p>\n',
            'fixtures.html': '<h2>Fixtures</h2>\n',
            'css/style.css': 'h1 { color: #0a5; }\n',
            'js/app.js': 'document.title = "Riverside FC";\n',
            'README.md': '# Riverside FC website\n',
            'node_modules/leaflet/leaflet.js': '/* map library */\n',
            'server.log': 'GET / 200\n',
            '.env': 'ADMIN_PASSWORD=goal2026\n',
            '.DS_Store': 'binary junk\n',
          };
          for (const [p, c] of Object.entries(files)) H.write('~/club-site/' + p, c);
          H.cd('~/club-site');
        },
        tasks: [
          { title: 'Turn ~/club-site into a git repository', solution: 'git init', check: t => !!t.repoAt('~/club-site') },
          {
            title: 'Create a .gitignore for the library folder, logs, the secrets file and macOS junk',
            detail: 'Afterwards the only untracked entries should be your source files and .gitignore.',
            solution: 'printf "node_modules/\\n*.log\\n.env\\n.DS_Store\\n" > .gitignore',
            check: t => { const s = t.status(); return ['.env', 'server.log', '.DS_Store', 'node_modules/leaflet/leaflet.js'].every(p => s.ignored.includes(p)) && s.untracked.includes('index.html') && s.untracked.includes('css/style.css'); },
          },
          { title: 'Make the first commit contain only .gitignore', solution: 'git add .gitignore && git commit -m "Ignore dependencies, logs and secrets"', check: t => { const c = t.commits(); if (!c.length) return false; const root = c[c.length - 1]; return [...t.world.readTreeFlat(root.tree).keys()].join() === '.gitignore'; } },
          {
            title: 'Commit the website source in a second commit',
            detail: 'index.html, fixtures.html, css/, js/ and README.md. None of the junk.',
            solution: 'git add . && git commit -m "Add the first version of the club website"',
            check: t => ['index.html', 'fixtures.html', 'css/style.css', 'js/app.js', 'README.md'].every(p => t.inHead(p)) && t.commits().every(c => [...t.world.readTreeFlat(c.tree).keys()].every(p => !/node_modules|\.env$|\.log$|DS_Store/.test(p))),
          },
          {
            title: 'The coach asks: add "Next match: Saturday 3pm" to fixtures.html, and commit it',
            hint: 'Append a line, then commit with a specific, imperative message.',
            solution: 'echo "<p>Next match: Saturday 3pm</p>" >> fixtures.html && git commit -am "Announce Saturday\'s match on the fixtures page"',
            check: t => /Saturday/.test(t.headFile('fixtures.html') || '') && imperative(t.head().message),
          },
          { title: 'Rename fixtures.html to matches.html with git, and commit', solution: 'git mv fixtures.html matches.html && git commit -m "Rename fixtures page to matches"', check: t => t.inHead('matches.html') && !t.inHead('fixtures.html') && /Saturday/.test(t.headFile('matches.html') || '') },
          { title: 'Finish with a clean working tree and review the history', solution: 'git status && git log --oneline', check: t => t.clean() && t.count() >= 4 && t.ran(/git log/) },
        ],
      },
      quiz: [
        { type: 'order', q: 'Put these in the order you would use them to start tracking an existing project safely.', items: ['git init', 'Write .gitignore', 'git status (check nothing unwanted is listed)', 'git add .', 'git commit -m "…"'], explain: 'Ignore rules before the first `git add .` keep junk out from the start.' },
        { type: 'mc', q: 'Why commit `.gitignore` before anything else?', choices: ['Git requires it', 'So the first `git add .` cannot pick up junk or secrets', 'It makes commits faster', 'GitHub needs it first'], answer: 1, explain: 'Ignore rules protect every later `git add`.' },
        { type: 'predict', q: 'What will `git status -s` show?', code: '$ echo "x" > a.txt\n$ git add a.txt\n$ echo "y" >> a.txt\n$ touch b.txt', choices: ['A  a.txt and ?? b.txt', 'AM a.txt and ?? b.txt', 'M  a.txt and A  b.txt', 'Nothing'], answer: 1, explain: 'a.txt is staged as new (A) and modified again (M); b.txt is untracked.' },
        { type: 'mc', q: 'A secrets file was committed and pushed. What is the FIRST thing to do?', choices: ['Delete it in a new commit', 'Change (rotate) the secret right away', 'Add it to .gitignore', 'Rename the file'], answer: 1, explain: 'Assume the secret is compromised. Then clean up the repository.' },
        { type: 'mc', q: 'Which command shows exactly what your next commit will contain?', choices: ['git status', 'git diff --staged', 'git log', 'git show'], answer: 1, explain: 'status lists files; diff --staged shows the lines.' },
        { type: 'type', q: 'Type the command that renames `about.html` to `club.html` and stages the rename.', accept: ['git mv about.html club.html'], model: 'git mv about.html club.html', explain: 'git mv does the move and the staging in one step.' },
        { type: 'multi', q: 'Which messages are good commit messages?', choices: ['Add fixtures page', 'stuff', 'Fix broken link to the shop', 'updated files', 'Explain how to run the site locally'], answer: [0, 2, 4], explain: 'Specific, imperative summaries.' },
        { type: 'mc', q: 'What is `HEAD~2:index.html`?', choices: ['The index.html file two commits before the current one', 'The second line of index.html', 'A branch called HEAD~2', 'The staged version of index.html'], answer: 0, explain: '`<commit>:<path>` names a file inside a commit.' },
      ],
    },
  ],
};
