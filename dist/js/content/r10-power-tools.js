// Realm 10 · Power Tools: bisect, blame & archaeology, aliases, hooks, internals, worktrees.

const PRECOMMIT = '#!/bin/sh\nif git diff --cached | grep -q "console.log"; then\n  echo "Blocked: remove console.log before committing."\n  exit 1\nfi\n';
const COMMITMSG = '#!/bin/sh\nif ! grep -qE "^(feat|fix|docs|chore|refactor|test)(\\(.+\\))?: " "$1"; then\n  echo "Use a Conventional Commit message, e.g. fix: handle empty carts"\n  exit 1\nfi\n';

export default {
  id: 'power-tools',
  n: 10,
  title: 'Power Tools',
  tagline: 'Bisect, blame, aliases, hooks, internals and worktrees',
  badge: 'Toolsmith',
  intro: 'The tools that make experienced developers look like wizards: binary-search a bug with **bisect**, dig up the *why* with **blame** and the pickaxe, speed up with **aliases**, automate checks with **hooks**, understand the **object model** under it all, and work on two branches at once with **worktrees**.',
  lessons: [
    {
      id: 'bisect',
      title: 'Bisect: binary search for bugs',
      summary: 'Find the commit that introduced a bug in a handful of steps, by hand or automatically.',
      minutes: 16,
      lab: {
        cwd: '~/calc',
        panels: ['graph', 'files'],
        setup(H) {
          H.world.testRule = files => /a \+ b/.test(files['calc.js'] || '') ? { ok: true, log: ['PASS add(2, 3) === 5'] } : { ok: false, log: ['FAIL add(2, 3): expected 5, got -1'] };
          H.repo('~/calc');
          H.commit('Create calculator', { 'calc.js': 'export const add = (a, b) => a + b;\n' });
          H.run('git tag v1.0');
          const msgs = ['Add multiply', 'Add divide', 'Document the API', 'Add percentage helper', 'Rename helpers file', 'Tidy up imports', 'Add square root', 'Improve error messages', 'Add history list', 'Add memory key', 'Style the keypad'];
          msgs.forEach((m, i) => {
            const files = { [`feature${i}.js`]: `// ${m}\n` };
            if (i === 5) { files['calc.js'] = 'export const add = (a, b) => a - b;\n'; }
            const h = H.commit(m, files, { author: i === 5 ? 'Sam Lee <sam@calc.example>' : 'Ada Okafor <ada@calc.example>' });
            if (i === 5) H.world.labData = { bad: h };
          });
        },
        suggestions: ['npm test', 'git bisect start'],
        tasks: [
          { title: 'Confirm the tests fail now', solution: 'npm test', check: t => t.ran(/^npm (run )?test/) },
          { title: 'Start a bisect session', solution: 'git bisect start', check: t => !!t.repo.bisect || t.events('bisect-found').length > 0 },
          { title: 'Tell git the current commit is bad and v1.0 is good', solution: 'git bisect bad && git bisect good v1.0', check: t => (t.repo.bisect && t.repo.bisect.bad && t.repo.bisect.good.length > 0) || t.events('bisect-found').length > 0 },
          { title: 'Test each commit git checks out (npm test) and answer good or bad until git names the first bad commit', hint: 'Run `npm test`. If it passes, `git bisect good`; if it fails, `git bisect bad`. About four rounds.', solution: 'npm test, then git bisect good / git bisect bad', test: ['git bisect run npm test'], check: t => t.events('bisect-found').some(e => e.hash === t.world.labData.bad) },
          { title: 'End the session and return to main', solution: 'git bisect reset', check: t => !t.repo.bisect && t.branch() === 'main' },
          { title: 'Do it again automatically in two commands', solution: 'git bisect start HEAD v1.0 && git bisect run npm test', check: t => t.ran(/git bisect run/) && t.events('bisect-found').filter(e => e.hash === t.world.labData.bad).length >= 2 },
          { title: 'Reset again and read the guilty commit', solution: 'git bisect reset && git show <id>', test: [t => `git bisect reset && git show ${t.world.labData.bad.slice(0, 7)}`], check: t => !t.repo.bisect && t.history.some(l => { const m = l.match(/git show\s+(\S+)/); return m && t.ref(m[1]) === t.world.labData.bad; }) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'Roughly how many tests does git bisect need to search 1,000 commits?', choices: ['About 10', 'About 100', 'About 500', 'Exactly 1,000'], answer: 0, explain: 'Each test halves the range: 2^10 ≈ 1,024.' },
        { type: 'order', q: 'Order a manual bisect session.', items: ['git bisect start', 'git bisect bad', 'git bisect good v1.0', 'test, then git bisect good / bad (repeat)', 'git bisect reset'], explain: 'Mark the ends, test the middle, finish with reset.' },
        { type: 'type', q: 'Type the command that lets `npm test` drive the bisect automatically.', accept: ['git bisect run npm test'], model: 'git bisect run npm test', explain: 'Exit code 0 = good, non-zero = bad.' },
        { type: 'mc', q: 'A commit in the middle does not even build. What do you do?', choices: ['git bisect bad', 'git bisect skip', 'git bisect reset', 'Delete the commit'], answer: 1, explain: 'skip moves to a nearby commit instead.' },
        { type: 'tf', q: 'After bisect finishes, you are automatically back on your branch.', answer: false, explain: 'Run git bisect reset.' },
        { type: 'multi', q: 'What makes bisect effective?', choices: ['A reliable test for good vs bad', 'Commits that each build', 'Huge commits mixing many changes', 'Knowing one good and one bad commit'], answer: [0, 1, 3], explain: 'Small atomic commits pinpoint the cause precisely.' },
      ],
    },
    {
      id: 'blame-archaeology',
      title: 'Blame and code archaeology',
      summary: 'Find who changed a line and why, and see past formatting commits with the pickaxe.',
      minutes: 15,
      lab: {
        cwd: '~/payclient',
        panels: ['graph', 'files'],
        setup(H) {
          H.repo('~/payclient');
          H.commit('Create bank API client', { 'client.js': 'export const config = {\nurl:"https://bank.example",\ntimeout:30,\nretries:1,\n};\n' }, { author: 'Omar Haddad <omar@pay.example>' });
          H.world.labData = {};
          H.world.labData.timeout = H.commit('Raise timeout to 47s for the bank API', { 'client.js': 'export const config = {\nurl:"https://bank.example",\ntimeout:47,\nretries:1,\n};\n' }, { author: 'Hana Ito <hana@pay.example>' });
          H.world.labData.retries = H.commit('Retry three times as required by the bank SLA', { 'client.js': 'export const config = {\nurl:"https://bank.example",\ntimeout:47,\nretries:3,\n};\n' }, { author: 'Omar Haddad <omar@pay.example>' });
          H.commit('style: reformat with prettier', { 'client.js': 'export const config = {\n  url: "https://bank.example",\n  timeout: 47,\n  retries: 3,\n};\n' }, { author: 'format-bot <bot@pay.example>' });
        },
        suggestions: ['git blame client.js'],
        tasks: [
          { title: 'Blame client.js', detail: 'Notice which commit every line points to.', solution: 'git blame client.js', check: t => t.ran(/^git blame\b.*client\.js/) },
          { title: 'Look past the formatting commit: find the commit that introduced 47', solution: 'git log -S 47 --oneline', check: t => t.ran(/^git log\b.*-S/) },
          { title: 'Read that commit to learn why', solution: 'git show <id>', test: [t => `git show ${t.world.labData.timeout.slice(0, 7)}`], check: t => t.history.some(l => { const m = l.match(/^git show\s+(\S+)/); return m && t.ref(m[1]) === t.world.labData.timeout; }) },
          { title: 'Blame only line 4 (retries)', solution: 'git blame -L 4,4 client.js', check: t => t.ran(/^git blame\b.*-L\s*\d/) },
          { title: 'Find and show the commit that set retries to 3', solution: 'git log -S "retries:3" --oneline && git show <id>', test: [t => `git show ${t.world.labData.retries.slice(0, 7)}`], check: t => t.history.some(l => { const m = l.match(/git show\s+(\S+)/); return m && t.ref(m[1]) === t.world.labData.retries; }) },
          { title: 'Read the whole history of client.js with diffs', solution: 'git log -p -- client.js', check: t => t.ran(/^git log\b.*-p\b.*client\.js|^git log\b.*client\.js.*-p\b/) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What does `git blame` show for each line?', choices: ['Who wrote the original idea', 'The last commit that changed that line, its author and date', 'Every commit that ever touched the line', 'Who reviewed it'], answer: 1, explain: 'A starting point; dig further with log -S.' },
        { type: 'mc', q: 'blame says every line was last changed by "style: reformat". How do you find who introduced the timeout value?', choices: ['Give up', 'git log -S "timeout" (or the value) to find commits that added/removed it', 'git blame --force', 'Ask the format bot'], answer: 1, explain: 'The pickaxe looks at what changed, not at whitespace.' },
        { type: 'type', q: 'Type the command that blames only lines 10 to 20 of `server.js`.', accept: ['git blame -L 10,20 server.js', 'git blame server.js -L 10,20'], model: 'git blame -L 10,20 server.js', explain: '-L start,end.' },
        { type: 'tf', q: 'git blame is mainly a tool for finding someone to blame for a bug.', answer: false, explain: 'It finds context and the right person to ask.' },
        { type: 'mc', q: 'Which file lets blame ignore mass-formatting commits?', choices: ['.gitignore', '.git-blame-ignore-revs', '.gitattributes', 'CODEOWNERS'], answer: 1, explain: 'Used with --ignore-revs-file.' },
      ],
    },
    {
      id: 'aliases-config',
      title: 'Aliases and config power-ups',
      summary: 'Shortcuts for long commands and settings that remove daily friction.',
      minutes: 12,
      lab: {
        cwd: '~/notes',
        panels: ['graph', 'areas'],
        setup(H) {
          H.repo('~/notes');
          H.commit('Start notes', { 'todo.md': '# Todo\n' });
          H.commit('Add groceries', { 'groceries.md': '- milk\n' });
        },
        suggestions: ['git config --global --list'],
        tasks: [
          { title: 'Create the alias st for status', solution: 'git config --global alias.st status', check: t => t.world.globalConfig['alias.st'] === 'status' },
          { title: 'Create lg for a one-line graph of all branches', solution: 'git config --global alias.lg "log --oneline --graph --decorate --all"', check: t => /log/.test(t.world.globalConfig['alias.lg'] || '') && /--graph/.test(t.world.globalConfig['alias.lg'] || '') && /--oneline/.test(t.world.globalConfig['alias.lg'] || '') },
          { title: 'Create undo for "reset --soft HEAD~1"', solution: 'git config --global alias.undo "reset --soft HEAD~1"', check: t => /reset --soft HEAD~1/.test(t.world.globalConfig['alias.undo'] || '') },
          { title: 'Make a quick commit, then undo it with your alias', solution: 'echo "- eggs" >> groceries.md && git commit -am "Add eggs" && git undo', check: t => t.ran(/(^|&& )git undo/) && t.count() === 2 && t.staged('groceries.md') },
          { title: 'Use st and lg', solution: 'git st && git lg', check: t => t.ran(/(^|&& )git st\b/) && t.ran(/(^|&& )git lg\b/) },
          { title: 'Turn on pull.rebase and fetch.prune globally', solution: 'git config --global pull.rebase true && git config --global fetch.prune true', check: t => t.world.globalConfig['pull.rebase'] === 'true' && t.world.globalConfig['fetch.prune'] === 'true' },
        ],
      },
      quiz: [
        { type: 'type', q: 'Type the command that creates the alias `co` for `checkout`.', accept: ['git config --global alias.co checkout'], model: 'git config --global alias.co checkout', explain: 'Then `git co main` works.' },
        { type: 'predict', q: 'You have `alias.unstage = "restore --staged"`. What does this run?', code: '$ git unstage app.js', choices: ['git unstage app.js', 'git restore --staged app.js', 'git restore app.js', 'An error'], answer: 1, explain: 'Arguments are appended to the alias.' },
        { type: 'mc', q: 'What does `rerere.enabled true` do?', choices: ['Re-runs failed tests', 'Remembers how you resolved a conflict and reuses that resolution next time', 'Retries pushes', 'Rebases automatically'], answer: 1, explain: 'REuse REcorded REsolution.' },
        { type: 'mc', q: 'Where are global settings and aliases stored?', choices: ['.git/config', '~/.gitconfig', 'GitHub settings', '.gitignore'], answer: 1, explain: 'A plain text file you can back up.' },
        { type: 'tf', q: 'An alias named `status` can override the built-in git status.', answer: false, explain: 'Built-in commands take precedence.' },
      ],
    },
    {
      id: 'hooks',
      title: 'Hooks: automatic guards',
      summary: 'Scripts git runs before commits and pushes to block mistakes early.',
      minutes: 16,
      lab: {
        cwd: '~/widget',
        panels: ['files', 'graph'],
        setup(H) {
          H.repo('~/widget');
          H.commit('chore: create widget', { 'widget.js': 'export const render = () => "<div></div>";\n' });
          H.world.labData = {};
        },
        onCommand(line, res, t) {
          const ld = t.world.labData;
          const n = t.count();
          const committed = n !== (ld.lastCount ?? 1);
          if (/git commit/.test(line)) {
            const staged = t.repo.index.get('widget.js');
            const stagedText = staged ? t.world.objects.get(staged).content : '';
            if (t.repo.hookExec?.['pre-commit'] && /console\.log/.test(stagedText) && !/console\.log/.test(t.headFile('widget.js') || '')) ld.logBlocked = true;
            if (t.repo.hookExec?.['commit-msg'] && (!committed || res.out.some(l => /onventional/.test(l)))) ld.msgBlocked = true;
          }
          ld.lastCount = n;
        },
        suggestions: ['ls .git/hooks', 'edit .git/hooks/pre-commit'],
        tasks: [
          { title: 'List the sample hooks git ships with', solution: 'ls .git/hooks', check: t => t.ran(/^ls\s+(\.\/)?\.git\/hooks/) },
          { title: 'Write a pre-commit hook that blocks staged console.log lines', detail: 'Open it with `edit .git/hooks/pre-commit`. The lesson\'s Commands lens has a template.', solution: 'edit .git/hooks/pre-commit', test: [{ cmd: 'edit .git/hooks/pre-commit', edit: PRECOMMIT }], check: t => /console\.log/.test(t.repo.hooks['pre-commit'] || '') && /exit 1/.test(t.repo.hooks['pre-commit'] || '') },
          { title: 'Make it executable', solution: 'chmod +x .git/hooks/pre-commit', check: t => !!t.repo.hookExec?.['pre-commit'] },
          { title: 'Stage a change containing console.log and watch the commit get blocked', solution: 'echo "console.log(\'debug\');" >> widget.js && git add widget.js && git commit -m "chore: debug"', check: t => !!t.world.labData.logBlocked && t.count() === 1 },
          { title: 'Remove the debug line and commit successfully', solution: 'git restore --staged widget.js && git restore widget.js && echo "export const size = 2;" >> widget.js && git commit -am "feat: add widget size"', check: t => t.count() === 2 && !/console\.log/.test(t.headFile('widget.js') || '') },
          { title: 'Add an executable commit-msg hook that enforces Conventional Commits', solution: 'edit .git/hooks/commit-msg && chmod +x .git/hooks/commit-msg', test: [{ cmd: 'edit .git/hooks/commit-msg', edit: COMMITMSG }, 'chmod +x .git/hooks/commit-msg'], check: t => !!t.repo.hookExec?.['commit-msg'] && /\$1/.test(t.repo.hooks['commit-msg'] || '') },
          { title: 'Try a non-conventional message (blocked), then a conventional one', solution: 'echo "x" > notes.md && git add notes.md && git commit -m "notes" ; git commit -m "docs: add notes"', check: t => !!t.world.labData.msgBlocked && /^docs|^feat|^fix|^chore|^refactor|^test/.test(t.head().message) && t.count() === 3 },
        ],
      },
      quiz: [
        { type: 'mc', q: 'Where do local git hooks live?', choices: ['In the project root', 'In .git/hooks/', 'On GitHub', 'In ~/.gitconfig'], answer: 1, explain: 'Each hook is a script named after the event.' },
        { type: 'mc', q: 'A pre-commit hook exits with code 1. What happens?', choices: ['The commit proceeds with a warning', 'The commit is aborted', 'The hook is deleted', 'Git pushes anyway'], answer: 1, explain: 'Non-zero exit from a pre- hook aborts the operation.' },
        { type: 'tf', q: 'Hooks in .git/hooks are shared with teammates when you push.', answer: false, explain: '.git is never pushed. Use husky/lefthook/pre-commit or core.hooksPath.' },
        { type: 'type', q: 'Type the command that commits while skipping hooks (use with care).', accept: [/^git commit (--no-verify|-n) -m ".+"$/, /^git commit -m ".+" (--no-verify|-n)$/], model: 'git commit --no-verify -m "message"', explain: 'Also -n.' },
        { type: 'mc', q: 'Which hook is best for enforcing a commit message format?', choices: ['pre-push', 'commit-msg', 'post-merge', 'pre-rebase'], answer: 1, explain: 'It receives the message file path as $1.' },
        { type: 'mc', q: 'Why keep pre-commit hooks fast?', choices: ['Git times them out after 1 second', 'Slow hooks push people to skip them with --no-verify', 'They block pushes', 'They use network bandwidth'], answer: 1, explain: 'Run heavy suites in pre-push or CI.' },
      ],
    },
    {
      id: 'internals',
      title: 'Under the hood',
      summary: 'Blobs, trees, commits and refs: the content-addressed design that explains everything else.',
      minutes: 18,
      lab: {
        cwd: '~/garden',
        panels: ['graph', 'files'],
        setup(H) {
          H.repo('~/garden');
          H.commit('Plant the garden', { 'greeting.txt': 'hello\n', 'beds/roses.txt': 'red\n' });
          H.commit('Copy the greeting', { 'copy-of-greeting.txt': 'hello\n' });
        },
        suggestions: ['echo "hello" | git hash-object --stdin', 'git cat-file -p HEAD'],
        tasks: [
          { title: 'Hash the text "hello" the way git would', solution: 'echo "hello" | git hash-object --stdin', check: t => t.ran(/hash-object\s+--stdin/) },
          { title: 'Ask git what type of object HEAD is', solution: 'git cat-file -t HEAD', check: t => t.ran(/^git cat-file\s+-t\s+/) },
          { title: 'Print the commit object itself', solution: 'git cat-file -p HEAD', check: t => t.ran(/^git cat-file\s+-p\s+(HEAD|@|[0-9a-f]{4,})$/) },
          { title: 'Print its root tree', solution: 'git cat-file -p HEAD^{tree}', check: t => t.ran(/^git cat-file\s+-p\s+\S*\^\{tree\}/) || t.history.some(l => { const m = l.match(/^git cat-file\s+-p\s+([0-9a-f]{4,})$/); return m && t.world.objects.get(t.ref(m[1]) || '')?.type === 'tree'; }) },
          { title: 'Follow the tree to a blob and print it', solution: 'git cat-file -p <blob id from the tree>', test: [t => `git cat-file -p ${t.world.blobHash('hello\n').slice(0, 7)}`], check: t => t.history.some(l => { const m = l.match(/^git cat-file\s+-p\s+([0-9a-f]{4,40})$/); if (!m) return false; const ids = [...t.world.objects.keys()].filter(k => k.startsWith(m[1])); return ids.length === 1 && t.world.objects.get(ids[0]).type === 'blob'; }) },
          { title: 'Prove identical content is stored once: hash both greeting files', solution: 'git hash-object greeting.txt copy-of-greeting.txt', check: t => t.history.some(l => /hash-object\b.*greeting\.txt.*copy-of-greeting\.txt|hash-object\b.*copy-of-greeting\.txt.*greeting\.txt/.test(l)) || (t.ran(/hash-object\s+(\.\/)?greeting\.txt/) && t.ran(/hash-object\s+(\.\/)?copy-of-greeting\.txt/)) },
          { title: 'Peek at the object folders and the main branch file', solution: 'ls .git/objects && cat .git/refs/heads/main', check: t => t.ran(/ls\s+(\.\/)?\.git\/objects/) && t.ran(/cat\s+(\.\/)?\.git\/refs\/heads\/main/) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What does a blob store?', choices: ['A file\'s name and content', 'Only a file\'s content', 'A folder listing', 'A commit message'], answer: 1, explain: 'Names live in trees.' },
        { type: 'mc', q: 'Two files in different folders have identical content. How many blobs does git store?', choices: ['Two', 'One', 'Zero', 'One per commit'], answer: 1, explain: 'Same content, same hash, one object.' },
        { type: 'order', q: 'Order the objects from a commit down to file content.', items: ['commit', 'tree (project root)', 'tree (subfolder)', 'blob'], explain: 'Commits point to a root tree; trees point to trees and blobs.' },
        { type: 'mc', q: 'You change one word in a commit message from three commits ago (via rebase). Which ids change?', choices: ['Only that commit', 'That commit and every commit after it', 'None', 'All commits in the repository'], answer: 1, explain: 'Each later commit contains its parent\'s id.' },
        { type: 'type', q: 'Type the command that prints the type of the object named HEAD.', accept: ['git cat-file -t HEAD', 'git cat-file -t @'], model: 'git cat-file -t HEAD', explain: '-t type, -p pretty-print, -s size.' },
        { type: 'tf', q: 'A branch is stored as a file containing a commit id.', answer: true, explain: '.git/refs/heads/<name> (or packed-refs).' },
      ],
    },
    {
      id: 'worktree-submodules',
      title: 'Worktrees, submodules and big files',
      summary: 'Two branches checked out at once, other repositories pinned inside yours, and LFS.',
      minutes: 15,
      lab: {
        cwd: '~/shop',
        panels: ['graph', 'areas'],
        setup(H) {
          H.repo('~/shop');
          H.commit('Create shop', { 'vat.js': 'export const vat = 0.2;\nexport const withVat = p => p * 1.02;\n', 'cart.js': 'export const cart = [];\n', 'checkout.js': 'export const checkout = {};\n' });
          H.run('git switch -q -c feature/refactor');
          H.commit('Start splitting the cart module', { 'cart/index.js': 'export * from "../cart.js";\n' });
          H.write('cart.js', 'export const cart = new Map();\n');
          H.write('checkout.js', 'export const checkout = { steps: 3 };\n');
        },
        suggestions: ['git status', 'git worktree list'],
        tasks: [
          { title: 'Check: you have uncommitted refactor work', solution: 'git status', check: t => t.ran(/^git status/) },
          { title: 'Create a second working folder ../shop-hotfix on a new branch hotfix/vat from main', solution: 'git worktree add ../shop-hotfix -b hotfix/vat main', check: t => !!t.repoAt('~/shop-hotfix') && t.branch(t.repoAt('~/shop-hotfix')) === 'hotfix/vat' },
          { title: 'In that folder, fix withVat to multiply by 1.2, and commit', solution: 'cd ../shop-hotfix && sed -i "s/1.02/1.2/" vat.js && git commit -am "Fix VAT multiplier"', check: t => /1\.2\b/.test(t.fileAt('hotfix/vat', 'vat.js') || '') },
          { title: 'Still there, merge the hotfix into main', solution: 'git switch main && git merge hotfix/vat', check: t => /1\.2\b/.test(t.fileAt('main', 'vat.js') || '') },
          { title: 'List the worktrees', solution: 'git worktree list', check: t => t.ran(/^git worktree list/) },
          { title: 'Go back to ~/shop and remove the extra worktree', solution: 'cd ~/shop && git worktree remove ../shop-hotfix', check: t => !t.repoAt('~/shop-hotfix') && t.inDir('~/shop') },
          { title: 'Your refactor is untouched: confirm with git status', solution: 'git status', check: t => t.inDir('~/shop') && t.history.filter(l => /^(cd .* && )?git status/.test(l)).length >= 2 && t.status(t.repoAt('~/shop')).unstaged.length >= 2 },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What do all worktrees of one repository share?', choices: ['Nothing', 'The object database, branches and config', 'Only the working files', 'Their HEAD and index'], answer: 1, explain: 'Each worktree has its own HEAD, index and files.' },
        { type: 'type', q: 'Type the command that creates a worktree in ../review checked out on the existing branch feature/search.', accept: ['git worktree add ../review feature/search'], model: 'git worktree add ../review feature/search', explain: 'A second folder for that branch.' },
        { type: 'mc', q: 'What does the parent repository store for a submodule?', choices: ['A full copy of its history', 'Its URL (in .gitmodules) and a pinned commit id', 'Only its latest files', 'Nothing'], answer: 1, explain: 'It pins an exact commit.' },
        { type: 'mc', q: 'You cloned a project with submodules and the submodule folders are empty. Which command fixes it?', choices: ['git pull', 'git submodule update --init --recursive', 'git worktree add', 'git lfs install'], answer: 1, explain: 'Or clone with --recurse-submodules.' },
        { type: 'mc', q: 'What problem does Git LFS solve?', choices: ['Merge conflicts', 'Large binary files bloating the repository history', 'Slow pushes over SSH', 'Missing tags'], answer: 1, explain: 'Git stores pointers; LFS stores the big files.' },
        { type: 'tf', q: 'Git lets you check out the same branch in two worktrees at once.', answer: false, explain: 'It refuses, to avoid two working copies fighting over one branch.' },
      ],
    },
    {
      id: 'power-boss',
      title: 'Boss: The mystery regression',
      summary: 'Bisect, blame, revert, a pre-commit test hook and an alias, all on one bug.',
      minutes: 25,
      boss: true,
      lab: {
        cwd: '~/quill',
        panels: ['graph', 'files'],
        setup(H) {
          H.world.testRule = files => /\$\{text\}/.test(files['heading.js'] || '') ? { ok: true, log: ['PASS "# Hello" renders <h1>Hello</h1>'] } : { ok: false, log: ['FAIL "# Hello" rendered <h1></h1>'] };
          H.repo('~/quill');
          H.commit('feat: render headings', { 'heading.js': 'export const heading = text => `<h1>${text}</h1>`;\n', 'quill.js': 'export * from "./heading.js";\n' }, { author: 'Mira Patel <mira@quill.example>' });
          H.run('git tag v2.0');
          const people = ['Mira Patel <mira@quill.example>', 'Sam Lee <sam@quill.example>', 'Jo Kim <jo@quill.example>', 'Ravi Nair <ravi@quill.example>'];
          const work = [
            ['feat: render paragraphs', { 'paragraph.js': 'export const p = t => `<p>${t}</p>`;\n' }],
            ['feat: render links', { 'link.js': 'export const a = (t, u) => `<a href="${u}">${t}</a>`;\n' }],
            ['docs: document the API', { 'README.md': '# Quill\n' }],
            ['refactor: trim heading markers', { 'heading.js': 'export const heading = raw => {\n  const text = raw.replace(/^#+\\s*/, "");\n  return `<h1>${text}</h1>`;\n};\n' }],
            ['feat: render lists', { 'list.js': 'export const ul = items => items.join("");\n' }],
            ['perf: avoid regex in headings', { 'heading.js': 'export const heading = raw => {\n  const text = raw.slice(raw.indexOf(" ") + 1);\n  return `<h1>${raw.text}</h1>`;\n};\n' }],
            ['feat: render code blocks', { 'code.js': 'export const pre = c => `<pre>${c}</pre>`;\n' }],
            ['test: add list tests', { 'list.test.js': 'test("lists", () => {});\n' }],
            ['feat: render images', { 'image.js': 'export const img = s => `<img src="${s}">`;\n' }],
            ['chore: bump version', { 'version.txt': '2.1.0\n' }],
            ['feat: render quotes', { 'quote.js': 'export const q = t => `<blockquote>${t}</blockquote>`;\n' }],
          ];
          work.forEach(([m, f], i) => { const h = H.commit(m, f, { author: people[i % 4] }); if (m.startsWith('perf')) H.world.labData = { bad: h }; });
        },
        tasks: [
          { title: 'Find the first bad commit with git bisect (v2.0 was good)', solution: 'git bisect start HEAD v2.0 && git bisect run npm test', check: t => t.events('bisect-found').some(e => e.hash === t.world.labData.bad) },
          { title: 'End the bisect session', solution: 'git bisect reset', check: t => !t.repo.bisect && t.branch() === 'main' },
          { title: 'Read the guilty commit (who, and why did they change it?)', solution: 'git show <id>', test: [t => `git show ${t.world.labData.bad.slice(0, 7)}`], check: t => t.history.some(l => { const m = l.match(/git show\s+(\S+)/); return m && t.ref(m[1]) === t.world.labData.bad; }) || t.ran(/^git blame\b.*heading\.js/) },
          { title: 'Undo it without rewriting history, and confirm the tests pass', solution: 'git revert --no-edit <id> && npm test', test: [t => `git revert --no-edit ${t.world.labData.bad.slice(0, 7)} && npm test`], check: t => /^Revert "perf: avoid regex in headings"/.test(t.head().message) && /\$\{text\}/.test(t.headFile('heading.js') || '') && t.isAncestor(t.world.labData.bad, t.headHash()) },
          { title: 'Add an executable pre-commit hook that runs npm test and blocks failing commits', hint: 'A one-line body works: `npm test || exit 1`.', solution: 'printf "#!/bin/sh\\nnpm test || exit 1\\n" > .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit', check: t => /npm (run )?test/.test(t.repo.hooks['pre-commit'] || '') && !!t.repo.hookExec?.['pre-commit'] },
          { title: 'Add a global lg alias for a one-line graph of all branches', solution: 'git config --global alias.lg "log --oneline --graph --all"', check: t => /log/.test(t.world.globalConfig['alias.lg'] || '') && /--graph/.test(t.world.globalConfig['alias.lg'] || '') },
        ],
      },
      quiz: [
        { type: 'order', q: 'Order a professional response to "it used to work".', items: ['Write or find a test that shows the bug', 'git bisect start HEAD <good>', 'git bisect run <test>', 'git show the first bad commit', 'Fix or revert, then git bisect reset'], explain: 'Reproduce, locate, understand, fix.' },
        { type: 'mc', q: 'The bisected commit was "perf: avoid regex", which looked harmless. What does that teach?', choices: ['Never optimise', 'Small focused commits make bisect point at the exact cause; read the diff, not just the title', 'Bisect is unreliable', 'Messages do not matter'], answer: 1, explain: 'The diff reveals raw.text instead of text.' },
        { type: 'multi', q: 'Which tools help explain WHY a line is the way it is?', choices: ['git blame', 'git log -S', 'git show', 'git stash'], answer: [0, 1, 2], explain: 'Find the commit, then read it.' },
        { type: 'tf', q: 'A pre-commit hook that runs the test suite replaces the need for CI.', answer: false, explain: 'Hooks can be skipped or missing; CI is the enforcement.' },
        { type: 'mc', q: 'The bad commit is on main and already shared. How do you undo it?', choices: ['git reset --hard <bad>~1 and force push', 'git revert <bad>', 'git commit --amend', 'Delete the tag'], answer: 1, explain: 'Shared history: revert.' },
      ],
    },
  ],
};
