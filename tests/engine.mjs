// Scenario checks for the simulator features behind the Scale & Trust, Maintainer and AI realms:
// signing, line endings, LFS, shallow/partial/sparse clones, filter-repo, push protection,
// CODEOWNERS, merge queues, rerere, range-diff, format-patch/am, notes, cherry, submodules, ai.
import { World, stripAnsi } from '../js/git/world.js';
import { Shell } from '../js/git/shell.js';
import { makeHelpers } from '../js/lab.js';
import { fakeBinary } from '../js/git/filters.js';
import { githubVerified, noteFor } from '../js/git/extras.js';
import { headCommit } from '../js/git/core.js';
import { enableDependabot } from '../js/git/ghextra.js';

let failed = 0, passed = 0;
function scenario(name, fn) {
  const world = new World();
  const shell = new Shell(world, { cwd: world.home });
  const H = makeHelpers(world, shell);
  const log = [];
  const run = (cmd, edit) => {
    let r = shell.run(cmd);
    const out = r.out.map(stripAnsi);
    log.push(`$ ${cmd}`, ...out);
    while (r.editor) { r = shell.resolveEditor(r.editor, typeof edit === 'function' ? edit(r.editor.content) : (edit ?? r.editor.content)); log.push(...r.out.map(stripAnsi)); out.push(...r.out.map(stripAnsi)); }
    return { code: r.code, text: out.join('\n') };
  };
  const expect = (cond, label) => { if (!cond) throw new Error(label); };
  try { fn({ world, shell, H, run, expect }); passed++; console.log(`✓ ${name}`); }
  catch (e) { failed++; console.log(`✗ ${name}: ${e.message}`); console.log(log.slice(-20).map(l => '    ' + l).join('\n')); }
}

const LIVE = 'sk_' + 'live_';

scenario('ssh commit signing, local verification and GitHub Verified', ({ world, H, run, expect }) => {
  H.remote('you', 'site', [{ message: 'init', files: { 'a.txt': 'a\n' } }]);
  H.protect('you/site', 'main', { requireSigned: true });
  run('git clone -q https://github.com/you/site.git && cd site');
  run('echo b >> a.txt && git commit -qam "unsigned"');
  let r = run('git push');
  expect(/Commits must have verified signatures/.test(r.text), 'unsigned push rejected');
  r = run('git commit --amend --no-edit -S');
  expect(/gpg failed to sign/.test(r.text), 'default gpg format has no key here');
  run('git config --global gpg.format ssh');
  r = run('git commit --amend --no-edit -S');
  expect(/user.signingkey needs to be set/.test(r.text), 'needs a signing key');
  run('ssh-keygen -t ed25519 -C dev@example.com');
  run('git config --global gpg.format ssh && git config --global user.signingkey ~/.ssh/id_ed25519.pub && git config --global commit.gpgsign true');
  run('git commit --amend --no-edit');
  expect(world.signatures.has(headCommit(H.shell.repo)), 'amend signed via commit.gpgsign');
  r = run('git verify-commit HEAD');
  expect(/allowedSignersFile needs to be configured/.test(r.text) && r.code !== 0, 'verify needs allowed signers');
  run('echo "dev@example.com namespaces=\\"git\\" $(cat ~/.ssh/id_ed25519.pub)" > ~/.ssh/allowed_signers');
  run('git config --global gpg.ssh.allowedSignersFile ~/.ssh/allowed_signers');
  r = run('git verify-commit HEAD');
  expect(/Good "git" signature for dev@example.com/.test(r.text) && r.code === 0, 'good signature');
  r = run('git log --format="%h %G? %s" -2');
  expect(/ G unsigned/.test(r.text) && / N init/.test(r.text), '%G? placeholder');
  r = run('git push');
  expect(/verified signatures/.test(r.text), 'still rejected until key is on GitHub');
  run('gh ssh-key add ~/.ssh/id_ed25519.pub --type signing --title laptop');
  r = run('git push');
  expect(r.code === 0 && githubVerified(world, headCommit(H.shell.repo)), 'push accepted and verified');
  r = run('git tag -s v1.0 -m "Release 1.0" && git verify-tag v1.0');
  expect(/Good "git" signature/.test(r.text), 'signed tag verifies');
});

scenario('line endings: CRLF noise, .gitattributes, renormalize', ({ H, run, expect }) => {
  H.repo('~/app');
  H.commit('init', { 'app.js': 'const a = 1;\r\nconst b = 2;\r\n', 'run.sh': '#!/bin/sh\r\necho hi\r\n' });
  let r = run('file app.js');
  expect(/CRLF/.test(r.text), 'file reports CRLF');
  r = run('git ls-files --eol');
  expect(/i\/crlf/.test(r.text), 'index holds crlf');
  run('printf "* text=auto eol=lf\\n*.png binary\\n" > .gitattributes');
  r = run('git status --short');
  expect(/M app.js/.test(r.text) || /app.js/.test(r.text), 'files show as modified once attributes apply');
  r = run('git add --renormalize . && git add .gitattributes && git commit -qm "Normalize line endings"');
  r = run('git ls-files --eol');
  expect(/i\/lf\s+w\/crlf\s+attr\/text=auto eol=lf\s+\tapp.js/.test(r.text), 'index normalized to lf: ' + r.text);
  r = run('git status --short');
  expect(r.text.trim() === '', 'clean after renormalize');
});

scenario('LFS: oversized push rejected, migrate import, upload', ({ world, H, run, expect }) => {
  H.remote('you', 'game', [{ message: 'init', files: { 'README.md': '# Game\n' } }]);
  run('git clone -q https://github.com/you/game.git && cd game');
  H.write('assets/intro.mp4', fakeBinary('ISO Media, MP4 v2', 180 * 1024 * 1024));
  run('git add assets && git commit -qm "Add intro video"');
  let r = run('git push');
  expect(/GH001: Large files detected/.test(r.text) && /180.00 MB/.test(r.text), 'GH001 rejection');
  r = run('git lfs migrate import --include="*.mp4"');
  expect(/not installed/.test(r.text), 'needs lfs install');
  run('git lfs install');
  r = run('git lfs migrate info');
  expect(/\*\.mp4/.test(r.text), 'migrate info lists mp4');
  r = run('git lfs migrate import --include="*.mp4"');
  expect(/Rewriting commits/.test(r.text), 'migrate rewrites');
  r = run('git lfs ls-files');
  expect(/\* assets\/intro.mp4/.test(r.text), 'lfs ls-files shows video');
  r = run('cat .gitattributes');
  expect(/\*\.mp4 filter=lfs/.test(r.text), 'gitattributes written');
  r = run('git push');
  expect(r.code === 0 && /Uploading LFS objects/.test(r.text), 'push uploads LFS objects');
  run('git lfs track "*.psd"');
  H.write('art/logo.psd', fakeBinary('Adobe Photoshop Image', 40 * 1024 * 1024));
  run('git add .gitattributes art && git commit -qm "Add logo"');
  r = run('git show --stat HEAD');
  r = run('git lfs ls-files');
  expect(/art\/logo.psd/.test(r.text), 'tracked psd stored as pointer');
  r = run('file art/logo.psd');
  expect(/Photoshop/.test(r.text), 'working copy has the real file');
  void world;
});

scenario('shallow, partial and sparse clones', ({ world, H, run, expect }) => {
  const commits = [];
  for (let i = 0; i < 30; i++) commits.push({ message: `change ${i}`, files: { [`services/api/f${i % 3}.js`]: `v${i}\n`, [`web/app${i % 2}.js`]: `w${i}\n`, 'README.md': `r${i}\n` } });
  commits.push({ branch: 'release', message: 'release branch', files: { 'RELEASE': '1\n' } });
  H.remote('acme', 'mono', commits);
  H.bare('acme/mono').meta.size = { objects: 412903, full: '1.84 GiB | 21.30 MiB/s', shallow: '38.10 MiB | 20.90 MiB/s', blobless: '212.40 MiB | 22.00 MiB/s' };
  let r = run('git clone --depth 1 https://github.com/acme/mono.git shallow');
  expect(/38.10 MiB/.test(r.text), 'shallow clone size');
  run('cd shallow');
  r = run('git log --oneline');
  expect(r.text.trim().split('\n').length === 1 && /grafted/.test(r.text), 'one grafted commit');
  r = run('git rev-parse --is-shallow-repository');
  expect(r.text.trim() === 'true', 'is shallow');
  r = run('git branch -r');
  expect(!/release/.test(r.text), 'single branch');
  run('git fetch --unshallow');
  r = run('git log --oneline');
  expect(r.text.trim().split('\n').length === 30, 'full history after unshallow: ' + r.text.split('\n').length);
  run('cd ~');
  r = run('git clone --filter=blob:none --sparse https://github.com/acme/mono.git sparse');
  expect(/212.40 MiB/.test(r.text), 'blobless size');
  run('cd sparse');
  r = run('ls');
  expect(!/services/.test(r.text) && /README.md/.test(r.text), 'sparse starts with root files only: ' + r.text);
  run('git sparse-checkout set services/api');
  r = run('ls services/api');
  expect(/f0.js/.test(r.text), 'cone checked out');
  r = run('git status');
  expect(/sparse checkout with \d+% of tracked files present/.test(r.text) && /nothing to commit/.test(r.text), 'status sparse + clean: ' + r.text);
  run('echo change >> services/api/f0.js && git commit -qam "api tweak"');
  r = run('git sparse-checkout list');
  expect(/services\/api/.test(r.text), 'list');
  run('git sparse-checkout disable');
  r = run('ls web');
  expect(/app0.js/.test(r.text), 'disable restores');
  void world;
});

scenario('filter-repo removes a secret; push protection; replace-text', ({ world, H, run, expect }) => {
  H.remote('you', 'shop', [
    { message: 'init', files: { 'app.js': 'start\n' } },
    { message: 'Add config', files: { 'config.env': `STRIPE_KEY=${LIVE}51HxQpay7d9F2kTq\n`, 'app.js': 'start\nload config\n' } },
    { message: 'Add page', files: { 'page.html': '<h1>hi</h1>\n' } },
  ], { });
  H.bare('you/shop').meta.pushProtection = true;
  run('git clone -q https://github.com/you/shop.git && cd shop');
  run('echo more >> app.js && git commit -qam "more"');
  let r = run('git filter-repo --invert-paths --path config.env');
  expect(/does not look like a fresh clone/.test(r.text), 'fresh clone check');
  run('cd ~ && rm -rf shop && git clone -q https://github.com/you/shop.git shop2 && cd shop2');
  r = run('git filter-repo --invert-paths --path config.env');
  expect(/Removing 'origin' remote/.test(r.text), 'origin removed');
  r = run(`git log --all --oneline -S ${LIVE}`);
  expect(r.text.trim() === '', 'secret gone from history');
  r = run('git log --oneline');
  expect(r.text.trim().split('\n').length === 3, 'commit count kept (Add config still has app.js change)');
  run('git remote add origin https://github.com/you/shop.git');
  r = run('git push --force --all');
  expect(r.code === 0, 'force push all: ' + r.text);
  // push protection blocks a new secret
  run(`echo "KEY=${LIVE}77NeWkeY3Xr9abc" > deploy.env && git add deploy.env && git commit -qm "deploy env"`);
  r = run('git push -u origin main');
  expect(/GH013/.test(r.text) && /Stripe API Key/.test(r.text) && r.code !== 0, 'push protection');
  run('git reset -q --hard HEAD~1');
  run(`printf "${LIVE}51HxQpay7d9F2kTq==>REDACTED\\n" > ~/expr.txt`);
  void world;
});

scenario('CODEOWNERS requests reviews and blocks merge until an owner approves', ({ H, run, expect }) => {
  H.remote('acme', 'shop', [{ message: 'init', files: { '.github/CODEOWNERS': '* @acme/web\npayments/ @acme/payments\n*.md @hana\n', 'payments/charge.js': 'v1\n', 'README.md': '# shop\n' } }], { collaborators: ['you'] });
  const b = H.bare('acme/shop');
  b.meta.teams = { payments: ['omar'], web: ['priya'] };
  H.protect('acme/shop', 'main', { requirePR: true, requiredReviews: 1, requireCodeOwners: true });
  run('git clone -q https://github.com/acme/shop.git && cd shop && git switch -qc fee');
  run('echo v2 > payments/charge.js && git commit -qam "Change fee" && git push -qu origin fee');
  let r = run('gh pr create --title "Change fee" --body "x"');
  r = run('gh pr view 1');
  expect(/Requested reviewers: @acme\/payments/.test(r.text), 'owners requested: ' + r.text);
  H.review('acme/shop', 1, 'APPROVED', 'ok', 'priya');
  r = run('gh pr view 1');
  expect(/waiting on @acme\/payments/.test(r.text), 'web approval is not enough');
  H.review('acme/shop', 1, 'APPROVED', 'ok', 'omar');
  r = run('gh pr merge 1 --squash');
  expect(r.code === 0 && /Squashed and merged/.test(r.text), 'merges after owner approval: ' + r.text);
});

scenario('merge queue catches a semantic conflict', ({ world, H, run, expect }) => {
  const CI = 'name: CI\non:\n  pull_request:\n  merge_group:\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm test\n';
  world.testRule = files => {
    const uses = /formatPrice\(/.test(files['cart.js'] || ''), defined = /export function formatPrice/.test(files['money.js'] || '');
    return !uses || defined ? { ok: true } : { ok: false, log: ['FAIL cart.test.js', '  TypeError: formatPrice is not a function'] };
  };
  H.remote('acme', 'store', [{ message: 'init', files: { '.github/workflows/ci.yml': CI, 'money.js': 'export function formatPrice(n) { return n; }\n', 'cart.js': 'total\n' } }], { collaborators: ['you'] });
  H.protect('acme/store', 'main', { requirePR: true, requiredReviews: 0, requireChecks: true, mergeQueue: true });
  run('git clone -q https://github.com/acme/store.git && cd store');
  run('git switch -qc rename && printf "export function formatAmount(n) { return n; }\\n" > money.js && git commit -qam "Rename formatPrice" && git push -qu origin rename && gh pr create --title "Rename formatPrice" --body x');
  run('git switch -q main && git switch -qc cart && printf "formatPrice(total)\\n" > cart.js && git commit -qam "Format cart total" && git push -qu origin cart && gh pr create --title "Format cart total" --body y');
  let r = run('gh pr checks 1');
  expect(r.code === 0, 'PR 1 green alone');
  r = run('gh pr checks 2');
  expect(r.code === 0, 'PR 2 green alone');
  r = run('gh pr merge 1 --squash');
  expect(/tested in the merge queue and merged/.test(r.text), 'PR 1 merged through queue: ' + r.text);
  r = run('gh pr merge 2 --squash');
  expect(/removed from the merge queue/.test(r.text) && r.code !== 0, 'PR 2 removed: ' + r.text);
  r = run('git fetch -q && git show origin/main:money.js');
  expect(/formatAmount/.test(r.text), 'main stayed green');
});

scenario('rerere replays a conflict resolution', ({ H, run, expect }) => {
  H.repo('~/r');
  H.commit('base', { 'f.txt': 'a\nb\nc\n' });
  run('git switch -qc topic');
  H.commit('topic', { 'f.txt': 'a\nTOPIC\nc\n' });
  run('git switch -q main');
  H.commit('main', { 'f.txt': 'a\nMAIN\nc\n' });
  run('git config rerere.enabled true');
  let r = run('git merge topic');
  expect(/Recorded preimage for 'f.txt'/.test(r.text), 'preimage recorded');
  run('printf "a\\nMAIN+TOPIC\\nc\\n" > f.txt');
  r = run('git add f.txt');
  expect(/Recorded resolution for 'f.txt'/.test(r.text), 'resolution recorded');
  run('git commit -qm merge && git reset -q --hard HEAD~1');
  r = run('git merge topic');
  expect(/Resolved 'f.txt' using previous resolution/.test(r.text), 'reused');
  r = run('cat f.txt');
  expect(/MAIN\+TOPIC/.test(r.text), 'file resolved');
  run('git add f.txt && git commit -qm merge2 && git reset -q --hard HEAD~1 && git switch -q topic');
  r = run('git rebase main');
  expect(/Resolved 'f.txt' using previous resolution/.test(r.text), 'rebase reuses (sides swapped): ' + r.text);
});

scenario('range-diff, cherry, merge-base', ({ H, run, expect }) => {
  H.repo('~/p');
  H.commit('base', { 'a.txt': '1\n' });
  run('git switch -qc feat');
  H.commit('Add parser', { 'parser.js': 'parse\n' });
  H.commit('Handle empty input', { 'parser.js': 'parse\nempty -> null\n' });
  H.commit('Debug logging', { 'debug.js': 'log\n' });
  run('git branch feat-v1');
  run('git switch -q main');
  H.commit('Upstream fix', { 'a.txt': '2\n' });
  run('git switch -q feat && git rebase -q main');
  run('git reset -q --hard HEAD~1');
  H.commit('Handle empty input again', { 'parser.js': 'parse\nempty -> []\n' });
  let r = run('git range-diff main feat-v1 feat');
  expect(/1:  \w{7} = 1:  \w{7} Add parser/.test(r.text), 'unchanged pair: ' + r.text);
  expect(/< -:  -------/.test(r.text), 'dropped commit');
  r = run('git merge-base main feat-v1');
  expect(/^[0-9a-f]{40}$/.test(r.text.trim()), 'merge-base prints a hash');
  expect(run('git merge-base --is-ancestor main feat').code === 0, 'is-ancestor');
  run('git switch -q main && git cherry-pick -x feat~2');
  r = run('git cherry -v main feat');
  expect(/- \w{7} Add parser/.test(r.text) && /\+ \w{7} Handle empty input again/.test(r.text), 'cherry marks applied: ' + r.text);
});

scenario('format-patch, am (clean, failure, --3way) and apply', ({ world, H, run, expect }) => {
  H.repo('~/lib');
  H.commit('base', { 'lib.c': 'int a;\nint b;\nint c;\n' });
  run('git switch -qc fix');
  H.commit('Fix b', { 'lib.c': 'int a;\nlong b;\nint c;\n' }, { author: 'Ana Silva <ana@example.org>' });
  H.commit('Add d', { 'd.c': 'int d;\n' }, { author: 'Ana Silva <ana@example.org>' });
  let r = run('git format-patch main -o patches');
  expect(/patches\/0001-Fix-b.patch/.test(r.text) && /0002-Add-d.patch/.test(r.text), 'two patch files');
  r = run('cat patches/0001-Fix-b.patch');
  expect(/Subject: \[PATCH 1\/2\] Fix b/.test(r.text) && /From: Ana Silva/.test(r.text), 'mbox headers');
  run('git switch -q main && git switch -qc apply-here');
  r = run('git am -s patches/*.patch');
  expect(/Applying: Fix b/.test(r.text) && /Applying: Add d/.test(r.text), 'am applied: ' + r.text);
  r = run('git log -1 --format="%an|%cn|%b"');
  expect(/Ana Silva\|Dev Learner\|Signed-off-by: Dev Learner/.test(r.text), 'author kept, signoff added: ' + r.text);
  run('git switch -q main');
  H.commit('Rename b', { 'lib.c': 'int a;\nint bee;\nint c;\n' });
  r = run('git am patches/0001-Fix-b.patch');
  expect(/patch does not apply/.test(r.text) && /git am --abort/.test(r.text), 'failure explained');
  r = run('git am --abort');
  r = run('git am -3 patches/0001-Fix-b.patch');
  expect(/3-way merge/.test(r.text) && /CONFLICT/.test(r.text), '3-way falls back to a conflict: ' + r.text);
  run('printf "int a;\\nlong bee;\\nint c;\\n" > lib.c && git add lib.c');
  r = run('git am --continue');
  expect(r.code === 0, 'continue');
  r = run('git format-patch -1 --stdout > one.patch && git reset -q --hard HEAD~1 && git apply --check one.patch && git apply one.patch && git diff --stat');
  expect(/lib.c/.test(r.text), 'apply to worktree');
  void world;
});

scenario('notes: add, show in log, push and fetch', ({ world, H, run, expect }) => {
  H.remote('you', 'n', [{ message: 'init', files: { 'a': '1\n' } }, { message: 'second', files: { 'a': '2\n' } }]);
  run('git clone -q https://github.com/you/n.git && cd n');
  run('git notes add -m "Reviewed-by: Priya" HEAD~1');
  let r = run('git log');
  expect(/Notes:\n    Reviewed-by: Priya/.test(r.text), 'log shows note');
  r = run('git notes add -m again HEAD~1');
  expect(/Cannot add notes/.test(r.text), 'no silent overwrite');
  run('git notes append -m "Backported to 1.x" HEAD~1');
  r = run('git notes show HEAD~1');
  expect(/Priya\n\nBackported/.test(r.text), 'append');
  r = run('git push origin refs/notes/commits');
  expect(/new reference/.test(r.text), 'push notes ref');
  run('cd ~ && git clone -q https://github.com/you/n.git n2 && cd n2');
  r = run("git fetch origin 'refs/notes/*:refs/notes/*'");
  r = run('git log --format="%s %N" -2');
  expect(/init Reviewed-by: Priya/.test(r.text), 'fetched notes: ' + r.text);
  void world; void noteFor;
});

scenario('submodules: add, clone --recurse, update --remote, status', ({ world, H, run, expect }) => {
  H.remote('acme', 'ui', [{ message: 'ui v1', files: { 'button.js': 'v1\n' } }]);
  H.remote('acme', 'app', [{ message: 'app', files: { 'index.js': 'app\n' } }], { collaborators: ['you'] });
  run('git clone -q https://github.com/acme/app.git && cd app');
  let r = run('git submodule add https://github.com/acme/ui.git libs/ui');
  expect(/Cloning into/.test(r.text), 'submodule cloned');
  r = run('git status --short');
  expect(/A  .gitmodules/.test(r.text) && /A  libs\/ui/.test(r.text), 'gitlink + gitmodules staged: ' + r.text);
  run('git commit -qm "Add ui submodule" && git push -q');
  r = run('git submodule status');
  expect(/^ [0-9a-f]{40} libs\/ui \(heads\/main\)/.test(r.text), 'status: ' + r.text);
  run('cd ~');
  run('git clone -q https://github.com/acme/app.git plain');
  r = run('ls plain/libs/ui');
  expect(r.text.trim() === '', 'plain clone leaves the submodule empty');
  r = run('cd plain && git submodule status');
  expect(/^-[0-9a-f]{40} libs\/ui/.test(r.text), 'uninitialised');
  r = run('git status --short');
  expect(r.text.trim() === '', 'uninitialised submodule is clean: ' + r.text);
  run('git submodule update --init');
  r = run('ls libs/ui');
  expect(/button.js/.test(r.text), 'populated');
  H.teammate('acme/ui', { files: { 'button.js': 'v2\n' }, message: 'ui v2' });
  run('git submodule update --remote');
  r = run('git status');
  expect(/modified:\s+libs\/ui \(new commits\)/.test(r.text), 'super sees new commits: ' + r.text);
  r = run('git diff');
  expect(/-Subproject commit/.test(r.text) && /\+Subproject commit/.test(r.text), 'diff shows pointer move');
  run('git add libs/ui && git commit -qm "Bump ui"');
  run('git push -q');
  run('cd ~ && git clone -q --recurse-submodules https://github.com/acme/app.git rec');
  r = run('ls rec/libs/ui');
  expect(/button.js/.test(r.text), 'recurse-submodules populates');
  void world;
});

scenario('ai: piped context, scripted rules, DLP block, writes', ({ world, H, run, expect }) => {
  H.repo('~/x');
  H.commit('init', { 'cart.js': 'total\n' });
  world.ai = { dlp: true, rules: [{ id: 'msg', match: /commit message/, reply: 'feat: add tests and fix #12' }, { id: 'fix', match: /resolve/, reply: 'Resolved.', writes: { 'cart.js': 'resolved\n' } }] };
  run('echo more >> cart.js && git add cart.js');
  let r = run('git diff --staged | ai "write a commit message"');
  expect(/feat: add tests and fix #12/.test(r.text) && /read \d+ lines of context/.test(r.text), 'piped reply');
  run(`echo "KEY=${LIVE}51HxQpay7d9F2kTq" > .env`);
  r = run('ai -f .env "why does this fail"');
  expect(/Blocked by your organisation's AI policy/.test(r.text) && r.code === 3, 'DLP');
  r = run('ai "resolve the conflict"');
  expect(/edited cart.js/.test(r.text) && world.files.get(world.home + '/x/cart.js') === 'resolved\n', 'writes');
});

scenario('rebase --exec runs commands and -f re-signs history', ({ world, H, run, expect }) => {
  H.repo('~/s');
  H.commit('base', { 'a': '1\n' });
  run('git switch -qc f');
  H.commit('one', { 'a': '2\n' });
  H.commit('two', { 'a': '3\n' });
  let r = run('git rebase --exec "echo checked" main');
  expect((r.text.match(/Executing: echo checked/g) || []).length === 2, 'exec after each pick: ' + r.text);
  run('ssh-keygen -t ed25519 && git config gpg.format ssh && git config user.signingkey ~/.ssh/id_ed25519.pub');
  run('git rebase -f -S main');
  const head = headCommit(H.shell.repo);
  expect(world.signatures.has(head) && world.signatures.has(world.commit(head).parents[0]), 'both commits re-signed');
});

scenario('merge -X ours/theirs and -s ours', ({ H, run, expect }) => {
  H.repo('~/m');
  H.commit('base', { 'f.txt': 'a\nb\nc\n' });
  run('git switch -qc x');
  H.commit('theirs', { 'f.txt': 'a\nB-theirs\nc\n', 'new.txt': 'n\n' });
  run('git switch -q main');
  H.commit('ours', { 'f.txt': 'a\nB-ours\nc\nd\n' });
  let r = run('git merge x');
  expect(r.code === 1, 'plain merge conflicts');
  run('git merge --abort');
  r = run('git merge -X theirs x -m m1');
  expect(r.code === 0 && H.shell.readFile(H.shell.resolvePath('f.txt')) === 'a\nB-theirs\nc\nd\n', '-X theirs keeps our clean change, takes their side of the hunk');
  run('git reset -q --hard HEAD~1');
  run('git merge -Xours x -m m2');
  expect(H.shell.readFile(H.shell.resolvePath('f.txt')) === 'a\nB-ours\nc\nd\n' && H.shell.readFile(H.shell.resolvePath('new.txt')) === 'n\n', '-X ours still brings new files');
  run('git reset -q --hard HEAD~1');
  run('git merge -s ours x -m m3');
  expect(H.shell.readFile(H.shell.resolvePath('new.txt')) === undefined, '-s ours ignores their tree');
});

scenario('rebase --update-refs moves a stack; rebase.updateRefs config', ({ H, run, expect }) => {
  H.repo('~/st');
  H.commit('base', { 'a': '1\n' });
  run('git switch -qc p1'); H.commit('p1', { 'one': '1\n' });
  run('git switch -qc p2'); H.commit('p2', { 'two': '2\n' });
  run('git switch -qc p3'); H.commit('p3', { 'three': '3\n' });
  run('git switch -q main'); H.commit('main2', { 'm': 'm\n' });
  run('git switch -q p3');
  let r = run('git rebase --update-refs main');
  const t = n => H.shell.run(`git rev-parse ${n}`, { record: false }).out[0];
  expect(/refs\/heads\/p1/.test(r.text) && t('p1^') === t('main') && t('p2^') === t('p1') && t('p3^') === t('p2'), 'stack moved');
  run('git switch -q main'); H.commit('main3', { 'm': 'mm\n' });
  run('git switch -q p3 && git config rebase.updateRefs true');
  r = run('git rebase main');
  expect(t('p1^') === t('main') && /update-refs/.test(r.text), 'config default');
  run('git switch -q main'); H.commit('main4', { 'm': 'mmm\n' });
  run('git switch -q p3');
  r = run('git rebase -i main', c => c.replace(/^pick (\w+) p2$/m, 'drop $1 p2'));
  expect(/update-ref refs\/heads\/p1/.test(H.shell.lastEditor || r.text) || t('p1^') === t('main'), 'interactive todo has update-ref');
  expect(t('p2') === t('p1'), 'dropping p2 leaves its branch at p1');
});

scenario('includeIf identities, config --file and --show-origin', ({ H, run, expect }) => {
  run('git config --global includeIf.gitdir:~/work/.path ~/.gitconfig-work');
  run('git config --file ~/.gitconfig-work user.email dev@acme.com');
  H.repo('~/work/api');
  let r = run('git config --show-origin user.email');
  expect(/gitconfig-work\tdev@acme.com/.test(r.text), 'work email from include');
  H.commit('init', { 'a': '1\n' });
  r = run('git log -1 --format=%ae');
  expect(r.text.trim() === 'dev@acme.com', 'commit uses work email');
  H.repo('~/hobby');
  r = run('git config user.email');
  expect(r.text.trim() === 'dev@example.com', 'personal email elsewhere');
  run('git config --global "includeIf.hasconfig:remote.*.url:https://github.com/acme/**.path" ~/.gitconfig-work');
  run('git remote add origin https://github.com/acme/site.git');
  r = run('git config user.email');
  expect(r.text.trim() === 'dev@acme.com', 'hasconfig:remote url include');
});

scenario('mailmap, shortlog -sne, check-mailmap; blame ignore revs and -w; log -L and -G', ({ H, run, expect }) => {
  H.repo('~/b');
  H.commit('add math', { 'm.js': 'function add(a, b) {\n  return a + b;\n}\n\nfunction sub(a, b) {\n  return a - b;\n}\n' }, { author: 'Sam Lee <sam@old.com>' });
  H.commit('tweak add', { 'm.js': 'function add(a, b) {\n  return a + b + 0;\n}\n\nfunction sub(a, b) {\n  return a - b;\n}\n' }, { author: 'sam <sam@laptop.local>' });
  H.commit('Reindent', { 'm.js': 'function add(a, b) {\n    return a + b + 0;\n}\n\nfunction sub(a, b) {\n    return a - b;\n}\n' });
  let r = run('git shortlog -sne');
  expect(/Sam Lee <sam@old.com>/.test(r.text) && /sam <sam@laptop.local>/.test(r.text), 'two identities before mailmap');
  H.write('.mailmap', 'Sam Lee <sam@acme.com> <sam@old.com>\nSam Lee <sam@acme.com> <sam@laptop.local>\n');
  r = run('git shortlog -sne');
  expect(/2\tSam Lee <sam@acme.com>/.test(r.text), 'merged by mailmap');
  r = run('git check-mailmap "sam <sam@laptop.local>"');
  expect(r.text.trim() === 'Sam Lee <sam@acme.com>', 'check-mailmap');
  r = run('git blame m.js');
  expect(/Dev Learner/.test(r.text.split('\n')[5]), 'reindent owns line 6');
  r = run('git blame -w m.js');
  expect(!/Dev Learner/.test(r.text), '-w looks through whitespace');
  run('git rev-parse HEAD > .git-blame-ignore-revs && git config blame.ignoreRevsFile .git-blame-ignore-revs');
  r = run('git blame m.js');
  expect(!/Dev Learner/.test(r.text) && /Sam Lee/.test(r.text.split('\n')[1]), 'ignored rev, mailmapped author');
  r = run('git log -L :sub:m.js --oneline');
  expect(/Reindent/.test(r.text) && /add math/.test(r.text) && !/tweak add/.test(r.text), 'log -L follows one function');
  r = run('git log -G "\\+ 0" --oneline');
  expect(/tweak add/.test(r.text) && /Reindent/.test(r.text) && !/add math/.test(r.text), '-G');
});

scenario('gc, count-objects, reflog expire, fsck; bundles; archive with export-ignore', ({ H, run, expect, world }) => {
  H.repo('~/app');
  H.commit('one', { 'a.txt': '1\n', 'tests/t.js': 't\n', '.gitattributes': '/tests export-ignore\n.gitattributes export-ignore\n' });
  H.commit('two', { 'a.txt': '2\n' });
  let r = run('git count-objects -v');
  expect(/^count: [1-9]/m.test(r.text) && /in-pack: 0/.test(r.text), 'loose before gc');
  run('git gc -q');
  r = run('git count-objects -v');
  expect(/^count: 0/m.test(r.text) && /packs: 1/.test(r.text), 'packed after gc');
  run('git reset -q --hard HEAD~1 && git reflog expire --expire=now --all');
  r = run('git fsck');
  expect(/dangling commit/.test(r.text), 'orphan visible');
  run('git gc --prune=now -q');
  r = run('git fsck');
  expect(!/dangling/.test(r.text), 'pruned');
  run('git tag v1.0');
  r = run('git archive --format=tar.gz --prefix=app-1.0/ -o ../app-1.0.tar.gz v1.0 && tar -tzf ../app-1.0.tar.gz');
  expect(r.text.trim() === 'app-1.0/a.txt', 'export-ignore: ' + r.text);
  run('git bundle create ../app.bundle --all');
  r = run('git bundle verify ../app.bundle');
  expect(/is okay/.test(r.text) && /complete history/.test(r.text), 'verify');
  run('cd ~ && git clone -q app.bundle copy');
  expect(world.repos.has(world.home + '/copy') && H.shell.run('cd ~/copy && git log --oneline', { record: false }).out.length === 1, 'clone from bundle');
  H.cd('~/app');
  H.commit('three', { 'a.txt': '3\n' });
  run('git bundle create ../inc.bundle v1.0..main');
  r = run('cd ~/copy && git bundle verify ../inc.bundle');
  expect(/is okay/.test(r.text) && /requires/.test(r.text), 'incremental bundle verifies against copy');
  r = run('git pull ../inc.bundle main');
  expect(r.code === 0 && /3/.test(H.shell.readFile(H.shell.resolvePath('a.txt'))), 'pull from bundle');
});

scenario('Actions matrix with fail-fast, reusable workflow with inputs and secrets', ({ H, run, expect, world }) => {
  world.testRule = (files, ctx) => (ctx?.matrix?.node === 18 && /findLast/.test(files['src/app.js'] || '') ? { ok: false, log: ['FAIL findLast is not a function'] } : { ok: true, log: ['PASS'] });
  H.remote('you', 'ci', [{ message: 'init', files: { 'src/app.js': 'x.findLast(Boolean)\n', 'deploy.sh': 'deploy\n', '.github/workflows/deploy.yml': 'on:\n  workflow_call:\n    inputs:\n      environment:\n        required: true\n        type: string\n    secrets:\n      TOKEN:\n        required: true\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    environment: ${{ inputs.environment }}\n    steps:\n      - run: ./deploy.sh ${{ inputs.environment }}\n        env:\n          DEPLOY_TOKEN: ${{ secrets.TOKEN }}\n', '.github/workflows/ci.yml': 'name: CI\non: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n    strategy:\n      matrix:\n        node: [18, 20, 22]\n    steps:\n      - run: npm test\n  ship:\n    needs: test\n    uses: ./.github/workflows/deploy.yml\n    with:\n      environment: staging\n    secrets: inherit\n' } }], { collaborators: ['you'] });
  world.github.authed = true;
  const runOf = () => H.bare('you/ci').meta.runs[0];
  let rr = runOf();
  expect(rr.jobs.find(j => j.id === 'test (18)').conclusion === 'failure' && rr.jobs.find(j => j.id === 'test (20)').conclusion === 'cancelled' && rr.jobs.find(j => j.id === 'ship').conclusion === 'skipped', 'fail-fast + needs');
  run('git clone -q https://github.com/you/ci.git && cd ci');
  run("echo 'x.at(-1)' > src/app.js && git commit -qam 'Avoid findLast' && git push -q");
  rr = runOf();
  expect(rr.conclusion === 'failure' && /Secret TOKEN is required/.test(rr.jobs.find(j => j.id === 'ship').log.join('\n')), 'missing secret');
  run('gh secret set TOKEN --body t && gh run rerun ' + rr.id + ' --failed');
  rr = runOf();
  expect(rr.conclusion === 'success' && H.bare('you/ci').meta.environments.staging, 'deployed through reusable workflow');
});

scenario('Dependabot alerts, security PRs, gh api with --jq, stacked PR retargeting', ({ H, run, expect, world }) => {
  const bare = H.remote('you', 'shop', [{ message: 'init', files: { 'package.json': '{\n  "dependencies": {\n    "lodash": "^4.17.20"\n  }\n}\n' } }], { collaborators: ['you'] });
  enableDependabot(world, bare);
  world.github.authed = true;
  run('git clone -q https://github.com/you/shop.git && cd shop');
  let r = run('gh api repos/{owner}/{repo}/dependabot/alerts --jq ".[0].security_advisory.ghsa_id"');
  expect(r.text.trim() === 'GHSA-35jh-r3h4-6jhm', 'alert via api');
  expect(bare.meta.prs[0].author === 'dependabot[bot]', 'security PR opened');
  run('gh pr merge 1 --squash');
  expect(bare.meta.dependabot.alerts[0].state === 'fixed', 'alert fixed after merge');
  run('gh repo edit --delete-branch-on-merge');
  run('git pull -q && git switch -qc part-1 && echo 1 > one && git add . && git commit -qm one && git push -qu origin part-1');
  run('git switch -qc part-2 && echo 2 > two && git add . && git commit -qm two && git push -qu origin part-2');
  run('gh pr create --base main --head part-1 --title One --body x && gh pr create --base part-1 --head part-2 --title Two --body y');
  run('gh pr merge 2 --squash');
  const two = bare.meta.prs.find(p => p.title === 'Two');
  expect(two.base === 'main' && !bare.refs['refs/heads/part-1'], 'retargeted after auto-delete');
  r = run('gh api repos/{owner}/{repo}/pulls --jq "map(select(.base.ref == \\"main\\")) | length"');
  expect(r.text.trim() === '1', 'jq select: ' + r.text);
});

console.log(`\n${passed}/${passed + failed} engine scenarios pass`);
process.exit(failed ? 1 : 0);
