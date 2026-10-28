// Realm 12 · Scale & Trust: signed commits, line endings, Git LFS, big repositories, scrubbing
// secrets from history, CODEOWNERS and merge queues.

import { fakeBinary, parsePointer, attributesFor, lfsInstalled } from '../git/filters.js';
import { verifySignature, githubVerified } from '../git/extras.js';
import { parseWorkflow, parseCodeowners, ownersOf, prStatus } from '../git/github.js';
import { revList } from '../git/core.js';

// Fake keys are assembled at run time so the repository itself holds no secret-shaped strings.
const LIVE = 'sk_' + 'live_';
const OLD_KEY = LIVE + '51HxQpay7d9F2kTq';

const PRIYA = { name: 'Priya Sharma', email: 'priya@example.com' };
const OMAR = { name: 'Omar Haddad', email: 'omar@example.com' };
const SAM = { name: 'Sam Lee', email: 'sam@example.com' };

const crlf = s => s.replace(/\n/g, '\r\n');

// every blob in the history of the given commits
function blobsIn(world, tips) {
  const out = [];
  for (const h of revList(world, tips.filter(Boolean))) for (const [p, b] of world.readTreeFlat(world.commit(h).tree)) out.push({ path: p, content: world.objects.get(b).content });
  return out;
}
const allTips = repo => Object.entries(repo.refs).filter(([r]) => r.startsWith('refs/heads/') || r.startsWith('refs/tags/')).map(([, h]) => h);
const fileIn = (world, hash, path) => { if (!hash) return undefined; const f = world.readTreeFlat(world.commit(world.peel(hash)).tree); return f.has(path) ? world.objects.get(f.get(path)).content : undefined; };
const branchFrom = (H, repo, branch, from = 'main') => { const b = H.bare(repo); b.refs['refs/heads/' + branch] = b.refs['refs/heads/' + from]; };

const CI_PR = 'name: CI\non:\n  pull_request:\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm ci\n      - run: npm test\n';
const CI_MG = CI_PR.replace('  pull_request:\n', '  pull_request:\n  merge_group:\n');
const priceRule = files => {
  const used = /formatPrice\(/.test(files['web/cart.js'] || '');
  const defined = /export function formatPrice/.test(files['payments/money.js'] || '');
  return !used || defined ? { ok: true, log: ['PASS cart.test.js', 'PASS money.test.js'] } : { ok: false, log: ['FAIL web/cart.test.js', '  TypeError: formatPrice is not a function', '    at renderTotal (web/cart.js:3:10)'] };
};

function storefront(H) {
  H.remote('acme', 'storefront', [
    { message: 'Create storefront', files: { 'web/cart.js': 'import { formatMoney } from "../payments/money.js";\nexport const cart = [];\n', 'payments/money.js': 'export function formatPrice(n) { return n.toFixed(2); }\n', 'docs/README.md': '# Storefront\n', '.github/workflows/ci.yml': CI_PR, 'package.json': '{ "name": "storefront" }\n' } },
  ], { collaborators: ['you'] });
  H.bare('acme/storefront').meta.teams = { web: ['priya', 'sam'], payments: ['omar'], docs: ['hana'] };
  H.world.testRule = priceRule;
}

export default {
  id: 'scale-trust',
  n: 12,
  title: 'Scale & Trust',
  tagline: 'Signed commits, line endings, big files, big repos, leaked secrets, owners and queues',
  badge: 'Gatekeeper',
  intro: 'What changes when a repository grows: more people, bigger files, longer history, higher stakes. Prove who wrote a commit with **signatures**, end the line-ending wars with **.gitattributes**, keep big binaries in **Git LFS**, clone huge repositories in seconds, **scrub a leaked secret** from history, route reviews with **CODEOWNERS**, and keep `main` green with a **merge queue**.',
  lessons: [
    {
      id: 'signed-commits',
      title: 'Signed commits and Verified badges',
      summary: 'Prove your commits are yours with an SSH signing key, locally and on GitHub.',
      minutes: 18,
      lab: {
        cwd: '~/docs-site',
        panels: ['github', 'graph', 'files'],
        setup(H) {
          H.remote('you', 'docs-site', [
            { message: 'Create docs site', files: { 'README.md': '# Docs\n', 'docs/install.md': '# Install\n\nRun npm install.\n' } },
            { message: 'docs: add usage page', files: { 'docs/usage.md': '# Usage\n' } },
          ]);
          H.protect('you/docs-site', 'main', { requireSigned: true });
          H.cd('~');
          H.run('git clone -q https://github.com/you/docs-site.git');
          H.cd('~/docs-site');
          H.commit('docs: explain npm ci', { 'docs/install.md': '# Install\n\nRun npm ci for a clean, exact install.\n' });
        },
        suggestions: ['git push', 'ssh-keygen -t ed25519 -C "dev@example.com"'],
        tasks: [
          { title: 'Push your fix and read why GitHub refuses it', solution: 'git push', check: t => t.events('push-rejected').some(e => /GH006/.test(e.reason || '')) },
          { title: 'Create an SSH key for signing', solution: 'ssh-keygen -t ed25519 -C "dev@example.com"', check: t => t.exists('~/.ssh/id_ed25519.pub') },
          { title: 'Tell git to sign with SSH, using that key', solution: 'git config --global gpg.format ssh && git config --global user.signingkey ~/.ssh/id_ed25519.pub', check: t => t.world.globalConfig['gpg.format'] === 'ssh' && /id_ed25519\.pub/.test(t.world.globalConfig['user.signingkey'] || '') },
          { title: 'Sign every commit from now on', solution: 'git config --global commit.gpgsign true', check: t => t.world.globalConfig['commit.gpgsign'] === 'true' },
          { title: 'Re-sign your unpushed commit (same content, same message)', hint: 'Amending re-creates the commit, and now git signs whatever it creates.', solution: 'git commit --amend --no-edit', check: t => t.world.signatures.has(t.headHash()) && /^docs: explain npm ci/.test(t.head().message) && t.commits().length === 3 },
          { title: 'Trust your own key on this machine, then verify the commit', detail: 'Verification needs an **allowed signers** file: one line saying which email uses which key.', hint: 'Write `dev@example.com` followed by your public key into `~/.ssh/allowed_signers`, point `gpg.ssh.allowedSignersFile` at it, then `git verify-commit HEAD`.', solution: 'echo "dev@example.com $(cat ~/.ssh/id_ed25519.pub)" > ~/.ssh/allowed_signers && git config --global gpg.ssh.allowedSignersFile ~/.ssh/allowed_signers && git verify-commit HEAD', check: t => t.ran(/git (verify-commit|log\b.*--show-signature)/) && verifySignature(t.world, t.repo, t.headHash()).status === 'G' },
          { title: 'Register the key on GitHub as a signing key, then push', hint: 'A key added for pushing is an authentication key. Signing keys are added with `--type signing`.', solution: 'gh ssh-key add ~/.ssh/id_ed25519.pub --type signing && git push', check: t => t.remoteRef('you/docs-site', 'main') === t.headHash() && githubVerified(t.world, t.headHash()) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'Why can a commit say "Author: Maya Chen" although Maya never made it?', choices: ['user.name and user.email are plain text anyone can set', 'GitHub copies the name from the pull request', 'Git checks the name against the SSH key', 'It cannot happen'], answer: 0, explain: 'Only a signature ties a commit to a key its author holds.' },
        { type: 'order', q: 'Order the SSH-signing setup on a new laptop.', items: ['ssh-keygen -t ed25519', 'git config --global gpg.format ssh', 'git config --global user.signingkey ~/.ssh/id_ed25519.pub', 'git config --global commit.gpgsign true', 'gh ssh-key add ~/.ssh/id_ed25519.pub --type signing'], explain: 'Key, tell git about it, sign by default, then tell GitHub.' },
        { type: 'type', q: 'Type the command that makes git sign every commit by default.', accept: ['git config --global commit.gpgsign true'], model: 'git config --global commit.gpgsign true', explain: 'Add tag.gpgsign for annotated tags.' },
        { type: 'mc', q: 'GitHub shows Unverified on your signed commit. What is the most likely cause?', choices: ['The key is not added as a signing key, or the commit email is not on your account', 'You pushed over HTTPS', 'The commit is older than a week', 'The repository is private'], answer: 0, explain: 'Verified needs a registered signing key and a matching verified email.' },
        { type: 'mc', q: 'You turned on commit.gpgsign but have three unsigned, unpushed commits. How do you sign them?', choices: ['git rebase --force-rebase origin/main', 'git push --sign', 'git commit --amend three times', 'Nothing: old commits get signed automatically'], answer: 0, explain: 'The forced rebase re-creates each commit, and git signs what it creates.' },
        { type: 'tf', q: 'A signed commit has been reviewed and is safe to merge.', answer: false, explain: 'A signature proves who, not good. Review is still needed.' },
      ],
    },
    {
      id: 'line-endings',
      title: 'Line endings and .gitattributes',
      summary: 'End the CRLF versus LF war: one rule in the repository for everyone.',
      minutes: 15,
      lab: {
        cwd: '~/invoice-tool',
        panels: ['graph', 'files', 'areas'],
        setup(H) {
          const INVOICE = 'export function total(items) {\n  const sum = items.reduce((s, i) => s + i.price, 0);\n  return Math.round(sum * 100) / 100;\n}\n\nexport function tax(sum) {\n  return sum * 0.2;\n}\n';
          const SH = '#!/bin/sh\nset -e\nnpm ci\nnpm test\nnpm run build\n';
          H.repo('~/invoice-tool');
          H.commit('Create invoice tool', { 'invoice.js': INVOICE, 'scripts/release.sh': SH, 'logo.png': fakeBinary('PNG image data, 512 x 512, 8-bit/color RGBA', 48213), 'README.md': '# Invoice tool\n' }, { author: 'Lena Fischer <lena@acme.example>' });
          H.commit('Fix rounding of totals', { 'invoice.js': crlf(INVOICE.replace('Math.round(sum * 100) / 100', 'Math.round((sum + Number.EPSILON) * 100) / 100')), 'scripts/release.sh': crlf(SH) }, { author: 'Sam Lee <sam@acme.example>' });
        },
        suggestions: ['git show --stat HEAD', 'git ls-files --eol'],
        tasks: [
          { title: "Look at the size of Sam's one-line fix", solution: 'git show --stat HEAD', check: t => t.ran(/^git (show|log|diff)\b/) },
          { title: 'See which line endings git stored', solution: 'git ls-files --eol', check: t => t.ran(/git ls-files\b.*--eol/) || t.ran(/^(file|cat -A) /) },
          { title: 'Write .gitattributes: text stored as LF, PNG files never touched', hint: 'Two lines: `* text=auto eol=lf` and `*.png binary`.', solution: 'printf "* text=auto eol=lf\\n*.png binary\\n" > .gitattributes', check: t => { const a = attributesFor(t.repo, 'invoice.js'); const p = attributesFor(t.repo, 'logo.png'); return (a.text === true || a.text === 'auto') && p.text === false; } },
          { title: 'Re-apply the rules to every file and commit them together', solution: 'git add --renormalize . && git add .gitattributes && git commit -m "Normalize line endings to LF"', check: t => !!t.headFile('.gitattributes') && !/\r/.test(t.headFile('invoice.js') || '\r') && !/\r/.test(t.headFile('scripts/release.sh') || '\r') && t.clean() },
          { title: 'Keep the normalization commit out of git blame', hint: 'Put its full id into `.git-blame-ignore-revs` and commit that file.', solution: 'git rev-parse HEAD > .git-blame-ignore-revs && git config blame.ignoreRevsFile .git-blame-ignore-revs && git add .git-blame-ignore-revs && git commit -m "Ignore the normalization commit in blame"', check: t => { const f = t.headFile('.git-blame-ignore-revs') || ''; const h = t.ref('HEAD~1'); return !!h && f.includes(h) && t.fileAt('HEAD~1', '.gitattributes') !== undefined; } },
          { title: 'On your own Mac or Linux machine, turn any CRLF you create into LF on commit', solution: 'git config --global core.autocrlf input', check: t => t.world.globalConfig['core.autocrlf'] === 'input' },
        ],
      },
      quiz: [
        { type: 'mc', q: 'A pull request shows every line of a file changed, but the author edited one line. Most likely cause?', choices: ['The line endings changed (CRLF versus LF)', 'A merge conflict', 'Git compression', 'The file was renamed'], answer: 0, explain: 'Every line gained or lost an invisible \\r.' },
        { type: 'type', q: 'Type the .gitattributes line that stores every text file with LF endings.', accept: ['* text=auto eol=lf', '* text eol=lf', '* text=auto'], model: '* text=auto eol=lf', explain: 'Committed with the repository, so it applies to everyone.' },
        { type: 'mc', q: 'You just added .gitattributes to an old repository. What re-applies its rules to files already committed?', choices: ['git add --renormalize .', 'git reset --hard', 'git commit --amend', 'git rm -r .'], answer: 0, explain: 'Then commit the result in one dedicated commit.' },
        { type: 'tf', q: '.gitattributes works better for a team than core.autocrlf because it is committed with the repository.', answer: true, explain: 'core.autocrlf is a per-person setting that newcomers forget.' },
        { type: 'mc', q: 'A script fails with "/bin/sh^M: bad interpreter". What fixes it for good?', choices: ['*.sh text eol=lf in .gitattributes, then renormalize', 'chmod +x', 'Renaming it to .bash', 'core.autocrlf true'], answer: 0, explain: '^M is the \\r of a Windows line ending.' },
        { type: 'multi', q: 'Which files should be marked binary?', choices: ['*.png', '*.pdf', '*.js', '*.zip'], answer: [0, 1, 3], explain: 'Never let git rewrite bytes in binary formats.' },
      ],
    },
    {
      id: 'git-lfs',
      title: 'Large files with Git LFS',
      summary: 'Keep big binaries out of git history without losing version control.',
      minutes: 17,
      lab: {
        cwd: '~/trailer-site',
        panels: ['github', 'files', 'graph'],
        setup(H) {
          H.remote('you', 'trailer-site', [{ message: 'Create trailer site', files: { 'index.html': '<h1>Coming soon</h1>\n', 'styles.css': 'body { margin: 0; }\n' } }]);
          H.cd('~');
          H.run('git clone -q https://github.com/you/trailer-site.git');
          H.cd('~/trailer-site');
          H.commit('Add the launch trailer', { 'assets/trailer.mp4': fakeBinary('ISO Media, MP4 v2 [ISO 14496-14]', 188743680), 'index.html': '<h1>Coming soon</h1>\n<video src="assets/trailer.mp4" controls></video>\n' });
          H.commit('Add trailer captions', { 'assets/captions.vtt': 'WEBVTT\n\n00:00.000 --> 00:04.000\nThis summer.\n' });
          H.write('design/poster.psd', fakeBinary('Adobe Photoshop Image, 4000 x 6000, RGB', 41943040));
        },
        suggestions: ['git push', 'git lfs migrate info'],
        tasks: [
          { title: "Push, and read GitHub's answer", solution: 'git push', check: t => t.events('push-rejected').some(e => /GH001/.test(e.reason || '')) },
          { title: 'Find out which file type takes the space', solution: 'git lfs migrate info', check: t => t.ran(/git lfs migrate info|^du |^ls -l/) },
          { title: 'Set up Git LFS on this machine', solution: 'git lfs install', check: t => lfsInstalled(t.world) },
          { title: 'Turn the video into an LFS pointer in your unpushed commits', hint: '`git lfs track` only affects new commits. Rewrite the unpushed ones with `git lfs migrate import`.', solution: 'git lfs migrate import --include="*.mp4"', check: t => !!parsePointer(t.headFile('assets/trailer.mp4')) && /\*\.mp4 filter=lfs/.test(t.headFile('.gitattributes') || '') && t.isAncestor(t.ref('origin/main'), t.headHash()) },
          { title: 'Push again', solution: 'git push', check: t => t.remoteRef('you/trailer-site', 'main') === t.headHash() },
          { title: 'Send Photoshop files to LFS from now on, then commit and push the poster', solution: 'git lfs track "*.psd" && git add .gitattributes design && git commit -m "Add the poster design" && git push', check: t => !!parsePointer(fileIn(t.world, t.remoteRef('you/trailer-site', 'main'), 'design/poster.psd')) },
          { title: 'List the files LFS manages', solution: 'git lfs ls-files', check: t => t.ran(/git lfs ls-files/) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'Above what size does GitHub refuse a file in a push?', choices: ['100 MB', '10 MB', '1 GB', 'There is no limit'], answer: 0, explain: 'It warns above 50 MB and rejects above 100 MB.' },
        { type: 'mc', q: 'What does git itself store for an LFS-tracked file?', choices: ["A small pointer with the file's hash and size", 'A compressed copy', 'Nothing at all', 'A download link to the LFS website'], answer: 0, explain: 'The real file lives in the LFS store.' },
        { type: 'tf', q: 'git lfs track "*.mp4" also converts the MP4 files you already committed.', answer: false, explain: 'Tracking affects new commits. Rewrite old ones with git lfs migrate import.' },
        { type: 'type', q: 'Type the command that rewrites your unpushed commits so *.mov files become LFS pointers.', accept: ['git lfs migrate import --include="*.mov"', "git lfs migrate import --include='*.mov'", 'git lfs migrate import --include=*.mov'], model: 'git lfs migrate import --include="*.mov"', explain: 'Add --everything only if you are ready to rewrite pushed history.' },
        { type: 'order', q: 'Order a fresh LFS setup in a new repository.', items: ['git lfs install', 'git lfs track "*.psd"', 'git add .gitattributes', 'git add design/logo.psd', 'git commit -m "Add logo"', 'git push'], explain: 'Track before you add the big files.' },
        { type: 'mc', q: 'A teammate opens an image and sees text starting "version https://git-lfs…". The fix?', choices: ['Run git lfs install, then git lfs pull', 'Delete the file', 'git reset --hard', 'Rename the file'], answer: 0, explain: 'They have the pointer, not the file.' },
      ],
    },
    {
      id: 'big-repos',
      title: 'Big repos: shallow, partial and sparse',
      summary: 'Clone huge repositories in seconds and check out only what you work on.',
      minutes: 16,
      lab: {
        cwd: '~',
        panels: ['graph', 'files', 'github'],
        setup(H) {
          const commits = [{ message: 'Create the ACME monorepo', files: { 'README.md': '# ACME monorepo\n', 'package.json': '{ "private": true }\n', 'services/api/server.js': 'serve()\n', 'services/billing/config.yml': 'currency: EUR\nrounding: half-up\n', 'services/billing/invoice.js': 'invoice()\n', 'web/app.js': 'render()\n', 'docs/billing.md': '# Billing\n' } }];
          const areas = [['services/api/server.js', 'api'], ['web/app.js', 'web'], ['services/billing/invoice.js', 'billing'], ['docs/billing.md', 'docs']];
          for (let i = 0; i < 28; i++) { const [path, area] = areas[i % 4]; commits.push({ message: `${area}: change ${i + 1}`, files: { [path]: `${area} v${i + 2}\n` } }); }
          H.remote('acme', 'monorepo', commits, { collaborators: ['you'] });
          H.bare('acme/monorepo').meta.size = { objects: 412903, full: '1.84 GiB | 21.30 MiB/s', shallow: '38.10 MiB | 20.90 MiB/s', blobless: '212.40 MiB | 22.00 MiB/s' };
          branchFrom(H, 'acme/monorepo', 'release/2026.1');
        },
        suggestions: ['git clone --depth 1 https://github.com/acme/monorepo.git ci-build'],
        tasks: [
          { title: 'Make a CI-style clone with only the newest commit, in ci-build', solution: 'git clone --depth 1 https://github.com/acme/monorepo.git ci-build', check: t => !!t.repoAt('~/ci-build')?.shallow },
          { title: 'Go in and confirm it is shallow', solution: 'cd ci-build && git rev-parse --is-shallow-repository', check: t => t.ran(/is-shallow-repository/) || t.ran(/git log/) },
          { title: 'A release script needs the full history: fetch the rest', solution: 'git fetch --unshallow', check: t => !!t.repoAt('~/ci-build') && !t.repoAt('~/ci-build').shallow },
          { title: 'Make your developer clone in ~/mono: all history, file contents on demand, sparse', solution: 'cd ~ && git clone --filter=blob:none --sparse https://github.com/acme/monorepo.git mono', check: t => { const r = t.repoAt('~/mono'); return !!r?.partial && !!r.sparse; } },
          { title: 'Check out only services/billing', solution: 'cd mono && git sparse-checkout set services/billing', check: t => t.repoAt('~/mono')?.sparse?.dirs.includes('services/billing') && t.exists('~/mono/services/billing/config.yml') && !t.exists('~/mono/web/app.js') },
          { title: 'Add docs/ to your checkout', solution: 'git sparse-checkout add docs', check: t => t.repoAt('~/mono')?.sparse?.dirs.includes('docs') && t.exists('~/mono/docs/billing.md') },
          { title: 'Switch billing to bankers rounding, commit and push', solution: 'sed -i "s/half-up/bankers/" services/billing/config.yml && git commit -am "billing: use bankers rounding" && git push', check: t => { const h = t.remoteRef('acme/monorepo', 'main'); return /bankers/.test(fileIn(t.world, h, 'services/billing/config.yml') || '') && fileIn(t.world, h, 'web/app.js') !== undefined; } },
        ],
      },
      quiz: [
        { type: 'mc', q: 'Which clone suits a CI job that only builds the latest commit?', choices: ['git clone --depth 1', 'git clone --mirror', 'git clone --filter=blob:none', 'git clone --sparse'], answer: 0, explain: 'No history needed, so download none.' },
        { type: 'mc', q: 'In a shallow clone, git log stops at a commit marked…', choices: ['grafted', 'root', 'HEAD', 'detached'], answer: 0, explain: 'Its parents were cut off.' },
        { type: 'type', q: 'Type the command that downloads the rest of the history into a shallow clone.', accept: ['git fetch --unshallow'], model: 'git fetch --unshallow', explain: 'Or git fetch --depth N for a little more.' },
        { type: 'tf', q: 'In a sparse checkout, files outside your folders are deleted from the repository when you commit.', answer: false, explain: 'They are still tracked; they are just not on your disk.' },
        { type: 'mc', q: 'What does a blobless clone (--filter=blob:none) leave on the server?', choices: ['File contents of older versions, fetched when needed', 'All commits', 'All branches', 'Tags'], answer: 0, explain: 'Full history for log and blame, small download.' },
        { type: 'type', q: 'Type the command that limits your working tree to services/billing.', accept: ['git sparse-checkout set services/billing'], model: 'git sparse-checkout set services/billing', explain: 'Add more folders with git sparse-checkout add.' },
      ],
    },
    {
      id: 'scrub-history',
      title: 'Removing a secret from history',
      summary: 'Rotate first, then rewrite every commit with git filter-repo and push it safely.',
      minutes: 20,
      lab: {
        cwd: '~/payments-api',
        panels: ['github', 'graph', 'files'],
        setup(H) {
          H.remote('you', 'payments-api', [
            { message: 'Create payments API', files: { 'src/server.js': 'start()\n', 'README.md': '# payments-api\n' } },
            { message: 'Add production config', files: { 'config/prod.env': `STRIPE_KEY=${OLD_KEY}\nREGION=eu\n` } },
            { message: 'Add the Stripe client', files: { 'src/client.js': `export const stripe = connect("${OLD_KEY}");\n` } },
          ]);
          H.tagRemote('you/payments-api', 'v0.9');
          H.teammate('you/payments-api', { message: 'Remove prod.env from the repository', files: { '.gitignore': 'config/*.env\n' }, remove: ['config/prod.env'], author: { name: 'Dev Learner', email: 'dev@example.com' } });
          H.teammate('you/payments-api', { message: 'Read the Stripe key from the environment', files: { 'src/client.js': 'export const stripe = connect(process.env.STRIPE_KEY);\n' }, author: { name: 'Dev Learner', email: 'dev@example.com' } });
          H.teammate('you/payments-api', { message: 'Add a health check', files: { 'src/health.js': 'export const ok = () => "ok";\n' } });
          H.cd('~');
          H.run('git clone -q https://github.com/you/payments-api.git');
          H.cd('~/payments-api');
          H.run('git switch -q -c experiment');
          H.run('git switch -q main');
          H.world.labData = {};
          H.shell.extraCommands.payments = (args, out, sh) => {
            if (args[0] === 'rotate-key') {
              sh.world.labData.rotated = true;
              out.push(`Revoked key ${OLD_KEY.slice(0, 13)}…kTq (it no longer works anywhere)`, 'New key stored in the production secret manager.');
              return 0;
            }
            out.push('usage: payments rotate-key');
            return 1;
          };
        },
        suggestions: ['payments rotate-key', 'git log --all --oneline -S "sk_live"'],
        tasks: [
          { title: 'Revoke the leaked key first', solution: 'payments rotate-key', check: t => !!t.world.labData.rotated },
          { title: 'Find every commit that contains a live key', solution: 'git log --all --oneline -S "sk_live"', check: t => t.ran(/git log\b.*-S\s*"?sk_live/) },
          { title: 'Try filter-repo in this clone, and read why it refuses', solution: 'git filter-repo --invert-paths --path config/prod.env', check: t => t.ran(/git filter-repo/) },
          { title: 'Make a fresh clone called payments-clean', solution: 'cd ~ && git clone https://github.com/you/payments-api.git payments-clean', check: t => !!t.repoAt('~/payments-clean') },
          { title: 'Remove config/prod.env from every commit', solution: 'cd payments-clean && git filter-repo --invert-paths --path config/prod.env', check: t => { const r = t.repoAt('~/payments-clean'); return !!r && !r.config['remote.origin.url'] && !blobsIn(t.world, allTips(r)).some(b => b.path === 'config/prod.env'); } },
          { title: 'Replace the key in src/client.js with ***REMOVED*** in every commit', hint: 'Copy the key from `git log -p -- src/client.js`, write `<key>==>***REMOVED***` into a file, and pass it to `git filter-repo --replace-text`.', solution: `echo "${OLD_KEY}==>***REMOVED***" > ~/replacements.txt && git filter-repo --replace-text ~/replacements.txt`, check: t => { const r = t.repoAt('~/payments-clean'); return !!r && !blobsIn(t.world, allTips(r)).some(b => typeof b.content === 'string' && b.content.includes(LIVE)); } },
          { title: 'Put origin back and force-push every branch and tag', solution: 'git remote add origin https://github.com/you/payments-api.git && git push --force --all && git push --force --tags', check: t => { const b = t.remote('you/payments-api'); return !blobsIn(t.world, Object.values(b.refs).map(h => t.world.peel(h))).some(x => typeof x.content === 'string' && x.content.includes(LIVE)); } },
          { title: 'Turn on secret scanning push protection', solution: 'gh repo edit --enable-secret-scanning --enable-secret-scanning-push-protection', check: t => !!t.remote('you/payments-api').meta.pushProtection },
          { title: 'Delete your old clone: it still holds the key', solution: 'cd ~ && rm -rf payments-api', check: t => !t.exists('~/payments-api') },
        ],
      },
      quiz: [
        { type: 'order', q: 'A live key was pushed months ago. Order the response.', items: ['Rotate (revoke) the key', 'Find every commit containing it', 'Rewrite history with git filter-repo in a fresh clone', 'Force-push all branches and tags', 'Ask everyone to re-clone'], explain: 'Rotation first: assume the key was copied the moment it was pushed.' },
        { type: 'tf', q: 'Deleting the file in a new commit removes the secret from the repository.', answer: false, explain: 'Every earlier commit still contains it.' },
        { type: 'mc', q: 'Why does git filter-repo remove the origin remote after it runs?', choices: ['So you do not push rewritten history by accident', 'Because origin is corrupted', 'To save disk space', 'Origin needs a new URL'], answer: 0, explain: 'Pushing a rewrite is a deliberate, coordinated step.' },
        { type: 'type', q: 'Type the filter-repo command that removes config/prod.env from all history.', accept: ['git filter-repo --invert-paths --path config/prod.env', 'git filter-repo --path config/prod.env --invert-paths'], model: 'git filter-repo --invert-paths --path config/prod.env', explain: '--path selects it, --invert-paths keeps everything except it.' },
        { type: 'mc', q: 'After the rewrite, a teammate runs git pull in their old clone. What happens?', choices: ['The old commits, secret included, get merged back in', 'Their clone is cleaned automatically', 'Git refuses to pull', 'GitHub deletes their clone'], answer: 0, explain: 'Old clones must be deleted and re-cloned.' },
        { type: 'multi', q: 'What helps prevent the next leak?', choices: ['Secret scanning push protection', 'Secrets in environment variables or a secret store', 'config/*.env in .gitignore', 'Longer commit messages'], answer: [0, 1, 2], explain: 'Stop it at the push, and never put secrets in files that get committed.' },
      ],
    },
    {
      id: 'codeowners',
      title: 'CODEOWNERS: the right reviewers',
      summary: 'Route reviews to the people who own the code, and require their approval.',
      minutes: 16,
      lab: {
        cwd: '~/storefront',
        panels: ['github', 'files', 'graph'],
        setup(H) {
          storefront(H);
          H.protect('acme/storefront', 'main', { requirePR: true, requiredReviews: 1 });
          branchFrom(H, 'acme/storefront', 'rename-format');
          H.teammate('acme/storefront', { branch: 'rename-format', files: { 'payments/money.js': 'export function formatMoney(n) { return n.toFixed(2); }\n' }, message: 'Tidy: rename formatPrice to formatMoney', author: SAM });
          H.pr('acme/storefront', { title: 'Tidy: rename formatPrice to formatMoney', head: 'rename-format', author: 'sam', body: 'Small tidy-up while fixing imports.' });
          H.review('acme/storefront', 1, 'APPROVED', 'Looks tidy to me', 'priya');
          H.cd('~');
          H.run('git clone -q https://github.com/acme/storefront.git');
          H.cd('~/storefront');
        },
        events(ev, t) {
          const b = t.remote('acme/storefront');
          if (ev.type === 'pr-created') {
            const pr = b.meta.prs.find(p => p.number === ev.number);
            if (pr && pr.author === 'you') { t.review('acme/storefront', ev.number, 'APPROVED', 'Good idea: the payments team should see payments changes.', 'priya'); t.say('[GitHub] Priya Sharma approved your pull request.'); }
          }
          if (ev.type === 'review-requested' && ev.number === 1 && ev.reviewers.some(r => /omar|payments/.test(r))) {
            t.review('acme/storefront', 1, 'APPROVED', 'Checked with payments: the rename is safe, callers are updated.', 'omar');
            t.say('[GitHub] Omar Haddad (payments) approved pull request #1.');
          }
        },
        suggestions: ['gh pr view 1'],
        tasks: [
          { title: 'Look at PR #1: who approved it, and could it merge right now?', solution: 'gh pr view 1', check: t => t.ran(/gh pr view 1\b/) },
          { title: 'On a branch called codeowners, write .github/CODEOWNERS', detail: '`@acme/web` owns everything, `@acme/payments` owns `/payments/`, `@acme/docs` owns `/docs/`. Commit it.', hint: 'The last matching line wins, so put `*` first.', solution: 'git switch -c codeowners && mkdir -p .github && printf "* @acme/web\\n/payments/ @acme/payments\\n/docs/ @acme/docs\\n" > .github/CODEOWNERS && git add .github && git commit -m "Add CODEOWNERS"', check: t => { const f = t.fileAt('codeowners', '.github/CODEOWNERS'); if (!f) return false; const r = parseCodeowners(f); return ownersOf(r, 'payments/money.js').includes('@acme/payments') && ownersOf(r, 'web/cart.js').includes('@acme/web') && ownersOf(r, 'docs/README.md').includes('@acme/docs'); } },
          { title: 'Push it and open a pull request', solution: 'git push -u origin codeowners && gh pr create --fill', check: t => t.remote('acme/storefront').meta.prs.some(p => p.author === 'you' && p.head === 'codeowners') },
          { title: 'Priya approved it: squash-merge it and delete the branch', solution: 'gh pr merge 2 --squash --delete-branch', test: [t => `gh pr merge ${t.remote('acme/storefront').meta.prs.find(p => p.head === 'codeowners').number} --squash --delete-branch`], check: t => fileIn(t.world, t.remoteRef('acme/storefront', 'main'), '.github/CODEOWNERS') !== undefined },
          { title: 'In the GitHub tab, turn on "Require review from Code Owners"', detail: 'Open **Settings · branch protection for main** in the GitHub tab.', solution: '(GitHub tab → Settings · branch protection → Require review from Code Owners)', test: [{ act: H => { H.bare('acme/storefront').meta.protected.main.requireCodeOwners = true; } }], check: t => !!t.remote('acme/storefront').meta.protected.main?.requireCodeOwners },
          { title: 'Look at PR #1 again: who must approve now?', solution: 'gh pr view 1', check: t => t.history.filter(l => /gh pr view 1\b/.test(l)).length >= 2 && prStatus(t.world, t.remote('acme/storefront'), t.remote('acme/storefront').meta.prs[0]).owners['payments/money.js']?.includes('@acme/payments') },
          { title: 'Ask the payments team to review PR #1', solution: 'gh pr edit 1 --add-reviewer @acme/payments', check: t => t.remote('acme/storefront').meta.prs[0].reviews.some(r => r.author === 'omar' && r.state === 'APPROVED') },
          { title: 'Merge PR #1 now that its owner approved', solution: 'gh pr merge 1 --squash', check: t => t.remote('acme/storefront').meta.prs[0].state === 'merged' },
        ],
      },
      quiz: [
        { type: 'mc', q: 'Where must CODEOWNERS be for it to apply to a pull request into main?', choices: ['On main itself, in .github/, the root or docs/', 'On the pull request branch', 'Only in the repository settings', 'In ~/.gitconfig'], answer: 0, explain: 'GitHub reads it from the base branch.' },
        { type: 'predict', q: 'With this CODEOWNERS, who owns payments/fees.js?', code: '*            @acme/web\n/payments/   @acme/payments\n*            @acme/platform', choices: ['@acme/platform', '@acme/payments', '@acme/web', 'All three'], answer: 0, explain: 'The last matching line wins, and * matches everything.' },
        { type: 'tf', q: 'A CODEOWNERS file on its own blocks merging until an owner approves.', answer: false, explain: 'It only requests reviews. Blocking needs "Require review from Code Owners".' },
        { type: 'mc', q: 'An owner listed in CODEOWNERS has no write access to the repository. Effect?', choices: ['GitHub ignores that owner', 'They can approve anyway', 'Every pull request is blocked', 'They receive write access'], answer: 0, explain: 'Owners need write access to count.' },
        { type: 'type', q: 'Type the gh command that asks omar to review pull request 7.', accept: ['gh pr edit 7 --add-reviewer omar', 'gh pr edit 7 --add-reviewer @omar'], model: 'gh pr edit 7 --add-reviewer omar', explain: 'Teams work too: --add-reviewer acme/payments.' },
      ],
    },
    {
      id: 'merge-queue',
      title: 'Merge queues: keep main green',
      summary: 'Test each pull request on top of what will actually land before it merges.',
      minutes: 18,
      lab: {
        cwd: '~/storefront',
        panels: ['github', 'graph', 'files'],
        setup(H) {
          storefront(H);
          H.protect('acme/storefront', 'main', { requirePR: true, requiredReviews: 1, requireChecks: true });
          branchFrom(H, 'acme/storefront', 'rename-format');
          H.teammate('acme/storefront', { branch: 'rename-format', files: { 'payments/money.js': 'export function formatMoney(n) { return n.toFixed(2); }\n' }, message: 'Rename formatPrice to formatMoney', author: PRIYA });
          H.pr('acme/storefront', { title: 'Rename formatPrice to formatMoney', head: 'rename-format', author: 'priya', body: 'Clearer name.' });
          branchFrom(H, 'acme/storefront', 'cart-total');
          H.teammate('acme/storefront', { branch: 'cart-total', files: { 'web/cart.js': 'import { formatPrice } from "../payments/money.js";\nexport const cart = [];\nexport const renderTotal = total => formatPrice(total);\n' }, message: 'Show the formatted total in the cart', author: OMAR });
          H.pr('acme/storefront', { title: 'Show the formatted total in the cart', head: 'cart-total', author: 'omar', body: 'Cart shows 12.50 instead of 12.5.' });
          H.review('acme/storefront', 1, 'APPROVED', 'Nice rename', 'omar');
          H.review('acme/storefront', 2, 'APPROVED', 'Looks good', 'priya');
          H.cd('~');
          H.run('git clone -q https://github.com/acme/storefront.git');
          H.cd('~/storefront');
        },
        events(ev, t) {
          const b = t.remote('acme/storefront');
          if (ev.type === 'pr-created') {
            const pr = b.meta.prs.find(p => p.number === ev.number);
            if (pr && pr.author === 'you') { t.review('acme/storefront', ev.number, 'APPROVED', 'Yes, the queue needs that trigger.', 'priya'); t.say('[GitHub] Priya Sharma approved your pull request.'); }
          }
        },
        suggestions: ['gh pr checks 1', 'gh pr checks 2'],
        tasks: [
          { title: 'Check both PRs: green on their own?', solution: 'gh pr checks 1 && gh pr checks 2', check: t => t.ran(/gh pr checks 1\b/) && t.ran(/gh pr checks 2\b/) },
          { title: 'Make CI run for merge groups: on a branch, add merge_group to ci.yml, push and open a PR', detail: 'Under `on:` the workflow needs a `merge_group:` line next to `pull_request:`.', hint: 'Use `edit .github/workflows/ci.yml`, then commit, push and `gh pr create --fill`.', solution: 'git switch -c ci-merge-group, add "  merge_group:" under on: in ci.yml, commit, push, gh pr create --fill', test: ['git switch -c ci-merge-group', { cmd: 'edit .github/workflows/ci.yml', edit: CI_MG }, 'git commit -am "ci: run on merge groups" && git push -u origin ci-merge-group && gh pr create --fill'], check: t => { const pr = t.remote('acme/storefront').meta.prs.find(p => p.author === 'you'); if (!pr) return false; const wf = parseWorkflow(fileIn(t.world, t.remoteRef('acme/storefront', pr.head), '.github/workflows/ci.yml') || ''); return 'merge_group' in wf.triggers && 'pull_request' in wf.triggers; } },
          { title: 'Priya approved it: squash-merge it', solution: 'gh pr merge 3 --squash --delete-branch', test: [t => `gh pr merge ${t.remote('acme/storefront').meta.prs.find(p => p.author === 'you').number} --squash --delete-branch`], check: t => /merge_group/.test(fileIn(t.world, t.remoteRef('acme/storefront', 'main'), '.github/workflows/ci.yml') || '') },
          { title: 'In the GitHub tab, turn on "Require merge queue"', solution: '(GitHub tab → Settings · branch protection → Require merge queue)', test: [{ act: H => { H.bare('acme/storefront').meta.protected.main.mergeQueue = true; } }], check: t => !!t.remote('acme/storefront').meta.protected.main?.mergeQueue },
          { title: 'Send PR #1 through the queue', solution: 'gh pr merge 1 --squash', check: t => t.remote('acme/storefront').meta.prs[0].state === 'merged' && t.remote('acme/storefront').meta.prs[0].queueState === 'merged' },
          { title: 'Send PR #2 through the queue, then read what happened to it', solution: 'gh pr merge 2 --squash && gh pr view 2', test: ['gh pr merge 2 --squash', 'gh pr view 2'], check: t => t.remote('acme/storefront').meta.prs[1].queueState === 'removed' && t.ran(/gh pr view 2\b/) && priceRule(Object.fromEntries([...t.world.readTreeFlat(t.world.commit(t.remoteRef('acme/storefront', 'main')).tree)].map(([p, h]) => [p, t.world.objects.get(h).content]))).ok },
          { title: 'Fix PR #2 on top of the new main: use formatMoney, then push the branch', hint: '`gh pr checkout 2`, `git fetch origin` and `git rebase origin/main`, then replace formatPrice with formatMoney in web/cart.js, commit and push with --force-with-lease.', solution: 'gh pr checkout 2 && git fetch origin && git rebase origin/main && sed -i "s/formatPrice/formatMoney/g" web/cart.js && git commit -am "Use formatMoney in the cart" && git push --force-with-lease', check: t => { const h = t.remoteRef('acme/storefront', 'cart-total'); return /formatMoney\(/.test(fileIn(t.world, h, 'web/cart.js') || '') && t.isAncestor(t.remoteRef('acme/storefront', 'main'), h); } },
          { title: 'Queue PR #2 again', solution: 'gh pr merge 2 --squash', check: t => t.remote('acme/storefront').meta.prs[1].state === 'merged' },
        ],
      },
      quiz: [
        { type: 'mc', q: 'Two pull requests are both green, yet merging both breaks main. Why did CI not catch it?', choices: ['Each was tested against the old main, never together', 'CI was skipped', 'Git merged them wrongly', 'The tests were flaky'], answer: 0, explain: 'A merge queue tests the combination that will actually land.' },
        { type: 'type', q: 'Type the trigger line a workflow needs so it runs for a merge queue (inside on:).', accept: ['merge_group:', 'merge_group'], model: 'merge_group:', explain: 'Without it, the queue waits for a check that never comes.' },
        { type: 'mc', q: 'With a merge queue, what does gh pr merge 12 --squash do?', choices: ['Adds #12 to the queue; it merges if CI passes on main plus the PRs ahead of it', 'Merges immediately', 'Rebases #12 locally', 'Deletes the branch'], answer: 0, explain: 'The queue decides when it is safe.' },
        { type: 'tf', q: 'A PR removed from the queue for failing checks will pass if you simply queue it again.', answer: false, explain: 'Nothing changed. Update it on top of the new main first.' },
        { type: 'mc', q: 'Which branch rule does a merge queue usually replace?', choices: ['Require branches to be up to date before merging', 'Require a pull request', 'Require signed commits', 'Require approvals'], answer: 0, explain: 'The queue updates for you, so authors stop rebasing after every merge.' },
      ],
    },
    {
      id: 'scale-trust-boss',
      title: 'Boss: hand-over day',
      summary: 'Line endings, LFS, signing and code owners in one repository you are taking over.',
      minutes: 30,
      boss: true,
      lab: {
        cwd: '~/brand-kit',
        panels: ['github', 'graph', 'files'],
        setup(H) {
          H.remote('you', 'brand-kit', [
            { message: 'Create brand kit', files: { 'README.md': '# Brand kit\n', 'tokens/colors.json': '{ "teal": "#0f8f7c" }\n', 'scripts/build.sh': '#!/bin/sh\nset -e\nnode build.js\n' } },
            { message: 'Add typography tokens', files: { 'tokens/type.json': '{ "display": "Bricolage Grotesque" }\n' } },
          ]);
          H.protect('you/brand-kit', 'main', { requireSigned: true });
          H.cd('~');
          H.run('git clone -q https://github.com/you/brand-kit.git');
          H.cd('~/brand-kit');
          H.commit('Add the brand film', { 'video/brand-film.mov': fakeBinary('ISO Media, Apple QuickTime movie', 251658240), 'README.md': '# Brand kit\n\nSee video/ for the brand film.\n' });
          H.commit('Build script: also export tokens', { 'scripts/build.sh': crlf('#!/bin/sh\nset -e\nnode build.js\nnode export-tokens.js\n') });
        },
        suggestions: ['file scripts/build.sh', 'git log --oneline origin/main..HEAD'],
        tasks: [
          { title: 'Find out why CI says "/bin/sh^M: bad interpreter"', solution: 'file scripts/build.sh', check: t => t.ran(/^(file|cat -A)\b|git ls-files\b.*--eol/) },
          { title: 'Fix line endings for good: a .gitattributes rule, renormalized, in its own commit', solution: 'printf "* text=auto eol=lf\\n*.sh text eol=lf\\n" > .gitattributes && git add --renormalize . && git add .gitattributes && git commit -m "Normalize line endings to LF"', check: t => !!t.headFile('.gitattributes') && attributesFor(t.repo, 'scripts/build.sh').eol === 'lf' && !/\r/.test(t.headFile('scripts/build.sh') || '\r') && t.clean() },
          { title: 'Move the film into LFS in your unpushed commits', solution: 'git lfs install && git lfs migrate import --include="*.mov"', check: t => !!parsePointer(t.headFile('video/brand-film.mov')) && t.isAncestor(t.ref('origin/main'), t.headHash()) },
          { title: 'Set up SSH signing and sign by default', solution: 'ssh-keygen -t ed25519 -C "dev@example.com" && git config --global gpg.format ssh && git config --global user.signingkey ~/.ssh/id_ed25519.pub && git config --global commit.gpgsign true', check: t => t.world.globalConfig['gpg.format'] === 'ssh' && !!t.world.globalConfig['user.signingkey'] && t.world.globalConfig['commit.gpgsign'] === 'true' && t.exists('~/.ssh/id_ed25519.pub') },
          { title: 'Re-sign every unpushed commit', hint: 'A forced rebase onto origin/main re-creates each commit, and git signs them.', solution: 'git rebase --force-rebase origin/main', check: t => { const up = t.ref('origin/main'); const mine = revList(t.world, [t.headHash()], [up]); return mine.length >= 3 && mine.every(h => t.world.signatures.has(h)) && !!parsePointer(t.headFile('video/brand-film.mov')); } },
          { title: 'Register your signing key on GitHub and push', solution: 'gh ssh-key add ~/.ssh/id_ed25519.pub --type signing && git push', check: t => t.remoteRef('you/brand-kit', 'main') === t.headHash() && githubVerified(t.world, t.headHash()) },
          { title: 'Make the film team review anything under video/: CODEOWNERS, signed and pushed', solution: 'mkdir -p .github && printf "* @you\\n/video/ @acme/film\\n" > .github/CODEOWNERS && git add .github && git commit -m "Add CODEOWNERS" && git push', check: t => { const f = fileIn(t.world, t.remoteRef('you/brand-kit', 'main'), '.github/CODEOWNERS'); return !!f && ownersOf(parseCodeowners(f), 'video/brand-film.mov').includes('@acme/film'); } },
        ],
      },
      quiz: [
        { type: 'mc', q: 'Which order avoids redoing work: LFS migration, re-signing, or line-ending normalization last?', choices: ['Normalize and migrate first, then re-sign all unpushed commits once, then push', 'Sign first, then rewrite', 'Push first, then fix', 'Order never matters'], answer: 0, explain: 'Every rewrite re-creates commits, so sign after the last rewrite.' },
        { type: 'multi', q: 'Which of these rewrite commit ids?', choices: ['git lfs migrate import', 'git rebase --force-rebase', 'git commit --amend', 'git add --renormalize .'], answer: [0, 1, 2], explain: 'Renormalizing only stages changes; the commit you make afterwards is new.' },
        { type: 'tf', q: 'After the forced rebase, the LFS pointers from the migration are still in the commits.', answer: true, explain: 'The rebase replays the migrated commits as they are.' },
        { type: 'mc', q: 'GitHub rejects your push with "Commits must have verified signatures" although you signed them. What is missing?', choices: ['The public key registered on GitHub as a signing key', 'A new SSH key', 'A merge commit', 'A tag'], answer: 0, explain: 'gh ssh-key add … --type signing.' },
        { type: 'type', q: 'Type the CODEOWNERS line that makes @acme/film own everything under video/.', accept: ['/video/ @acme/film', 'video/ @acme/film'], model: '/video/ @acme/film', explain: 'Below the catch-all line, because the last match wins.' },
      ],
    },
  ],
};
