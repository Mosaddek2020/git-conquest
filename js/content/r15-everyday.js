// Realm 15 · Everyday Mastery: searching history by content, stacked branches and PRs,
// choosing a side in merges, separate work and personal identities, repository housekeeping,
// and moving history without a server (bundles, release archives).

import { revList, configGet, mailmapFor } from '../git/core.js';
import { isBundle, parseBundle, isArchive, parseArchive, reachableObjects } from '../git/everyday.js';

const ANA = 'Ana Silva <ana@example.org>';
const KIM = 'Kim Park <kim@example.org>';
const BOT = 'Format Bot <bot@example.org>';

// ---------- history search fixtures ----------

const PRICING_V1 = `export function total(items) {
  let sum = 0;
  for (const i of items) sum += i.price * i.qty;
  return sum;
}

export function discount(sum, percent) {
  const off = sum * percent / 100;
  return Math.round(off * 100) / 100;
}
`;
const PRICING_TAX = PRICING_V1 + `
export function tax(sum) {
  return sum * 0.2;
}
`;
const PRICING_FLOOR = PRICING_TAX.replace('return Math.round(off * 100) / 100;', 'return Math.floor(off * 100) / 100;');
const reindent = s => s.replace(/^( +)/gm, m => ' '.repeat(m.length * 2));
const PRICING_FMT = reindent(PRICING_FLOOR);
const PRICING_SHIP = PRICING_FMT.replace('    return sum;\n}', '    if (sum >= 50) return sum;\n    return sum + 4.99;\n}');
const PRICING_FIXED = PRICING_SHIP.replace('Math.floor(off * 100)', 'Math.round(off * 100)');

const ranAfter = (t, first, then) => { const h = t.history; const i = h.findIndex(l => first.test(l)); return i >= 0 && h.slice(i + 1).some(l => then.test(l)); };
const commitBy = (t, re) => t.commits().find(c => re.test(c.message));

// ---------- stacked branches fixtures ----------

const MODEL = 'export class Refund {\n  constructor(orderId, amount) {\n    this.orderId = orderId;\n    this.amount = amount;\n  }\n}\n';
const MODEL_FIXED = MODEL.replace(/amount/g, 'amountCents');
const chainOK = (t, base) => {
  const m = t.ref('refunds-model'), a = t.ref('refunds-api'), u = t.ref('refunds-ui');
  if (!m || !a || !u) return false;
  const p = h => t.world.commit(h).parents[0];
  return p(u) === a && p(a) === m && p(m) === t.ref(base);
};

// ---------- merge strategy fixtures ----------

const FR_BASE = '{\n  "cart.title": "Panier",\n  "cart.empty": "Votre panier est vide",\n  "cart.items": "articles",\n  "checkout.pay": "Payer"\n}\n';
const FR_MAIN = '{\n  "cart.title": "Votre panier",\n  "cart.empty": "Votre panier est vide",\n  "cart.items": "articles",\n  "checkout.pay": "Payer",\n  "checkout.title": "Paiement"\n}\n';
const FR_THEIRS = '{\n  "cart.title": "Mon panier",\n  "cart.empty": "Votre panier est vide pour le moment",\n  "cart.items": "articles",\n  "checkout.pay": "Payer"\n}\n';

const DE_BASE = '{\n  "save": "Speichern",\n  "cancel": "Abbrechen",\n  "ok": "OK",\n  "close": "Schließen"\n}\n';
const DE_THEIRS = '{\n  "save": "Sichern",\n  "cancel": "Abbrechen",\n  "ok": "OK",\n  "close": "Schließen"\n}\n';
const DE_MAIN = '{\n  "save": "Speichern!",\n  "cancel": "Abbrechen",\n  "ok": "OK",\n  "close": "Schließen",\n  "delete": "Löschen"\n}\n';

// ---------- housekeeping fixtures ----------

function busyHistory(H, n) {
  for (let i = 1; i <= n; i++) H.commit(`Update module ${i}`, { [`src/module${i % 7}.js`]: `export const v = ${i};\n`, 'CHANGELOG.md': Array.from({ length: i }, (_, k) => `- change ${k + 1}`).join('\n') + '\n' }, { hours: 2 });
}

const archiveAt = (t, path) => { const c = t.world.files.get(t.shell.resolvePath(path)); return isArchive(c) ? parseArchive(c) : null; };
const bundleAt = (t, path) => { const c = t.world.files.get(t.shell.resolvePath(path)); return isBundle(c) ? parseBundle(c) : null; };

export default {
  id: 'everyday',
  n: 15,
  title: 'Everyday Mastery',
  tagline: 'search history by content, stacked PRs, picking a side, identities, housekeeping, bundles',
  badge: 'Everyday Master',
  intro: 'The habits that separate someone who uses git from someone who is fluent in it: find **which change** touched a line with `log -S`, `log -L` and a blame that looks past reformatting; keep a **stack** of branches and pull requests moving together with `--update-refs`; settle conflicts on purpose with `-X ours` and `-X theirs`; keep **work and personal identities** apart; keep a big repository **fast and tidy**; and move history **without a server** using bundles and release archives.',
  lessons: [
    {
      id: 'history-search',
      title: 'Find the change, not the commit',
      summary: 'log -S and -G, log -L for one function, blame that looks past reformatting, and word diffs.',
      minutes: 18,
      lab: {
        cwd: '~/checkout',
        panels: ['graph', 'files'],
        setup(H) {
          H.repo('~/checkout');
          H.commit('Create pricing module', { 'pricing.js': PRICING_V1, 'README.md': '# checkout\n' }, { author: ANA });
          H.commit('Add tax', { 'pricing.js': PRICING_TAX }, { author: ANA });
          H.commit('Round discounts down', { 'pricing.js': PRICING_FLOOR }, { author: KIM });
          H.commit('Update README', { 'README.md': '# checkout\n\nPricing helpers.\n' }, { author: ANA });
          H.commit('Reformat with 4-space indentation', { 'pricing.js': PRICING_FMT }, { author: BOT });
          H.commit('Free shipping over 50', { 'pricing.js': PRICING_SHIP }, { author: ANA });
          H.world.labData = { floor: H.shell.run('git rev-parse HEAD~3', { record: false }).out[0], fmt: H.shell.run('git rev-parse HEAD~1', { record: false }).out[0] };
        },
        suggestions: ['git log -S Math.floor --oneline', 'git log -L :discount:pricing.js', 'git blame -w pricing.js'],
        tasks: [
          { title: 'List the commits that added or removed `Math.floor`', hint: 'The pickaxe: `git log -S <text>` finds commits that change how many times the text appears.', solution: 'git log -S Math.floor --oneline', check: t => t.ran(/git log\b.*-S\s*['"]?Math\.floor/) },
          { title: 'Show the history of just the `discount` function', hint: '`git log -L :<function>:<file>` follows a function through every commit that touched it.', solution: 'git log -L :discount:pricing.js', check: t => t.ran(/git log\b.*-L\s*:?discount:pricing\.js/) },
          { title: 'Blame pricing.js while ignoring whitespace changes', detail: 'Plain blame credits the reformat commit for almost every line. `-w` looks through it.', solution: 'git blame -w pricing.js', check: t => t.ran(/git blame\b.*-w/) },
          { title: 'List the reformat commit in .git-blame-ignore-revs and commit the file', hint: 'Put its full id in the file: `git rev-parse HEAD~1 > .git-blame-ignore-revs`, then add and commit.', solution: 'git rev-parse HEAD~1 > .git-blame-ignore-revs && git add .git-blame-ignore-revs && git commit -m "Ignore the reformat in blame"', check: t => (t.headFile('.git-blame-ignore-revs') || '').includes(t.world.labData.fmt) },
          { title: 'Tell blame to read that file, then blame the discount lines', hint: 'Set `blame.ignoreRevsFile`, then `git blame -L 8,11 pricing.js`.', solution: 'git config blame.ignoreRevsFile .git-blame-ignore-revs && git blame -L 8,11 pricing.js', check: t => t.config('blame.ignoreRevsFile') === '.git-blame-ignore-revs' && t.history.some((l, j) => /git blame\b/.test(l.replace(/.*blame\.ignoreRevsFile/i, '')) && t.history.slice(0, j + 1).some(x => /blame\.ignoreRevsFile/i.test(x))) },
          { title: 'See exactly which word changed in that commit', hint: '`git show --word-diff <commit>` (the commit blame pointed at, by Kim).', solution: 'git show --word-diff <Kim\'s commit>', test: [t => `git show --word-diff ${t.world.labData.floor.slice(0, 7)}`], check: t => t.history.some(l => { const m = l.match(/git show\b.*--word-diff\s+(\S+)/) || l.match(/git show\s+(\S+)\s+--word-diff/); return m && t.ref(m[1]) === t.world.labData.floor; }) },
          { title: 'Fix the rounding and commit, naming the commit that caused it', detail: 'Change `Math.floor` back to `Math.round`. Mention the bad commit\'s short id in the message body.', solution: 'edit pricing.js, then git commit -am "Round discounts to the nearest cent" -m "Math.floor came in with <id>"', test: [{ cmd: 'edit pricing.js', edit: PRICING_FIXED }, t => `git commit -qam "Round discounts to the nearest cent" -m "Math.floor came in with ${t.world.labData.floor.slice(0, 7)}"`], check: t => !/Math\.floor/.test(t.headFile('pricing.js') || '') && /Math\.round/.test(t.headFile('pricing.js') || '') && t.head().message.includes(t.world.labData.floor.slice(0, 7)) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What does `git log -S timeout` find?', choices: ['Commits that changed how many times "timeout" appears in the code', 'Commits whose message mentions timeout', 'Commits by an author called timeout', 'Every commit that touched a file containing timeout'], answer: 0, explain: 'The "pickaxe". Use --grep to search messages, -G to match changed lines by regex.' },
        { type: 'type', q: 'Type the command that shows the history of the function `parse` in `src/parser.js`.', accept: ['git log -L :parse:src/parser.js'], model: 'git log -L :parse:src/parser.js', explain: '-L :<funcname>:<file>, or -L <start>,<end>:<file> for a line range.' },
        { type: 'mc', q: 'A formatter commit reindented the whole file. How do you make blame skip it for the whole team?', choices: ['List its id in .git-blame-ignore-revs, commit that file and set blame.ignoreRevsFile', 'Revert the formatter commit', 'Run git blame -C', 'Squash it into the previous commit on main'], answer: 0, explain: 'GitHub also reads .git-blame-ignore-revs in its blame view.' },
        { type: 'tf', q: '`git blame -w` ignores changes that only add or remove whitespace.', answer: true, explain: 'Handy for one-off reindents; the ignore-revs file handles any kind of mechanical change.' },
        { type: 'mc', q: 'What is the difference between `-S` and `-G`?', choices: ['-S counts occurrences of a string; -G matches a regex against added or removed lines', 'They are aliases', '-G searches commit messages', '-S only works on the current branch'], answer: 0, explain: '-G also finds commits that move a matching line without changing how often it appears.' },
        { type: 'mc', q: 'Why use `--word-diff` on a long line of text or minified code?', choices: ['It marks just the changed words with [-old-]{+new+} instead of repeating the whole line', 'It is faster', 'It hides whitespace', 'It shows the author of each word'], answer: 0, explain: 'Great for prose, translations and long configuration lines.' },
      ],
    },
    {
      id: 'stacked-branches',
      title: 'Stacked branches and stacked PRs',
      summary: 'Keep a stack of dependent branches moving together with --update-refs, and land it one small PR at a time.',
      minutes: 22,
      lab: {
        cwd: '~/payments',
        panels: ['graph', 'github'],
        setup(H) {
          H.remote('acme', 'payments', [{ message: 'Create payments service', files: { 'src/index.js': 'export {};\n', 'README.md': '# payments\n' } }], { collaborators: ['you'] });
          H.world.github.authed = true;
          H.cd('~');
          H.run('git clone -q https://github.com/acme/payments.git');
          H.cd('~/payments');
          H.run('git switch -qc refunds-model');
          H.commit('Add refund model', { 'src/refund.js': MODEL });
          H.run('git switch -qc refunds-api');
          H.commit('Add refunds API', { 'src/api/refunds.js': 'import { Refund } from "../refund.js";\nexport const create = (o, a) => new Refund(o, a);\n' });
          H.run('git switch -qc refunds-ui');
          H.commit('Add refund button', { 'src/ui/RefundButton.js': 'export const RefundButton = () => "<button>Refund</button>";\n' });
          H.run('git push -q origin refunds-model refunds-api refunds-ui');
          H.pr('acme/payments', { title: 'Add refund model', head: 'refunds-model', base: 'main', author: 'you', body: 'Part 1 of 3: the model.' });
          H.teammate('acme/payments', { message: 'Add request logging', files: { 'src/log.js': 'export const log = console.log;\n' } });
          H.world.labData = {};
        },
        events(ev, t) {
          if (ev.type === 'push' && ev.branch === 'refunds-model' && !t.world.labData.asked) {
            t.world.labData.asked = true;
            const b = t.remote('acme/payments');
            const pr = b.meta.prs.find(p => p.head === 'refunds-model');
            if (pr) { t.review('acme/payments', pr.number, 'CHANGES_REQUESTED', 'Please store money as integer cents: rename amount to amountCents.', 'Priya Sharma'); t.say('[GitHub] Priya requested changes on #1: "rename amount to amountCents".'); }
          }
        },
        suggestions: ['git config --global rebase.updateRefs true', 'git fetch && git rebase origin/main'],
        tasks: [
          { title: 'Make every rebase move the branches stacked inside it', hint: 'The setting is `rebase.updateRefs` (the same as passing `--update-refs` every time).', solution: 'git config --global rebase.updateRefs true', check: t => String(t.world.globalConfig['rebase.updateRefs'] ?? '').toLowerCase() === 'true' },
          { title: 'From the top of the stack (refunds-ui), fetch and rebase the whole stack onto origin/main', solution: 'git fetch && git rebase origin/main', check: t => t.ref('origin/main') === t.remoteRef('acme/payments', 'main') && chainOK(t, 'origin/main') && t.branch() === 'refunds-ui' },
          { title: 'Push all three branches safely in one command', hint: '`git push --force-with-lease origin <branch> <branch> <branch>`', solution: 'git push --force-with-lease origin refunds-model refunds-api refunds-ui', check: t => ['refunds-model', 'refunds-api', 'refunds-ui'].every(b => t.remoteRef('acme/payments', b) === t.ref(b)) },
          { title: 'Open the next two PRs, each based on the branch below it', hint: '`gh pr create --base refunds-model --head refunds-api …`, then the same for refunds-ui on refunds-api.', solution: 'gh pr create --base refunds-model --head refunds-api --title "Add refunds API" --body "Part 2 of 3" && gh pr create --base refunds-api --head refunds-ui --title "Add refund button" --body "Part 3 of 3"', check: t => { const prs = t.remote('acme/payments').meta.prs; return prs.some(p => p.head === 'refunds-api' && p.base === 'refunds-model') && prs.some(p => p.head === 'refunds-ui' && p.base === 'refunds-api'); } },
          { title: "Address Priya's review with a fixup commit for the model, made from the top of the stack", detail: 'In src/refund.js rename `amount` to `amountCents` (all three places), then `git commit -a --fixup <the "Add refund model" commit>`.', solution: 'edit src/refund.js, then git commit -a --fixup refunds-model', test: [{ cmd: 'edit src/refund.js', edit: MODEL_FIXED }, 'git commit -qa --fixup refunds-model'], check: t => /^fixup! Add refund model/.test(t.head()?.message || '') && t.branch() === 'refunds-ui' },
          { title: 'Fold the fixup into the model commit; let the stack follow', hint: '`git rebase -i --autosquash origin/main`, then save the todo list as it is. Look for the update-ref lines.', solution: 'git rebase -i --autosquash origin/main (save as is)', test: [{ cmd: 'git rebase -i --autosquash origin/main', edit: c => c }], check: t => chainOK(t, 'origin/main') && /amountCents/.test(t.fileAt('refunds-model', 'src/refund.js') || '') && !t.commits().some(c => /^fixup!/.test(c.message)) },
          { title: 'Push the stack again, then merge PR #1 with a squash, deleting its branch', hint: 'Priya will approve once the fix is pushed. `gh pr merge 1 --squash --delete-branch`', solution: 'git push --force-with-lease origin refunds-model refunds-api refunds-ui && gh pr merge 1 --squash --delete-branch', test: ['git push --force-with-lease origin refunds-model refunds-api refunds-ui', { act: (H) => H.review('acme/payments', 1, 'APPROVED', 'Thanks, cents it is.', 'Priya Sharma'), label: 'Priya approves #1' }, 'gh pr merge 1 --squash --delete-branch'], check: t => { const prs = t.remote('acme/payments').meta.prs; return prs[0].state === 'merged' && prs.find(p => p.head === 'refunds-api')?.base === 'main'; } },
          { title: 'Main now has the squashed model commit. Move the rest of the stack onto it and push', hint: 'Replay only what comes after your old model branch: `git fetch && git rebase --onto origin/main refunds-model refunds-ui`, then force-push refunds-api and refunds-ui.', solution: 'git fetch && git rebase --onto origin/main refunds-model refunds-ui && git push --force-with-lease origin refunds-api refunds-ui', check: t => { const a = t.ref('refunds-api'); return !!a && t.world.commit(a).parents[0] === t.ref('origin/main') && t.world.commit(t.ref('refunds-ui')).parents[0] === a && t.remoteRef('acme/payments', 'refunds-ui') === t.ref('refunds-ui') && t.remoteRef('acme/payments', 'refunds-api') === a; } },
        ],
      },
      quiz: [
        { type: 'mc', q: 'You rebase the top branch of a three-branch stack with --update-refs. What happens to the two branches below it?', choices: ['They move to the rewritten copies of their commits', 'They stay on the old commits', 'They are deleted', 'They are merged into the top branch'], answer: 0, explain: 'Without it you would have to rebase each branch onto the next by hand.' },
        { type: 'type', q: 'Type the config command that turns --update-refs on for every rebase.', accept: ['git config --global rebase.updateRefs true', 'git config --global rebase.updaterefs true'], model: 'git config --global rebase.updateRefs true', explain: 'Use --no-update-refs on a single rebase to opt out.' },
        { type: 'mc', q: 'The bottom PR of a stack was squash-merged. Why does the next branch still show the old commit?', choices: ['A squash merge creates a brand-new commit on main; your branch still contains the original one', 'GitHub forgot to update it', 'Because rebase.updateRefs is on', 'The PR was not approved'], answer: 0, explain: 'git rebase --onto origin/main <old-bottom> <top> replays only the commits above it.' },
        { type: 'tf', q: 'When a merged PR\'s branch is deleted, GitHub retargets the PRs that were based on it to the merged PR\'s base.', answer: true, explain: 'So PR 2 now targets main, ready to review on its own.' },
        { type: 'mc', q: 'Where does a fixup for the bottom commit go when you work from the top of the stack?', choices: ['Commit it with --fixup <bottom commit>, then rebase -i --autosquash: git moves it into place and update-ref lines move the branches', 'You must check out the bottom branch and amend', 'In a new PR', 'In git stash'], answer: 0, explain: 'One rebase updates the whole stack.' },
        { type: 'mc', q: 'Why stack PRs at all?', choices: ['Small PRs get faster, better reviews while you keep building on top of them', 'GitHub requires it for big changes', 'It avoids CI', 'It makes history linear automatically'], answer: 0, explain: 'Each PR is one reviewable idea; the stack keeps you unblocked.' },
      ],
    },
    {
      id: 'merge-strategies',
      title: 'Picking a side on purpose',
      summary: '-X ours and -X theirs, per-file --ours and --theirs, and -s ours to record a merge without its changes.',
      minutes: 16,
      lab: {
        cwd: '~/shop-web',
        panels: ['graph', 'files', 'areas'],
        setup(H) {
          H.repo('~/shop-web');
          H.commit('Create shop', { 'locales/fr.json': FR_BASE, 'src/app.js': 'render();\n' });
          H.run('git switch -qc translations');
          H.commit('French: reviewed by the translation agency', { 'locales/fr.json': FR_THEIRS }, { author: 'Claire Martin <claire@agency.example>' });
          H.run('git switch -q main');
          H.run('git switch -qc old-experiment');
          H.commit('Experiment: new checkout flow', { 'src/checkout-v2.js': 'export const v2 = true;\n' });
          H.run('git switch -q main');
          H.commit('Checkout page title', { 'locales/fr.json': FR_MAIN, 'src/app.js': 'render();\nrenderCheckout();\n' });
          H.world.labData = { exp: H.shell.run('git rev-parse old-experiment', { record: false }).out[0] };
        },
        suggestions: ['git merge translations', 'git merge -X theirs translations'],
        tasks: [
          { title: 'Merge translations into main and see the conflict', solution: 'git merge translations', check: t => t.hasConflicts() && t.state() === 'merge' },
          { title: 'Back out of the merge', solution: 'git merge --abort', check: t => !t.state() && t.clean() },
          { title: 'Merge again, letting the translators win every conflicting hunk', hint: '`git merge -X theirs translations` (in a merge, "theirs" is the branch you merge in).', solution: 'git merge -X theirs translations', check: t => t.head()?.parents.length === 2 && /Mon panier/.test(t.headFile('locales/fr.json') || '') },
          { title: "Check your own new key survived: -X only decides conflicting hunks", hint: '`grep checkout.title locales/fr.json`', solution: 'grep checkout.title locales/fr.json', check: t => t.ran(/grep\b.*checkout\.title/) && /checkout\.title/.test(t.headFile('locales/fr.json') || '') },
          { title: 'Record old-experiment as merged without taking any of its changes', detail: 'The team abandoned it, but wants `git branch --merged` to stop listing it.', hint: '`git merge -s ours old-experiment -m "…"`', solution: 'git merge -s ours old-experiment -m "Record old-experiment as merged (abandoned)"', check: t => { const h = t.head(); return h?.parents.length === 2 && h.parents[1] === t.world.labData.exp && !t.inHead('src/checkout-v2.js'); } },
          { title: 'Confirm git now treats it as merged', solution: 'git branch --merged', check: t => t.ran(/git branch\b.*--merged/) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'During `git merge feature`, which side is "theirs"?', choices: ['feature, the branch being merged in', 'The current branch', 'origin', 'The merge base'], answer: 0, explain: 'In a rebase it flips: "theirs" is the commit being replayed.' },
        { type: 'tf', q: '`git merge -X ours other` throws away every change from `other`.', answer: false, explain: '-X ours only decides conflicting hunks; their clean changes still merge. `-s ours` is the one that ignores their tree.' },
        { type: 'type', q: 'Type the command to take the incoming branch\'s version of `package-lock.json` during a conflicted merge.', accept: ['git checkout --theirs package-lock.json', 'git restore --theirs package-lock.json'], model: 'git checkout --theirs package-lock.json', explain: 'Then git add it. For lock files, regenerating with npm install is often even better.' },
        { type: 'mc', q: 'What does `git merge -s ours old-branch` produce?', choices: ['A merge commit whose tree is exactly yours, so old-branch counts as merged', 'A fast-forward to old-branch', 'Nothing: it is invalid', "A commit with only old-branch's files"], answer: 0, explain: 'Useful for superseded branches, or to keep a release line from re-merging a change.' },
        { type: 'mc', q: 'When is `-X theirs` a poor choice?', choices: ['When both sides made meaningful changes to the same lines and you need a combination', 'When merging translations', 'When the branch is small', 'When CI is green'], answer: 0, explain: 'It picks a side per hunk; it never combines. Real logic conflicts still need a person.' },
      ],
    },
    {
      id: 'identities',
      title: 'One laptop, two identities',
      summary: 'Automatic work and personal emails with includeIf, fixing commits made as the wrong person, and .mailmap.',
      minutes: 18,
      lab: {
        cwd: '~/work/acme-api',
        panels: ['graph', 'files'],
        setup(H) {
          H.remote('acme', 'api', [{ message: 'Create API', files: { 'server.js': 'listen(8080);\n' } }], { collaborators: ['you'] });
          H.remote('you', 'tinylib', [
            { message: 'Create tinylib', files: { 'index.js': 'export {};\n' }, author: { name: 'Dev Learner', email: 'dev@example.com' } },
            { message: 'Add docs', files: { 'README.md': '# tinylib\n' }, author: { name: 'Sam Lee', email: 'sam@old-isp.example' } },
            { message: 'Fix typo', files: { 'README.md': '# tinylib\n\nA tiny library.\n' }, author: { name: 'sam', email: 'sam@laptop.local' } },
            { message: 'Add tests', files: { 'test.js': 'ok();\n' }, author: { name: 'Sam Lee', email: 'sam.lee@example.org' } },
          ], { collaborators: ['you'] });
          H.world.github.authed = true;
          H.run('mkdir -p ~/work ~/oss');
          H.cd('~/work');
          H.run('git clone -q https://github.com/acme/api.git acme-api');
          H.cd('~/oss');
          H.run('git clone -q https://github.com/you/tinylib.git');
          H.cd('~/work/acme-api');
          H.commit('Add health check', { 'health.js': 'export const ok = true;\n' });
          H.commit('Add readiness probe', { 'ready.js': 'export const ready = true;\n' });
        },
        suggestions: ['git config --show-origin user.email', 'git config --file ~/.gitconfig-work user.email dev@acme.example'],
        tasks: [
          { title: 'See which email this work repository uses, and which file it comes from', solution: 'git config --show-origin user.email', check: t => t.ran(/git config\b.*--show-origin\b.*user\.email/) },
          { title: 'Create ~/.gitconfig-work holding your work email, dev@acme.example', hint: '`git config --file ~/.gitconfig-work user.email dev@acme.example`', solution: 'git config --file ~/.gitconfig-work user.email dev@acme.example', check: t => /email = dev@acme\.example/.test(t.world.files.get(t.world.home + '/.gitconfig-work') || '') },
          { title: 'Include that file for every repository under ~/work/', hint: '`git config --global includeIf.gitdir:~/work/.path ~/.gitconfig-work` (the trailing slash means "everything inside").', solution: 'git config --global includeIf.gitdir:~/work/.path ~/.gitconfig-work', check: t => Object.entries(t.world.globalConfig).some(([k, v]) => /^includeif\.gitdir:~\/work\/\.path$/i.test(k) && /\.gitconfig-work$/.test(v)) },
          { title: 'Confirm this repository now picks up the work email', solution: 'git config user.email', check: t => configGet(t.repo, 'user.email') === 'dev@acme.example' && ranAfter(t, /includeIf/i, /git config\b.*user\.email/) },
          { title: 'Re-author your two unpushed commits with the work email', hint: '`git rebase origin/main --exec "git commit --amend --no-edit --reset-author"` (or -x).', solution: 'git rebase origin/main --exec "git commit --amend --no-edit --reset-author"', check: t => { const list = revList(t.world, [t.headHash()], [t.ref('origin/main')]); return list.length === 2 && list.every(h => t.world.commit(h).author.email === 'dev@acme.example'); } },
          { title: 'Push them', solution: 'git push', check: t => t.remoteRef('acme/api', 'main') === t.headHash() },
          { title: 'In ~/oss/tinylib, Sam shows up three times in the shortlog. Add a .mailmap so they count as one person, and commit it', detail: 'Map sam@old-isp.example and sam@laptop.local to `Sam Lee <sam.lee@example.org>`.', hint: 'One line per old email: `Sam Lee <sam.lee@example.org> <sam@old-isp.example>`. Check with `git shortlog -sne`.', solution: 'cd ~/oss/tinylib, write .mailmap, git add .mailmap && git commit -m "Add .mailmap"', test: ['cd ~/oss/tinylib', 'printf "Sam Lee <sam.lee@example.org> <sam@old-isp.example>\\nSam Lee <sam.lee@example.org> <sam@laptop.local>\\n" > .mailmap', 'git shortlog -sne', 'git add .mailmap && git commit -qm "Add .mailmap"'], check: t => { const r = t.repoAt('~/oss/tinylib'); if (!r) return false; const f = t.headFile('.mailmap', r) || ''; if (!f) return false; const mm = mailmapFor(r); return mm({ name: 'sam', email: 'sam@laptop.local' }).email === 'sam.lee@example.org' && mm({ name: 'Sam Lee', email: 'sam@old-isp.example' }).email === 'sam.lee@example.org'; } },
        ],
      },
      quiz: [
        { type: 'type', q: 'Type the global setting that includes `~/.gitconfig-work` for every repository under `~/work/`.', accept: ['git config --global includeIf.gitdir:~/work/.path ~/.gitconfig-work', 'git config --global includeif.gitdir:~/work/.path ~/.gitconfig-work'], model: 'git config --global includeIf.gitdir:~/work/.path ~/.gitconfig-work', explain: 'Or edit ~/.gitconfig: [includeIf "gitdir:~/work/"] path = ~/.gitconfig-work' },
        { type: 'mc', q: 'Which command tells you where a config value comes from?', choices: ['git config --show-origin user.email', 'git config --where user.email', 'git var user.email', 'git log --show-origin'], answer: 0, explain: 'Invaluable when several files set the same key.' },
        { type: 'mc', q: 'Which condition picks the work identity for any clone of your employer\'s GitHub organisation, wherever it lives on disk?', choices: ['includeIf "hasconfig:remote.*.url:https://github.com/acme/**"', 'includeIf "gitdir:~/work/"', 'includeIf "onbranch:main"', 'includeIf "user:acme"'], answer: 0, explain: 'It matches on the remote URL instead of the folder.' },
        { type: 'tf', q: '.mailmap rewrites the author stored in old commits.', answer: false, explain: 'It only changes how log, shortlog, blame and check-mailmap display them. History stays untouched.' },
        { type: 'mc', q: 'You made three unpushed commits with your personal email. What fixes them?', choices: ['git rebase <upstream> --exec "git commit --amend --no-edit --reset-author"', 'git config user.email and push', 'Adding a .mailmap', 'git revert the three commits'], answer: 0, explain: 'Fix the config first, then re-author. Once pushed, prefer leaving history alone and using .mailmap.' },
      ],
    },
    {
      id: 'housekeeping',
      title: 'Keeping a repository healthy',
      summary: 'Loose objects and packs, gc and background maintenance, and really deleting what the reflog keeps alive.',
      minutes: 16,
      lab: {
        cwd: '~/monolith',
        panels: ['graph', 'files'],
        setup(H) {
          H.repo('~/monolith');
          busyHistory(H, 24);
          H.commit('Add database dump for debugging', { 'dump.sql': "INSERT INTO users VALUES ('ana@example.org', 'hunter2');\n" });
          H.world.labData = { dump: H.shell.run('git rev-parse HEAD', { record: false }).out[0] };
        },
        suggestions: ['git count-objects -vH', 'git gc'],
        tasks: [
          { title: 'See how many loose objects the repository holds', solution: 'git count-objects -vH', check: t => t.ran(/git count-objects/) },
          { title: 'Pack them into one compressed pack file', solution: 'git gc', check: t => t.events('gc').length > 0 },
          { title: 'Let git keep this repository tidy in the background from now on', hint: '`git maintenance start` registers the repo and schedules hourly and daily tasks.', solution: 'git maintenance start', check: t => String(t.world.globalConfig['maintenance.repo'] || '').split('\n').includes(t.repo.root) && t.world.globalConfig['maintenance.scheduled'] === 'true' },
          { title: 'The last commit contains real user data. Remove it from the branch', solution: 'git reset --hard HEAD~1', check: t => !t.inHead('dump.sql') && t.headHash() !== t.world.labData.dump },
          { title: 'The reflog still keeps that commit alive. Expire every reflog entry now', solution: 'git reflog expire --expire=now --all', check: t => t.events('reflog-expire').length > 0 && Object.values(t.repo.reflog).every(l => !l.some(e => e.new === t.world.labData.dump)) },
          { title: 'Find the now-unreachable commit', solution: 'git fsck', check: t => t.ran(/git fsck/) && ranAfter(t, /reflog expire/, /git fsck/) },
          { title: 'Delete unreachable objects right away instead of in two weeks', solution: 'git gc --prune=now', check: t => t.events('gc').some(e => e.prune) && !reachableObjects(t.repo).has(t.world.labData.dump) && !(t.repo.dangling || new Set()).has(t.world.labData.dump) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What does `git gc` do?', choices: ['Packs loose objects into compressed pack files and prunes old unreachable objects', 'Deletes old branches', 'Pushes to a backup server', 'Rewrites history to save space'], answer: 0, explain: 'It runs automatically now and then (gc --auto); maintenance runs it on a schedule.' },
        { type: 'tf', q: 'After `git reset --hard HEAD~1`, the dropped commit is gone from your disk immediately.', answer: false, explain: 'The reflog keeps it reachable (that is how you undo mistakes). Expire the reflog and gc --prune=now to really remove it.' },
        { type: 'type', q: 'Type the command that turns on scheduled background maintenance for the current repository.', accept: ['git maintenance start'], model: 'git maintenance start', explain: 'Prefetch and commit-graph hourly, loose-objects and incremental-repack daily, pack-refs weekly.' },
        { type: 'mc', q: 'You removed a leaked password from local history. Is it now safe?', choices: ["No: if it was ever pushed, rotate the secret: clones, forks and caches still have it", 'Yes, after gc --prune=now', 'Yes, once the reflog is expired', 'Yes, if the repository is private'], answer: 0, explain: 'Cleaning history limits spread; rotating the credential is what makes you safe.' },
        { type: 'mc', q: 'What does `git count-objects -vH` report as "count"?', choices: ['The number of loose (unpacked) objects', 'The number of commits', 'The number of branches', 'The number of files in HEAD'], answer: 0, explain: '"in-pack" counts the packed ones; size-pack is the pack size on disk.' },
      ],
    },
    {
      id: 'bundles-archives',
      title: 'Moving history without a server',
      summary: 'git bundle for air-gapped machines and offline backups; git archive for clean release tarballs.',
      minutes: 18,
      lab: {
        cwd: '~/firmware',
        panels: ['graph', 'files'],
        setup(H) {
          H.repo('~/firmware');
          H.commit('Create firmware', { 'src/main.c': 'int main(void) { return 0; }\n', 'Makefile': 'all:\n\tcc src/main.c\n', 'tests/test_main.c': 'void test(void) {}\n', '.github/workflows/ci.yml': 'on: push\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - run: make\n' });
          H.commit('Add sensor driver', { 'src/sensor.c': 'int read_sensor(void) { return 42; }\n' });
          H.run('git tag -a v2.0 -m "Firmware 2.0"');
          H.run('mkdir -p ~/usb ~/lab');
        },
        suggestions: ['git bundle create ~/usb/firmware.bundle --all', 'git bundle verify ~/usb/firmware.bundle'],
        tasks: [
          { title: 'Put the whole repository, with every branch and tag, in one file on the USB stick', solution: 'git bundle create ~/usb/firmware.bundle --all', check: t => { const b = bundleAt(t, '~/usb/firmware.bundle'); return !!b && b.refs.some(r => r.ref === 'refs/heads/main') && b.refs.some(r => r.ref === 'refs/tags/v2.0') && !b.prereqs.length; } },
          { title: 'Check the bundle is complete and readable', solution: 'git bundle verify ~/usb/firmware.bundle', check: t => t.ran(/git bundle verify/) },
          { title: 'On the air-gapped lab machine (~/lab), clone from the bundle', solution: 'cd ~/lab && git clone ~/usb/firmware.bundle', check: t => { const r = t.repoAt('~/lab/firmware'); return !!r && t.headHash(r) === t.ref('main', t.repoAt('~/firmware')); } },
          { title: 'Back in ~/firmware, commit a fix, then bundle only the commits since v2.0', hint: 'Any change will do, for example a comment in src/sensor.c. Then `git bundle create ~/usb/update.bundle v2.0..main`.', solution: 'cd ~/firmware, edit src/sensor.c, git commit -am "Fix sensor timeout", git bundle create ~/usb/update.bundle v2.0..main', test: ['cd ~/firmware', 'echo "/* timeout: 50 ms */" >> src/sensor.c', 'git commit -qam "Fix sensor timeout"', 'git bundle create ~/usb/update.bundle v2.0..main'], check: t => { const b = bundleAt(t, '~/usb/update.bundle'); return !!b && b.prereqs.length > 0 && b.refs.some(r => r.hash === t.ref('main', t.repoAt('~/firmware'))); } },
          { title: 'On the lab machine, pull the update from the bundle', solution: 'cd ~/lab/firmware && git pull ~/usb/update.bundle main', check: t => { const r = t.repoAt('~/lab/firmware'); return !!r && t.headHash(r) === t.ref('main', t.repoAt('~/firmware')); } },
          { title: 'Back in ~/firmware: keep tests and CI config out of release archives, and commit that rule', hint: 'In .gitattributes: `/tests export-ignore` and `/.github export-ignore`.', solution: 'cd ~/firmware, write .gitattributes, git add .gitattributes && git commit -m "Keep tests and CI out of release archives"', test: ['cd ~/firmware', 'printf "/tests export-ignore\\n/.github export-ignore\\n" > .gitattributes', 'git add .gitattributes && git commit -qm "Keep tests and CI out of release archives"'], check: t => { const r = t.repoAt('~/firmware'); const a = t.headFile('.gitattributes', r) || ''; return /^\/?tests\/?(\*\*)?\s+export-ignore/m.test(a) && /^\/?\.github\/?(\*\*)?\s+export-ignore/m.test(a); } },
          { title: 'Tag v2.1 and write firmware-2.1.tar.gz to the USB stick, with everything inside a firmware-2.1/ folder', hint: '`git tag -a v2.1 -m "Firmware 2.1"`, then `git archive --format=tar.gz --prefix=firmware-2.1/ -o ~/usb/firmware-2.1.tar.gz v2.1`', solution: 'git tag -a v2.1 -m "Firmware 2.1" && git archive --format=tar.gz --prefix=firmware-2.1/ -o ~/usb/firmware-2.1.tar.gz v2.1', check: t => { const a = archiveAt(t, '~/usb/firmware-2.1.tar.gz'); return !!a && a.format === 'tar.gz' && a.entries.length > 0 && a.entries.every(e => e.path.startsWith('firmware-2.1/')) && !a.entries.some(e => /\/(tests|\.github)\//.test(e.path)) && a.entries.some(e => /src\/sensor\.c$/.test(e.path)); } },
          { title: 'List what is inside the tarball', solution: 'tar -tzf ~/usb/firmware-2.1.tar.gz', check: t => t.ran(/tar\s+-?t\w*\s/) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What is a git bundle?', choices: ['A single file holding commits and refs that you can clone, fetch or pull from', 'A zip of the working directory', 'A GitHub release asset', 'A packed list of branches only'], answer: 0, explain: 'Perfect for air-gapped networks, USB transfer and offline backups.' },
        { type: 'type', q: 'Type the command that writes only the commits after tag v1.0 on main to `update.bundle`.', accept: ['git bundle create update.bundle v1.0..main'], model: 'git bundle create update.bundle v1.0..main', explain: 'The receiver must already have v1.0; git bundle verify checks the prerequisites.' },
        { type: 'mc', q: 'How do you keep `tests/` out of `git archive` output?', choices: ['Add "/tests export-ignore" to .gitattributes (committed)', 'Add tests/ to .gitignore', 'Delete the folder before archiving', 'Pass --exclude tests'], answer: 0, explain: 'archive reads attributes from the tree it archives, so commit the rule.' },
        { type: 'tf', q: '`git archive` includes the .git directory, so the tarball can be used as a repository.', answer: false, explain: 'It only contains the files of one tree, which is exactly what a release download should be.' },
        { type: 'mc', q: 'Why use --prefix=app-1.2/ with git archive?', choices: ['So the files unpack into one app-1.2 folder instead of spilling into the current directory', 'It is required for tar.gz', 'It signs the archive', 'It sets the version in package.json'], answer: 0, explain: 'Matches what users expect from a source tarball.' },
      ],
    },
    {
      id: 'everyday-boss',
      title: 'Boss: Monday at the platform team',
      summary: 'A week of loose ends in one sitting: identity, archaeology, a stack, a merge, housekeeping and a release.',
      minutes: 25,
      boss: true,
      lab: {
        cwd: '~/work/platform',
        panels: ['graph', 'github', 'files'],
        setup(H) {
          H.remote('acme', 'platform', [
            { message: 'Create platform', files: { 'config.js': 'export const retries = 3;\nexport const timeoutMs = 5000;\n', 'locales/de.json': DE_BASE, 'README.md': '# platform\n' }, author: { name: 'Ana Silva', email: 'ana@example.org' } },
            { message: 'Lower the timeout', files: { 'config.js': 'export const retries = 3;\nexport const timeoutMs = 500;\n' }, author: { name: 'Kim Park', email: 'kim@example.org' } },
            { message: 'Update README', files: { 'README.md': '# platform\n\nShared services.\n' }, author: { name: 'Ana Silva', email: 'ana@example.org' } },
          ], { collaborators: ['you'] });
          H.world.github.authed = true;
          H.run('mkdir -p ~/work');
          H.cd('~/work');
          H.run('git clone -q https://github.com/acme/platform.git');
          H.cd('~/work/platform');
          H.run('git switch -qc i18n-de');
          H.commit('German: reviewed wording', { 'locales/de.json': DE_THEIRS }, { author: 'Lena Vogel <lena@agency.example>' });
          H.run('git switch -q main');
          H.commit('German: add delete', { 'locales/de.json': DE_MAIN });
          H.world.labData = { timeout: H.shell.run('git rev-parse origin/main~1', { record: false }).out[0] };
        },
        tasks: [
          { title: 'Make every repository under ~/work/ commit as dev@acme.example', hint: 'A ~/.gitconfig-work file with user.email, and an includeIf.gitdir:~/work/ include.', solution: 'git config --file ~/.gitconfig-work user.email dev@acme.example && git config --global includeIf.gitdir:~/work/.path ~/.gitconfig-work', check: t => configGet(t.repo, 'user.email') === 'dev@acme.example' },
          { title: 'Re-author the unpushed commit on main with that email', solution: 'git commit --amend --no-edit --reset-author', check: t => t.head().author.email === 'dev@acme.example' && t.head().message.startsWith('German: add delete') },
          { title: 'Requests keep timing out. Find the commit that changed `timeoutMs = 5000`', solution: 'git log -S "timeoutMs = 5000" --oneline', check: t => t.ran(/git log\b.*-S/) },
          { title: 'Revert it', solution: 'git revert --no-edit <that commit>', test: [t => `git revert --no-edit ${t.world.labData.timeout.slice(0, 7)}`], check: t => /timeoutMs = 5000/.test(t.headFile('config.js') || '') && /^Revert "Lower the timeout"/.test(t.head().message) },
          { title: "Merge i18n-de, letting the agency's wording win conflicting hunks", solution: 'git merge -X theirs i18n-de -m "Merge reviewed German"', check: t => t.head().parents.length === 2 && /Sichern/.test(t.headFile('locales/de.json') || '') && /Löschen/.test(t.headFile('locales/de.json') || '') },
          { title: 'Push main', solution: 'git push', check: t => t.remoteRef('acme/platform', 'main') === t.headHash() },
          { title: 'Tag v1.4 and write platform-1.4.zip (inside a platform-1.4/ folder) to your home directory', solution: 'git tag -a v1.4 -m "Platform 1.4" && git archive --prefix=platform-1.4/ -o ~/platform-1.4.zip v1.4', check: t => { const a = archiveAt(t, '~/platform-1.4.zip'); return !!a && a.format === 'zip' && a.entries.every(e => e.path.startsWith('platform-1.4/')) && t.ref('v1.4') === t.headHash(); } },
          { title: 'Back up every branch and tag to ~/platform.bundle', solution: 'git bundle create ~/platform.bundle --all', check: t => { const b = bundleAt(t, '~/platform.bundle'); return !!b && b.refs.some(r => r.ref === 'refs/tags/v1.4') && b.refs.some(r => r.ref === 'refs/heads/i18n-de'); } },
          { title: 'Finish with a gc', solution: 'git gc', check: t => t.events('gc').length > 0 },
        ],
      },
      quiz: [
        { type: 'mc', q: 'A teammate asks why blame says the formatter wrote every line. What do you set up?', choices: ['.git-blame-ignore-revs listing the formatter commit, plus blame.ignoreRevsFile', 'A .mailmap', 'rerere', 'git gc'], answer: 0, explain: 'GitHub honours the same file.' },
        { type: 'mc', q: 'Which pair is right?', choices: ['-X theirs decides conflicting hunks; -s ours ignores the other tree completely', 'Both ignore the other tree', '-X theirs is only for rebase', '-s ours resolves conflicts in your favour but keeps their clean changes'], answer: 0, explain: 'Strategy (-s) versus strategy option (-X).' },
        { type: 'mc', q: 'Your stack is refunds-model → refunds-api → refunds-ui, and main moved. The quickest correct update?', choices: ['git rebase --update-refs origin/main from refunds-ui, then push all three with --force-with-lease', 'Merge main into each branch', 'Rebase each branch separately, bottom first', 'Delete and recreate the PRs'], answer: 0, explain: 'One rebase, every branch moves.' },
        { type: 'tf', q: 'A .mailmap is the right fix for commits you already pushed under an old email.', answer: true, explain: 'Rewriting published history to change an email causes more trouble than it solves.' },
        { type: 'mc', q: 'Which travels in a git bundle?', choices: ['Commits, trees, blobs and the refs you name', 'Only the working tree', 'Only tags', 'GitHub issues and PRs'], answer: 0, explain: 'GitHub data (issues, PRs) is not part of the repository.' },
      ],
    },
  ],
};
