// Realm 0 · Base Camp: why version control, the terminal, git vs GitHub, configuration.

export default {
  id: 'basecamp',
  n: 0,
  title: 'Base Camp',
  tagline: 'Why version control exists, the terminal, and setting up git',
  badge: 'Base Camp Cartographer',
  intro: 'Every expedition starts by checking the gear. In Base Camp you learn **why** version control exists, the handful of **terminal** commands git needs, the difference between **git and GitHub**, and how to **configure** git on a new machine.',
  lessons: [
    {
      id: 'why-version-control',
      title: 'Why version control exists',
      summary: 'The problem git solves, and what a history of changes gives a team.',
      minutes: 12,
      lab: {
        cwd: '~',
        panels: ['graph', 'files'],
        setup(H) {
          H.repo('~/bakery');
          H.commit('Create bakery homepage', { 'index.html': '<h1>Sunrise Bakery</h1>\n<p>Fresh every morning.</p>\n', 'prices.txt': 'bread: 4\ncake: 12\n' }, { author: 'Ana Silva <ana@sunrise.example>', hours: 1 });
          H.commit('Add croissant and muffin prices', { 'prices.txt': 'bread: 4\ncake: 12\ncroisant: 3\nmuffin: 2\n' }, { author: 'Ana Silva <ana@sunrise.example>', hours: 30 });
          H.world.labData = { cake: H.commit('Raise cake prices for the holiday season', { 'prices.txt': 'bread: 4\ncake: 15\ncroisant: 3\nmuffin: 2\n' }, { author: 'Leo Park <leo@sunrise.example>', hours: 50 }) };
          H.commit('Add opening hours', { 'index.html': '<h1>Sunrise Bakery</h1>\n<p>Fresh every morning.</p>\n<p>Open 7am to 3pm</p>\n' }, { author: 'Ana Silva <ana@sunrise.example>', hours: 20 });
          H.commit('Fix typo: croissant', { 'prices.txt': 'bread: 4\ncake: 15\ncroissant: 3\nmuffin: 2\n' }, { author: 'Leo Park <leo@sunrise.example>', hours: 3 });
          H.cd('~');
        },
        suggestions: ['cd bakery', 'git log', 'git log --oneline'],
        tasks: [
          { title: 'Go into the project folder', detail: 'The project lives in `~/bakery`.', hint: 'Use `cd` followed by the folder name.', solution: 'cd bakery', check: t => t.inDir('~/bakery') },
          { title: 'Read the full history', detail: 'See every commit with its author, date and message.', hint: 'The command is `git log`. If the output is long, scroll the terminal.', solution: 'git log', check: t => t.ran(/^git log\b/) },
          { title: 'Read the history in compact form', detail: 'One line per commit is easier to scan.', hint: 'Add the `--oneline` option to the log command.', solution: 'git log --oneline', check: t => t.ran(/^git log\b.*--oneline/), after: 'Each line starts with a short commit id. You can use that id to look at one commit.' },
          {
            title: 'Find out exactly what changed when cake prices went up',
            detail: 'Use `git show` with the id of the commit about cake prices.',
            hint: 'Copy the 7-character id at the start of the "Raise cake prices…" line, then run `git show <id>`. Lines starting with `-` were removed, `+` were added.',
            solution: 'git show <id-of-the-cake-commit>',
            check: t => t.history.some(l => { const m = l.match(/^git show\s+([0-9a-f]{4,40})\b/); return m && t.world.labData.cake.startsWith(m[1]); }),
            after: 'Leo changed one line: cake went from 12 to 15. Git recorded who, when and why.',
          },
          { title: 'Print the current price list', detail: 'Check the file as it is today.', hint: 'Use `cat` and the file name.', solution: 'cat prices.txt', check: t => t.ran(/^cat\s+(\.\/)?prices\.txt/) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'Which of these does a commit **not** record?', choices: ['Who made the change', 'When it was made', 'Why it was made (the message)', 'How long the author spent on it'], answer: 3, explain: 'A commit stores a snapshot, the author, timestamps, a message and its parent. Time spent is not tracked.' },
        { type: 'mc', q: 'Farhan had a backup folder from Tuesday but still could not undo his broken change cleanly. What was the real problem?', choices: ['The backup was too old', 'He had no record of which edits happened when, so he could not undo just one change', 'He needed a faster computer', 'The server did not allow undo'], answer: 1, explain: 'Copies do not tell you what changed between them. A version history records each change separately so you can undo exactly one.' },
        { type: 'tf', q: 'A git repository that only exists on your laptop is a backup of your work.', answer: false, explain: 'If the laptop dies, the repository dies with it. Git becomes a backup once you push to another machine, such as GitHub.' },
        { type: 'mc', q: 'Git is a **distributed** version control system. What does that mean?', choices: ['Only the server has the full history', 'Every copy of the repository contains the complete history', 'Files are split across several servers', 'It only works over a network'], answer: 1, explain: 'Each clone holds the full history, so you can browse and commit offline.' },
        { type: 'multi', q: 'Which of these are realistic things to keep in version control?', choices: ['A web app\'s source code', 'A novel being written in Markdown', 'Server configuration files', 'A live stream of chat messages'], answer: [0, 1, 2], explain: 'Anything made of files that change deliberately benefits. A stream of chat messages is data, not a project you edit.' },
        { type: 'mc', q: 'Which habit gets the most value out of version control?', choices: ['One big commit when the project is finished', 'Small, frequent commits with clear messages', 'Committing only on Fridays', 'Never writing commit messages'], answer: 1, explain: 'Small, well-described commits make history readable and let you undo precisely.' },
        { type: 'mc', q: 'The team lead ran `git revert 9fba052`. What did it do?', choices: ['Deleted the whole history', 'Undid only that one commit\'s change, keeping later work', 'Went back to the first commit', 'Uploaded the site again'], answer: 1, explain: 'revert adds a new commit that undoes one specific earlier commit. Everything else stays.' },
        { type: 'tf', q: 'Conceptually, every commit is a full snapshot of the tracked files, not just a list of differences.', answer: true, explain: 'Git thinks in snapshots and avoids storing identical content twice. Diffs are computed when you ask for them.' },
      ],
    },
    {
      id: 'terminal-survival',
      title: 'Terminal survival kit',
      summary: 'The ten commands you need to move around and handle files from a terminal.',
      minutes: 15,
      lab: {
        cwd: '~',
        panels: ['files'],
        setup(H) {
          H.write('~/welcome.txt', 'Welcome to the terminal!\nThere is a hidden file in this folder. Can you find it?\n');
          H.write('~/.treasure-map', 'You found the hidden file.\nNext clue: make a folder called projects and go inside it.\n');
        },
        suggestions: ['pwd', 'ls', 'ls -a'],
        tasks: [
          { title: 'Find out where you are', hint: '"Print working directory."', solution: 'pwd', check: t => t.ran(/^pwd$/) },
          { title: 'List everything here, including hidden files', hint: 'Plain `ls` hides names that start with a dot. Add an option.', solution: 'ls -a', check: t => t.ran(/^ls\s+(-\w*a\w*)/) },
          { title: 'Read the hidden file', detail: 'Its name starts with a dot.', hint: 'Use `cat` with the full name, dot included. {kbd:Tab} completion helps.', solution: 'cat .treasure-map', check: t => t.ran(/^cat\s+(\.\/)?\.treasure-map/) },
          { title: 'Make a folder called projects', hint: '`mkdir` makes directories.', solution: 'mkdir projects', check: t => t.world.isDir(t.shell.resolvePath('~/projects')) },
          { title: 'Move into it', hint: '`cd` changes directory.', solution: 'cd projects', check: t => t.inDir('~/projects') },
          { title: 'Create todo.txt containing the line: learn git', hint: '`echo "text" > file` writes text into a file.', solution: 'echo "learn git" > todo.txt', check: t => (t.file('~/projects/todo.txt') || '').trim() === 'learn git' },
          { title: 'Add a second line: practise daily', detail: 'Keep the first line.', hint: 'One `>` replaces the file. Two `>>` append.', solution: 'echo "practise daily" >> todo.txt', check: t => (t.file('~/projects/todo.txt') || '') === 'learn git\npractise daily\n' },
          { title: 'Copy todo.txt to backup.txt, then rename backup.txt to old-todo.txt', hint: '`cp source target` copies, `mv old new` renames.', solution: 'cp todo.txt backup.txt && mv backup.txt old-todo.txt', check: t => t.file('~/projects/old-todo.txt') === t.file('~/projects/todo.txt') && !t.exists('~/projects/backup.txt') },
          { title: 'Delete old-todo.txt', detail: 'There is no undo for `rm`, so check the name.', hint: '`rm` followed by the file name.', solution: 'rm old-todo.txt', check: t => !t.exists('~/projects/old-todo.txt') && t.exists('~/projects/todo.txt') },
        ],
      },
      quiz: [
        { type: 'type', q: 'Type the command that shows which folder you are currently in.', accept: ['pwd'], model: 'pwd', explain: '`pwd` prints the working directory.' },
        { type: 'mc', q: 'You run `ls` and do not see `.gitignore`, but you are sure it exists. Why?', choices: ['ls only shows folders', 'Files starting with a dot are hidden unless you use ls -a', 'The file is empty', 'ls needs sudo'], answer: 1, explain: 'Dot-files are hidden by default. `ls -a` shows them.' },
        { type: 'predict', q: 'notes.txt contains three lines. What does it contain after this command?', code: '$ echo "hello" > notes.txt', choices: ['The three lines plus "hello"', 'Only "hello"', 'Nothing, the file is deleted', 'An error'], answer: 1, explain: 'A single `>` replaces the file\'s content. Use `>>` to append.' },
        { type: 'mc', q: 'You are in `/home/dev/projects/shop`. Where does `cd ..` take you?', choices: ['/home/dev', '/home/dev/projects', '/', 'It stays in shop'], answer: 1, explain: '`..` means the parent folder.' },
        { type: 'type', q: 'Type a command that creates the folder `code/demo`, including `code` if it does not exist yet.', accept: ['mkdir -p code/demo', /^mkdir -p (\.\/)?code\/demo\/?$/], model: 'mkdir -p code/demo', explain: '`-p` creates any missing parent folders.' },
        { type: 'mc', q: 'What does the `-a` in `ls -a` count as?', choices: ['An argument', 'An option (flag)', 'A subcommand', 'A file name'], answer: 1, explain: 'Options start with `-` and change how a command behaves. Arguments say what to act on.' },
        { type: 'tf', q: 'Files deleted with `rm` go to the recycle bin and can be restored.', answer: false, explain: '`rm` deletes immediately. Git can restore files it was tracking, which is one more reason to commit often.' },
        { type: 'order', q: 'Put these steps in order to create `~/site/index.html` containing "hi" and show it.', items: ['mkdir site', 'cd site', 'echo "hi" > index.html', 'cat index.html'], explain: 'Make the folder, enter it, write the file, then read it.' },
      ],
    },
    {
      id: 'git-vs-github',
      title: 'Git, GitHub, and the difference',
      summary: 'Git is a program on your computer; GitHub is a service that hosts repositories.',
      minutes: 12,
      lab: {
        cwd: '~',
        panels: ['github', 'graph', 'files'],
        setup(H) {
          H.remote('octo-org', 'handbook', [
            { message: 'Start the team handbook', files: { 'README.md': '# Octo Team Handbook\n\nHow we work, written down.\n', 'onboarding.md': '# Onboarding\n1. Configure git\n2. Clone the repos\n' } },
            { message: 'Add code review guidelines', files: { 'reviews.md': '# Code reviews\nBe kind. Be specific. Approve when it is better than before.\n' } },
            { message: 'Explain our branching model', files: { 'branching.md': '# Branching\nWe use short-lived branches off main and pull requests.\n' } },
          ], { description: 'How the Octo team works' });
        },
        suggestions: ['git --version', 'gh auth status'],
        tasks: [
          { title: 'Ask git which version is installed', hint: 'Most tools answer `--version`.', solution: 'git --version', check: t => t.ran(/^git (--version|version)$/) },
          { title: 'Ask the GitHub CLI whether you are logged in', hint: 'The tool is `gh`; the topic is `auth`.', solution: 'gh auth status', check: t => t.ran(/^gh auth status/) },
          { title: 'Read the octo-org/handbook repository on GitHub', detail: 'This talks to GitHub, not to your local git.', hint: '`gh repo view owner/name`', solution: 'gh repo view octo-org/handbook', check: t => t.ran(/^gh repo view\s+octo-org\/handbook/) },
          { title: 'Make a local copy with git', detail: 'The address is `https://github.com/octo-org/handbook.git`.', hint: '`git clone <url>` copies a repository, including its history, into a new folder.', solution: 'git clone https://github.com/octo-org/handbook.git', check: t => !!t.repoAt('~/handbook') },
          { title: 'Go into your copy and read its history', hint: '`cd` into the new folder, then use `git log --oneline`. This works offline: the history is on your machine now.', solution: 'cd handbook && git log --oneline', check: t => t.inDir('~/handbook') && t.ran(/^(cd handbook && )?git log/) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'Which statement is correct?', choices: ['Git and GitHub are two names for the same tool', 'Git is a program on your computer; GitHub is a service that hosts git repositories', 'GitHub is required to use git', 'Git is a website made by Microsoft'], answer: 1, explain: 'Git is the version control program. GitHub is one company\'s hosting and collaboration service built around it.' },
        { type: 'tf', q: 'You can make commits while your laptop has no internet connection.', answer: true, explain: 'Commits are local. You only need a connection to push or pull.' },
        { type: 'multi', q: 'Which of these are features of GitHub rather than of git itself?', choices: ['Pull requests', 'Branches', 'Issues', 'GitHub Actions', 'Commits'], answer: [0, 2, 3], explain: 'Branches and commits are git concepts that work anywhere. Pull requests, issues and Actions are GitHub features.' },
        { type: 'mc', q: 'Your new company uses GitLab instead of GitHub. How much of your git knowledge transfers?', choices: ['None, GitLab has its own commands', 'All of it: git works the same; only the website features differ in name', 'Only branching', 'Only cloning'], answer: 1, explain: 'GitLab, Bitbucket and GitHub all host plain git repositories. GitLab calls pull requests "merge requests".' },
        { type: 'mc', q: 'Who originally created git, and why?', choices: ['Microsoft, for Windows', 'Linus Torvalds, to manage development of the Linux kernel', 'GitHub, to host websites', 'Google, for Android'], answer: 1, explain: 'Linus Torvalds wrote git in 2005 for the Linux kernel, a huge project with thousands of contributors.' },
        { type: 'mc', q: 'What is `gh`?', choices: ['A shortcut for git', 'GitHub\'s official command-line tool for GitHub features like PRs and issues', 'A git configuration file', 'A text editor'], answer: 1, explain: '`gh` talks to GitHub. `git` handles everything local.' },
        { type: 'type', q: 'Type the git command that copies the repository at `https://github.com/octo-org/handbook.git` to your machine.', accept: ['git clone https://github.com/octo-org/handbook.git', 'git clone https://github.com/octo-org/handbook', /^git clone (https:\/\/github\.com\/|git@github\.com:)octo-org\/handbook(\.git)?$/], model: 'git clone https://github.com/octo-org/handbook.git', explain: '`git clone <url>` downloads the repository and its whole history.' },
      ],
    },
    {
      id: 'configure-git',
      title: 'Install and introduce yourself',
      summary: 'Set your name, email and sensible defaults, and see where git keeps settings.',
      minutes: 12,
      lab: {
        world: { freshConfig: true },
        cwd: '~',
        panels: ['files'],
        setup(H) {
          H.world.dirs.add('/home/dev/work-project');
          H.cd('~/work-project');
          H.run('git init -q -b main');
          H.cd('~');
        },
        suggestions: ['git config --list'],
        tasks: [
          { title: 'See what git knows about you right now', hint: 'List every setting.', solution: 'git config --list', check: t => t.ran(/^git config\s+(--global\s+)?(--list|-l)/) },
          { title: 'Set your name globally', hint: '`git config --global user.name "Your Name"`. Quotes keep the space.', solution: 'git config --global user.name "Ada Lovelace"', check: t => !!t.world.globalConfig['user.name'] },
          { title: 'Set your email globally', hint: 'Same pattern, key `user.email`.', solution: 'git config --global user.email "ada@example.com"', check: t => /.+@.+\..+/.test(t.world.globalConfig['user.email'] || '') },
          { title: 'Make new repositories start on a branch called main', hint: 'The key is `init.defaultBranch`.', solution: 'git config --global init.defaultBranch main', check: t => t.world.globalConfig['init.defaultbranch'] === 'main' || t.world.globalConfig['init.defaultBranch'] === 'main' },
          { title: 'Choose an editor for commit messages', hint: 'The key is `core.editor`. For VS Code the value is `"code --wait"`.', solution: 'git config --global core.editor "code --wait"', check: t => !!t.world.globalConfig['core.editor'] },
          {
            title: 'In ~/work-project only, use a work email ending in @lumen.dev',
            detail: 'This is a local setting: it should not change your global email.',
            hint: '`cd` into the repository, then run `git config user.email "…"` **without** `--global`.',
            solution: 'cd work-project && git config user.email "ada@lumen.dev"',
            check: t => /@lumen\.dev$/.test(t.repoAt('~/work-project')?.config['user.email'] || '') && !/@lumen\.dev$/.test(t.world.globalConfig['user.email'] || ''),
          },
          { title: 'Show every setting with the file it comes from', hint: 'Add `--show-origin` to the list command, inside work-project.', solution: 'git config --list --show-origin', check: t => t.ran(/^git config\s+.*--show-origin/) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'Why should `user.email` match an email on your GitHub account?', choices: ['Git refuses to work otherwise', 'So GitHub links your commits to your profile', 'It encrypts your commits', 'It is needed to install git'], answer: 1, explain: 'GitHub matches commit emails to accounts. Unknown emails show as a grey, unlinked author.' },
        { type: 'type', q: 'Type the command that sets your name to `Ada Lovelace` for every repository on this machine.', accept: ['git config --global user.name "Ada Lovelace"', /^git config --global user\.name "Ada Lovelace"$/], model: 'git config --global user.name "Ada Lovelace"', explain: '`--global` writes to `~/.gitconfig`. The quotes keep the space.' },
        { type: 'mc', q: 'You set `user.email` globally to a personal address, and locally in one repo to a work address. Which one does a commit in that repo use?', choices: ['The global one', 'The local one', 'Both', 'Git asks you each time'], answer: 1, explain: 'The most specific level wins: local overrides global, which overrides system.' },
        { type: 'mc', q: 'Where are your **global** git settings stored?', choices: ['.git/config in each repo', '~/.gitconfig', '/etc/gitconfig', 'On GitHub'], answer: 1, explain: 'Global = your user\'s `~/.gitconfig`. Local = `.git/config`. System = `/etc/gitconfig`.' },
        { type: 'predict', q: 'What is wrong with this command?', code: '$ git config --global user.name Ada Lovelace', choices: ['Nothing', 'Without quotes git stores only "Ada"', 'user.name must be lowercase', '--global must come last'], answer: 1, explain: 'The shell splits on the space. Quote values that contain spaces.' },
        { type: 'mc', q: 'What does `init.defaultBranch main` change?', choices: ['It renames all existing branches', 'New repositories created with git init start on a branch called main', 'It deletes the master branch on GitHub', 'It sets which branch git pull uses'], answer: 1, explain: 'It only affects repositories you create from now on.' },
        { type: 'type', q: 'Type the command that lists all your settings together with the file each one comes from.', accept: ['git config --list --show-origin', 'git config -l --show-origin', 'git config --show-origin --list', 'git config --show-origin -l'], model: 'git config --list --show-origin', explain: '`--show-origin` adds the source file to each line.' },
      ],
    },
    {
      id: 'basecamp-boss',
      title: 'Boss: Set up camp',
      summary: 'Your first morning at a new job: workspace, git configuration, and the team repo.',
      minutes: 15,
      boss: true,
      lab: {
        world: { freshConfig: true },
        cwd: '~',
        panels: ['github', 'files', 'graph'],
        setup(H) {
          H.remote('lumen-studio', 'starter-kit', [
            { message: 'Project scaffold', files: { 'README.md': '# Lumen starter kit\n\nOur template for new client sites.\n', 'index.html': '<!doctype html>\n<title>Client</title>\n' }, author: { name: 'Mara Ruiz', email: 'mara@lumen.dev' } },
            { message: 'Add design tokens', files: { 'tokens.css': ':root { --brand: #1f6feb; }\n' }, author: { name: 'Jon Bell', email: 'jon@lumen.dev' } },
            { message: 'Document local setup in README', files: { 'README.md': '# Lumen starter kit\n\nOur template for new client sites.\n\nRun `npm install`, then `npm run dev`.\n' }, author: { name: 'Mara Ruiz', email: 'mara@lumen.dev' } },
          ], { description: 'Template for new client sites', visibility: 'private', collaborators: ['you'] });
        },
        tasks: [
          { title: 'Create your workspace folder ~/code', hint: 'You are in your home folder.', solution: 'mkdir code', check: t => t.world.isDir(t.shell.resolvePath('~/code')) },
          { title: 'Configure your global name and email', hint: 'Two `git config --global` commands.', solution: 'git config --global user.name "Your Name" && git config --global user.email "you@example.com"', check: t => !!t.world.globalConfig['user.name'] && /.+@.+\..+/.test(t.world.globalConfig['user.email'] || '') },
          { title: 'Make main the default branch for new repositories', solution: 'git config --global init.defaultBranch main', check: t => (t.world.globalConfig['init.defaultbranch'] || t.world.globalConfig['init.defaultBranch']) === 'main' },
          { title: 'Add the team shortcut: `git st` should run `git status`', hint: 'Aliases are settings too: the key is `alias.st`.', solution: 'git config --global alias.st status', check: t => t.world.globalConfig['alias.st'] === 'status' },
          { title: 'Read the lumen-studio/starter-kit repository on GitHub', solution: 'gh repo view lumen-studio/starter-kit', check: t => t.ran(/^gh repo view\s+lumen-studio\/starter-kit/) },
          { title: 'Clone it into ~/code', detail: 'It should end up at `~/code/starter-kit`.', hint: 'Move into ~/code first, then clone. The URL follows the pattern `https://github.com/<owner>/<name>.git`.', solution: 'cd ~/code && git clone https://github.com/lumen-studio/starter-kit.git', check: t => !!t.repoAt('~/code/starter-kit') },
          { title: 'Inside the clone, check its status with your alias and read the recent history', hint: 'Use your new `git st`, then a compact log.', solution: 'cd starter-kit && git st && git log --oneline', check: t => t.inDir('~/code/starter-kit') && t.ran(/^(.*&& )?git st\b/) && t.ran(/git log/) },
        ],
      },
      quiz: [
        { type: 'order', q: 'Order a sensible first-day setup on a new laptop.', items: ['git --version', 'git config --global user.name "…"', 'git config --global user.email "…"', 'git clone <team repo url>'], explain: 'Check git exists, introduce yourself, then fetch the team\'s code.' },
        { type: 'mc', q: 'What is the difference between `git` and `gh`?', choices: ['They are the same', '`git` manages history locally and moves commits; `gh` talks to GitHub features like repos, PRs and issues', '`gh` is git for Windows', '`git` only works with GitHub'], answer: 1, explain: 'Use git for version control and gh for GitHub-specific actions.' },
        { type: 'mc', q: 'After `git config --global alias.st status`, what does `git st -s` run?', choices: ['git status -s', 'git stash -s', 'An error', 'git st'], answer: 0, explain: 'Aliases expand and keep extra arguments.' },
        { type: 'tf', q: 'Commits made before you configured user.name and user.email may show a wrong or unknown author.', answer: true, explain: 'Git uses whatever identity it can guess, often the machine user name.' },
        { type: 'mc', q: 'You are in `~/code/starter-kit`. Which command proves the history exists on your machine even without internet?', choices: ['gh repo view', 'git log', 'ping github.com', 'git push'], answer: 1, explain: 'git log reads the local history that clone copied.' },
        { type: 'predict', q: 'You run this on a new laptop. What happens?', code: '$ cd ~\n$ mkdir -p code/client-a\n$ cd code/client-a\n$ pwd', choices: ['/home/dev/code', '/home/dev/code/client-a', '/code/client-a', 'An error, code does not exist'], answer: 1, explain: '`mkdir -p` creates both folders; `cd` then moves you into client-a.' },
        { type: 'multi', q: 'Which of these are **global** settings you would normally set once per machine?', choices: ['user.name', 'user.email', 'init.defaultBranch', 'The URL of a project\'s remote'], answer: [0, 1, 2], explain: 'Remote URLs belong to individual repositories.' },
        { type: 'type', q: 'Type the command that makes `git lg` show a compact graph of all branches (`log --oneline --graph --all`) for every repo.', accept: ['git config --global alias.lg "log --oneline --graph --all"', /^git config --global alias\.lg "log --oneline --graph --all"$/], model: 'git config --global alias.lg "log --oneline --graph --all"', explain: 'Quote the value: it contains spaces.' },
      ],
    },
  ],
};
