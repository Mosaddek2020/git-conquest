// Realm 11 · GitHub Automation: Actions, CI checks, secrets, Dependabot, Pages.

import { parseWorkflow } from '../git/github.js';

const CI_YML = 'name: CI\non:\n  push:\n    branches: [main]\n  pull_request:\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n      - run: npm ci\n      - run: npm test\n';
const CI_LINT_YML = CI_YML.replace('      - run: npm test\n', '      - run: npm run lint\n      - run: npm test\n');

const wfOk = (text, needs = ['npm test']) => {
  if (!text) return false;
  const wf = parseWorkflow(text);
  const runs = wf.jobs.flatMap(j => j.steps.map(s => s.run || ''));
  return !wf.errors.length && needs.every(n => runs.some(r => r.includes(n)));
};
const latestRun = (t, owner) => t.remote(owner)?.meta.runs[0] || null;
const prRuns = (t, owner, pred) => { const b = t.remote(owner); if (!b) return []; const pr = b.meta.prs.find(pred); return pr ? b.meta.runs.filter(r => r.pr === pr.number || (r.branch === pr.head && r.event === 'pull_request')) : []; };
const autoApprove = (owner) => (ev, t) => {
  if (ev.type === 'pr-created' && ev.url === `https://github.com/${owner}.git`) {
    t.review(owner, ev.number, 'APPROVED', 'Looks good once CI is green.', 'Priya Sharma');
    t.say(`[GitHub] Priya Sharma approved #${ev.number} (merge still needs a green CI check).`);
  }
};

export default {
  id: 'automation',
  n: 11,
  title: 'GitHub Automation',
  tagline: 'Actions, required checks, secrets and security',
  badge: 'Automaton Wrangler',
  intro: 'Let GitHub do the boring, critical work for you. Write **GitHub Actions** workflows, gate merges on **required checks**, keep credentials in **secrets** (and know what to do when one leaks), and turn on **Dependabot**.',
  lessons: [
    {
      id: 'actions-basics',
      title: 'GitHub Actions basics',
      summary: 'Workflows, events, jobs and steps: run your tests on every push.',
      minutes: 18,
      lab: {
        cwd: '~/notes-app',
        panels: ['github', 'files'],
        setup(H) {
          H.remote('you', 'notes-app', [{ message: 'Create notes app', files: { 'package.json': '{ "name": "notes-app", "scripts": { "test": "jest", "lint": "eslint ." } }\n', 'app.js': 'export const notes = [];\n' } }]);
          H.cd('~');
          H.run('git clone -q https://github.com/you/notes-app.git');
          H.cd('~/notes-app');
        },
        suggestions: ['mkdir -p .github/workflows', 'edit .github/workflows/ci.yml'],
        tasks: [
          { title: 'Create the workflows folder', solution: 'mkdir -p .github/workflows', check: t => t.world.isDir(t.shell.resolvePath('~/notes-app/.github/workflows')) },
          { title: 'Write .github/workflows/ci.yml: on push and pull_request, one job on ubuntu-latest that checks out the code, runs npm ci and npm test', hint: 'Copy the example from the Mental Model lens. Indent with spaces.', solution: 'edit .github/workflows/ci.yml', test: [{ cmd: 'edit .github/workflows/ci.yml', edit: CI_YML }], check: t => { const txt = t.file('~/notes-app/.github/workflows/ci.yml'); return wfOk(txt) && /push/.test(txt) && /pull_request/.test(txt); } },
          { title: 'Commit and push it, and watch it run', solution: 'git add .github && git commit -m "ci: run tests on every push" && git push', check: t => latestRun(t, 'you/notes-app')?.conclusion === 'success' },
          { title: 'List the workflow runs', solution: 'gh run list', check: t => t.ran(/^gh run list/) },
          { title: 'Add a lint step (npm run lint) and a console.log line in app.js, then push: the run should fail', solution: 'edit the workflow, then: echo "console.log(notes);" >> app.js && git commit -am "ci: add lint step" && git push', test: [{ cmd: 'edit .github/workflows/ci.yml', edit: CI_LINT_YML }, 'echo "console.log(notes);" >> app.js && git commit -am "ci: add lint step" && git push'], check: t => latestRun(t, 'you/notes-app')?.conclusion === 'failure' && wfOk(t.file('~/notes-app/.github/workflows/ci.yml'), ['npm run lint']) },
          { title: 'Read the failing run\'s log', solution: 'gh run view', check: t => t.ran(/^gh run view/) },
          { title: 'Remove the console.log, commit, push: back to green', solution: 'echo "export const notes = [];" > app.js && git commit -am "fix: remove debug logging" && git push', check: t => latestRun(t, 'you/notes-app')?.conclusion === 'success' && t.history.some(l => /gh run view/.test(l)) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'Where must workflow files live?', choices: ['In the repository root', 'In .github/workflows/', 'In .git/hooks/', 'In GitHub Settings only'], answer: 1, explain: 'YAML files in .github/workflows/.' },
        { type: 'mc', q: 'What does `on: pull_request` mean?', choices: ['Run when a PR is merged only', 'Run for pull request activity (opened, new commits pushed…)', 'Run every hour', 'Run on every branch push'], answer: 1, explain: 'Each push to the PR branch triggers a new run.' },
        { type: 'multi', q: 'What can a step do?', choices: ['uses: a reusable action like actions/checkout@v4', 'run: shell commands like npm test', 'Merge PRs on its own without permissions', 'Read secrets via ${{ secrets.NAME }}'], answer: [0, 1, 3], explain: 'Steps use actions or run commands.' },
        { type: 'mc', q: 'Why is `actions/checkout` usually the first step?', choices: ['It installs Node', 'The runner starts empty; checkout puts your repository code on it', 'It approves the PR', 'It is required by YAML'], answer: 1, explain: 'Fresh machine, no code until checkout.' },
        { type: 'tf', q: 'Jobs in the same workflow run in sequence by default.', answer: false, explain: 'In parallel by default; use needs: to order them.' },
        { type: 'type', q: 'Type the gh command that lists recent workflow runs.', accept: ['gh run list'], model: 'gh run list', explain: 'gh run view shows one run.' },
      ],
    },
    {
      id: 'ci-checks',
      title: 'Required checks on pull requests',
      summary: 'Status checks, required checks, and fixing a red build before merging.',
      minutes: 16,
      lab: {
        cwd: '~',
        panels: ['github', 'graph'],
        setup(H) {
          H.world.testRule = files => (!files['discount.js'] || /p \* 0\.9/.test(files['discount.js'])) ? { ok: true, log: ['PASS discount(100) === 90'] } : { ok: false, log: ['FAIL discount(100): expected 90, got 10'] };
          H.remote('acme', 'api', [{ message: 'Create API with CI', files: { 'server.js': 'export const routes = [];\n', '.github/workflows/ci.yml': CI_YML } }], { collaborators: ['you'] });
          H.protect('acme/api', 'main', { requirePR: true, requiredReviews: 1, requireChecks: true });
        },
        events: autoApprove('acme/api'),
        tasks: [
          { title: 'Clone acme/api and create the branch feature/discount', solution: 'git clone https://github.com/acme/api.git && cd api && git switch -c feature/discount', check: t => !!t.repoAt('~/api') && t.branch() === 'feature/discount' },
          { title: 'Commit the first version of discount.js exactly as given, push, and open a PR', detail: '`export const discount = p => p * 0.1;` (yes, it has a bug).', solution: 'echo "export const discount = p => p * 0.1;" > discount.js && git add discount.js && git commit -m "feat: add discount" && git push -u origin feature/discount && gh pr create --fill', check: t => prRuns(t, 'acme/api', p => p.head === 'feature/discount').some(r => r.conclusion === 'failure') },
          { title: 'Check the PR\'s status checks', solution: 'gh pr checks', check: t => t.ran(/^gh pr (checks|view)/) },
          { title: 'Try to merge, and read why it is blocked', solution: 'gh pr merge --squash', check: t => t.ran(/^gh pr merge/) && (t.remote('acme/api').meta.prs.find(p => p.head === 'feature/discount')?.state === 'open') },
          { title: 'Fix the discount (p * 0.9), commit and push', solution: 'echo "export const discount = p => p * 0.9;" > discount.js && git commit -am "fix: apply a 10% discount, not 90%" && git push', check: t => { const runs = prRuns(t, 'acme/api', p => p.head === 'feature/discount'); return runs[0]?.conclusion === 'success'; } },
          { title: 'Merge the green, approved PR', solution: 'gh pr merge --squash --delete-branch', check: t => t.remote('acme/api').meta.prs.some(p => p.head === 'feature/discount' && p.state === 'merged') },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What does a required status check do?', choices: ['Runs only after merging', 'Blocks merging until that check passes on the PR\'s latest commit', 'Approves the PR', 'Deletes failing branches'], answer: 1, explain: 'Configured in branch protection.' },
        { type: 'mc', q: 'Your PR\'s check is red. Best first step?', choices: ['Ask an admin to bypass it', 'Read the run log and reproduce the failure locally', 'Re-run it until it passes', 'Close the PR'], answer: 1, explain: 'Understand, fix, push.' },
        { type: 'tf', q: 'After you push a fix to the PR branch, the checks run again automatically.', answer: true, explain: 'pull_request workflows run for every new commit.' },
        { type: 'type', q: 'Type the gh command that shows the checks of the current branch\'s PR.', accept: ['gh pr checks'], model: 'gh pr checks', explain: 'Or gh pr view.' },
        { type: 'multi', q: 'What makes CI pleasant to work with?', choices: ['Fast runs', 'Reliable (non-flaky) tests', 'Commands you can run locally too', 'Admin overrides for every merge'], answer: [0, 1, 2], explain: 'Overrides defeat the purpose.' },
      ],
    },
    {
      id: 'pages-security',
      title: 'Secrets, security and Pages',
      summary: 'Actions secrets, leaked-key response, Dependabot, secret scanning, and GitHub Pages.',
      minutes: 16,
      lab: {
        cwd: '~/shopfront',
        panels: ['github', 'files'],
        setup(H) {
          H.remote('you', 'shopfront', [
            { message: 'Create shopfront', files: { 'package.json': '{ "name": "shopfront" }\n', 'index.js': 'import { key } from "./config.js";\n' } },
            { message: 'Add payment config', files: { 'config.js': 'export const key = "sk_' + 'live_51HxQpay7d9F2kTq";\n' } },
            { message: 'Add product page', files: { 'product.html': '<h1>Product</h1>\n' } },
          ]);
          H.cd('~');
          H.run('git clone -q https://github.com/you/shopfront.git');
          H.cd('~/shopfront');
          H.world.labData = {};
          H.shell.extraCommands.payments = (args, out, sh) => {
            if (args[0] === 'rotate-key') {
              sh.world.labData.rotated = true;
              out.push('Revoked key sk_' + 'live_51HxQ…kTq', 'New key: sk_' + 'live_77NeWkeY3Xr9 (shown once: store it somewhere safe)');
              return 0;
            }
            out.push('usage: payments rotate-key');
            return 1;
          };
        },
        suggestions: ['git log -S "sk_live" --oneline'],
        tasks: [
          { title: 'Find the commit that introduced the live key', solution: 'git log -S "sk_live" --oneline', check: t => t.ran(/^git log\b.*-S\s*"?sk_live/) },
          { title: 'Rotate the key first (the simulated payment provider CLI is called payments)', solution: 'payments rotate-key', check: t => !!t.world.labData.rotated },
          { title: 'Make config.js read the key from process.env.PAYMENT_KEY, ignore .env, and commit', solution: 'echo "export const key = process.env.PAYMENT_KEY;" > config.js && echo ".env" >> .gitignore && git add config.js .gitignore && git commit -m "fix: read the payment key from the environment"', check: t => /process\.env\.PAYMENT_KEY/.test(t.headFile('config.js') || '') && !/sk_live/.test(t.headFile('config.js') || '') && /\.env/.test(t.headFile('.gitignore') || '') },
          { title: 'Store the new key as an Actions secret named PAYMENT_KEY', solution: 'gh secret set PAYMENT_KEY --body "sk_' + 'live_77NeWkeY3Xr9"', check: t => !!t.remote('you/shopfront').meta.secrets?.PAYMENT_KEY },
          { title: 'Add .github/dependabot.yml for weekly npm updates, commit and push', solution: 'mkdir -p .github && edit .github/dependabot.yml && git add .github && git commit -m "chore: enable Dependabot" && git push', test: ['mkdir -p .github', { cmd: 'edit .github/dependabot.yml', edit: 'version: 2\nupdates:\n  - package-ecosystem: "npm"\n    directory: "/"\n    schedule:\n      interval: "weekly"\n' }, 'git add .github && git commit -m "chore: enable Dependabot" && git push'], check: t => { const b = t.remote('you/shopfront'); const flat = t.world.readTreeFlat(t.world.commit(b.refs['refs/heads/main']).tree); const h = flat.get('.github/dependabot.yml'); return !!h && /package-ecosystem/.test(t.world.objects.get(h).content) && flat.has('config.js') && /process\.env/.test(t.world.objects.get(flat.get('config.js')).content); } },
          { title: 'List the repository secrets', solution: 'gh secret list', check: t => t.ran(/^gh secret list/) },
        ],
      },
      quiz: [
        { type: 'order', q: 'A live API key was pushed to a public repo. Order the response.', items: ['Rotate (revoke) the key', 'Check the provider logs for misuse', 'Remove it from the code and read it from the environment', 'Store the new key in a secret store'], explain: 'Rotation first: the old key must be assumed stolen.' },
        { type: 'mc', q: 'How does a workflow use a secret named API_TOKEN?', choices: ['Hard-code it in the YAML', '${{ secrets.API_TOKEN }}', 'Read it from the README', 'git config secret.API_TOKEN'], answer: 1, explain: 'Usually passed as an env variable to a step.' },
        { type: 'tf', q: 'Deleting a secret in a new commit removes it from the repository\'s history.', answer: false, explain: 'It remains in history and in every clone.' },
        { type: 'mc', q: 'What does Dependabot version updates do?', choices: ['Deletes old branches', 'Opens PRs to update outdated dependencies', 'Scans commit messages', 'Hosts websites'], answer: 1, explain: 'Configured in .github/dependabot.yml.' },
        { type: 'mc', q: 'What is GitHub Pages?', choices: ['A wiki', 'Free hosting for static websites built from a repository', 'A package registry', 'A CI runner'], answer: 1, explain: 'Served at <user>.github.io/<repo>.' },
        { type: 'mc', q: 'What does push protection do?', choices: ['Blocks force pushes', 'Blocks pushes that contain detected secrets', 'Requires 2FA', 'Prevents deleting branches'], answer: 1, explain: 'It stops the leak before it lands.' },
      ],
    },
    {
      id: 'automation-boss',
      title: 'Boss: Green builds only',
      summary: 'Add CI to a protected repository, get it green, ship a feature through the gate, and store a secret.',
      minutes: 25,
      boss: true,
      lab: {
        cwd: '~',
        panels: ['github', 'files', 'graph'],
        setup(H) {
          H.world.testRule = files => (!files['ping.js'] || /pong/.test(files['ping.js'])) ? { ok: true, log: ['PASS ping() === "pong"'] } : { ok: false, log: ['FAIL ping(): expected "pong"'] };
          H.remote('sparrow', 'api', [{ message: 'Create Sparrow API', files: { 'package.json': '{ "name": "sparrow-api" }\n', 'server.js': 'export const start = () => {\n  console.log("starting");\n};\n' } }], { collaborators: ['you'] });
          H.protect('sparrow/api', 'main', { requirePR: true, requiredReviews: 1, requireChecks: true });
        },
        events: autoApprove('sparrow/api'),
        tasks: [
          { title: 'Clone sparrow/api and go into it', solution: 'git clone https://github.com/sparrow/api.git && cd api', check: t => !!t.repoAt('~/api') && t.inDir('~/api') },
          { title: 'On branch ci/setup, add a workflow that runs npm ci, npm run lint and npm test on pull_request, push it and open a PR', solution: 'git switch -c ci/setup && mkdir -p .github/workflows && edit .github/workflows/ci.yml && git add .github && git commit -m "ci: add lint and test workflow" && git push -u origin ci/setup && gh pr create --fill', test: ['git switch -c ci/setup && mkdir -p .github/workflows', { cmd: 'edit .github/workflows/ci.yml', edit: CI_LINT_YML }, 'git add .github && git commit -m "ci: add lint and test workflow" && git push -u origin ci/setup && gh pr create --fill'], check: t => prRuns(t, 'sparrow/api', p => p.head === 'ci/setup').length > 0 && wfOk(t.fileAt('ci/setup', '.github/workflows/ci.yml'), ['npm run lint', 'npm test']) },
          { title: 'The run is red (lint). Remove the console.log from server.js and push', solution: 'printf "export const start = () => {};\\n" > server.js && git commit -am "fix: remove debug logging" && git push', check: t => prRuns(t, 'sparrow/api', p => p.head === 'ci/setup')[0]?.conclusion === 'success' },
          { title: 'Merge the CI PR', solution: 'gh pr merge --squash --delete-branch', check: t => t.remote('sparrow/api').meta.prs.some(p => p.head === 'ci/setup' && p.state === 'merged') },
          { title: 'Ship ping.js through the gate. First attempt: `export const ping = () => "pnog";` Open the PR with it.', solution: 'git switch main && git pull && git switch -c feat/ping && echo \'export const ping = () => "pnog";\' > ping.js && git add ping.js && git commit -m "feat: add ping endpoint" && git push -u origin feat/ping && gh pr create --fill', check: t => prRuns(t, 'sparrow/api', p => p.head === 'feat/ping').some(r => r.conclusion === 'failure') },
          { title: 'Fix the typo, push, and merge once green', solution: 'echo \'export const ping = () => "pong";\' > ping.js && git commit -am "fix: return pong" && git push && gh pr merge --squash --delete-branch', check: t => t.remote('sparrow/api').meta.prs.some(p => p.head === 'feat/ping' && p.state === 'merged') },
          { title: 'Store the deploy token as the Actions secret DEPLOY_TOKEN', solution: 'gh secret set DEPLOY_TOKEN --body "dt_example_123"', check: t => !!t.remote('sparrow/api').meta.secrets?.DEPLOY_TOKEN },
        ],
      },
      quiz: [
        { type: 'mc', q: 'main requires a passing check, but no workflow exists yet. What happens to every PR?', choices: ['They merge freely', 'They are blocked: the required check never reports', 'GitHub creates a workflow automatically', 'They are closed'], answer: 1, explain: 'Add the workflow through a PR (admins may need to bootstrap it).' },
        { type: 'multi', q: 'Which belong in a typical Node.js CI job?', choices: ['actions/checkout', 'npm ci', 'npm test', 'A hard-coded API key'], answer: [0, 1, 2], explain: 'Secrets come from ${{ secrets.* }}.' },
        { type: 'mc', q: 'Why run CI on pull_request and not only on push to main?', choices: ['It is cheaper', 'To catch failures before merging rather than after', 'GitHub requires it', 'To avoid reviews'], answer: 1, explain: 'Shift-left: find problems early.' },
        { type: 'tf', q: 'An approved PR with a red required check can still be merged by a normal developer.', answer: false, explain: 'Required checks block merging until green.' },
        { type: 'type', q: 'Type the gh command that stores DEPLOY_TOKEN with the value abc123 as a repository secret.', accept: ['gh secret set DEPLOY_TOKEN --body "abc123"', 'gh secret set DEPLOY_TOKEN --body abc123', 'gh secret set DEPLOY_TOKEN -b abc123', 'gh secret set DEPLOY_TOKEN -b "abc123"'], model: 'gh secret set DEPLOY_TOKEN --body "abc123"', explain: 'Workflows read it as ${{ secrets.DEPLOY_TOKEN }}.' },
      ],
    },
  ],
};
