// Realm 11 · GitHub Automation: Actions, CI checks, secrets, Dependabot, Pages, continuous delivery.

import { parseWorkflow } from '../git/github.js';

const CI_YML = 'name: CI\non:\n  push:\n    branches: [main]\n  pull_request:\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n      - run: npm ci\n      - run: npm test\n';
const CI_LINT_YML = CI_YML.replace('      - run: npm test\n', '      - run: npm run lint\n      - run: npm test\n');

// Fake keys are assembled at run time so the repository itself holds no secret-shaped strings.
const LIVE = 'sk_' + 'live_';
const OLD_KEY = LIVE + '51HxQpay7d9F2kTq';
const NEW_KEY = LIVE + '77NeWkeY3Xr9';

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

// ---------- continuous delivery fixtures ----------

const TOKEN = '${{ secrets.DEPLOY_TOKEN }}';
const testJob = ['  test:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4', '      - run: npm ci', '      - run: npm test'];
const deployJob = (id, env) => [`  ${id}:`, '    needs: test', `    environment: ${env}`, '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4', `      - run: ./scripts/deploy.sh ${env}`, '        env:', `          DEPLOY_TOKEN: ${TOKEN}`];
const DEPLOY_YML = ['name: Deploy', 'on:', '  push:', '    branches: [main]', 'jobs:', ...testJob, ...deployJob('deploy-staging', 'staging')].join('\n') + '\n';
const RELEASE_YML = ['name: Release', 'on:', '  push:', "    tags: ['v*']", '  workflow_dispatch:', 'jobs:', ...testJob, ...deployJob('deploy-production', 'production')].join('\n') + '\n';
const DEPLOY_SMOKE_YML = DEPLOY_YML + '      - name: Smoke test\n        run: curl -f https://staging.forecast.example/\n';
const FORECAST_FILES = {
  'package.json': '{\n  "name": "forecast",\n  "version": "1.0.0",\n  "scripts": { "test": "jest", "lint": "eslint ." }\n}\n',
  'index.html': '<!doctype html>\n<title>Forecast</title>\n<div id="app"></div>\n<script type="module" src="app.js"></script>\n',
  'app.js': 'export function render(data) {\n  return `<h1>${data.city}</h1><p>${data.temp}°C</p>`;\n}\n',
  'scripts/deploy.sh': '#!/bin/sh\n# Uploads the build to our hosting provider.\n# Usage: ./scripts/deploy.sh <environment>\n# Needs the DEPLOY_TOKEN environment variable.\nset -e\n[ -n "$DEPLOY_TOKEN" ] || { echo "DEPLOY_TOKEN is not set"; exit 1; }\nhostctl upload --env "$1" --token "$DEPLOY_TOKEN" .\n',
  '.github/workflows/ci.yml': CI_YML,
};
const APP_HOURLY = 'export function render(data) {\n  return `<h1>${data.city}</h1><p>${data.temp}°C</p>` + renderHourly(data);\n}\n\nfunction renderHourly(data) {\n  // one row per hour\n  return data.hourly.map(h => `<li>${h.time}: ${h.temp}°C</li>`).join("");\n}\n';

const jobRes = (run, id) => run.jobs.find(j => j.id === id)?.conclusion;
const passesToken = s => Object.entries(s.env || {}).some(([k, v]) => k === 'DEPLOY_TOKEN' && /secrets\.DEPLOY_TOKEN/.test(String(v)));
function pipelineOk(text, env) {
  if (!text) return null;
  const wf = parseWorkflow(text);
  if (wf.errors.length) return null;
  const testIds = wf.jobs.filter(j => j.steps.some(s => /npm (run )?test/.test(s.run || ''))).map(j => j.id);
  const dep = wf.jobs.find(j => j.environment?.name === env);
  if (!dep || !dep.needs.some(n => testIds.includes(n))) return null;
  const step = dep.steps.find(s => new RegExp(`deploy\\.sh\\s+${env}`).test(s.run || ''));
  if (!step || !(passesToken(step) || /secrets\.DEPLOY_TOKEN/.test(JSON.stringify(dep.env)))) return null;
  return { wf, dep };
}
const deployOk = text => { const p = pipelineOk(text, 'staging'); return !!p && [].concat(p.wf.triggers.push?.branches || []).includes('main'); };
const releaseOk = text => { const p = pipelineOk(text, 'production'); return !!p && [].concat(p.wf.triggers.push?.tags || []).some(g => /^v\*/.test(g)) && 'workflow_dispatch' in p.wf.triggers && !p.wf.triggers.push?.branches; };
const smokeOk = text => { const p = pipelineOk(text, 'staging'); if (!p) return false; const steps = p.dep.steps; const i = steps.findIndex(s => /deploy\.sh/.test(s.run || '')); return steps.slice(i + 1).some(s => /curl\s+(-\w*f\w*\s+|--fail\s+)*.*staging\.forecast\.example\/?(\s|$)/.test(s.run || '') && /(\s-\w*f|--fail)/.test(s.run || '')); };
const isProdRoot = url => /^(https?:\/\/)?forecast\.example\/?$/.test(url);
// did an event matching b happen after the last event matching a?
const after = (t, a, b) => { const ev = t.world.events; let ia = -1; ev.forEach((e, i) => { if (a(e)) ia = i; }); return ia >= 0 && ev.some((e, i) => i > ia && b(e)); };

export default {
  id: 'automation',
  n: 11,
  title: 'GitHub Automation',
  tagline: 'Actions, required checks, secrets, deploy pipelines and rollbacks',
  badge: 'Automaton Wrangler',
  intro: 'Let GitHub do the boring, critical work for you. Write **GitHub Actions** workflows, gate merges on **required checks**, keep credentials in **secrets** (and know what to do when one leaks), turn on **Dependabot**, then build a **continuous delivery** pipeline with staging, approved production releases and one-command **rollbacks**.',
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
            { message: 'Add payment config', files: { 'config.js': `export const key = "${OLD_KEY}";\n` } },
            { message: 'Add product page', files: { 'product.html': '<h1>Product</h1>\n' } },
          ]);
          H.cd('~');
          H.run('git clone -q https://github.com/you/shopfront.git');
          H.cd('~/shopfront');
          H.world.labData = {};
          H.shell.extraCommands.payments = (args, out, sh) => {
            if (args[0] === 'rotate-key') {
              sh.world.labData.rotated = true;
              out.push(`Revoked key ${OLD_KEY.slice(0, 13)}…kTq`, `New key: ${NEW_KEY} (shown once: store it somewhere safe)`);
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
          { title: 'Store the new key as an Actions secret named PAYMENT_KEY', solution: `gh secret set PAYMENT_KEY --body "${NEW_KEY}"`, check: t => !!t.remote('you/shopfront').meta.secrets?.PAYMENT_KEY },
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
      id: 'cd-pipelines',
      title: 'Continuous delivery pipelines',
      summary: 'Staging and production environments, needs:, deploy secrets, tag-driven releases and deployment approvals.',
      minutes: 22,
      lab: {
        cwd: '~/forecast',
        panels: ['github', 'files'],
        setup(H) {
          H.world.deployToken = 'dt_forecast_42';
          H.remote('you', 'forecast', [{ message: 'Create Forecast app with CI', files: FORECAST_FILES }]);
          H.tagRemote('you/forecast', 'v1.0.0');
          H.environment('you/forecast', 'staging', { url: 'https://staging.forecast.example' });
          H.environment('you/forecast', 'production', { url: 'https://forecast.example', reviewers: ['you'], branches: [], tags: ['v*'] });
          H.deploy('you/forecast', 'production', 'v1.0.0');
          H.run('git clone -q https://github.com/you/forecast.git');
          H.cd('~/forecast');
        },
        suggestions: ['curl https://forecast.example/health', 'cat scripts/deploy.sh', 'edit .github/workflows/deploy.yml'],
        tasks: [
          { title: 'Ask production what it is running: curl its /health endpoint', solution: 'curl https://forecast.example/health', check: t => t.ran(/curl\b.*(\/\/|\s)forecast\.example\/health/) },
          { title: 'Write .github/workflows/deploy.yml: on push to main, a test job (checkout, npm ci, npm test) and a deploy-staging job that needs test, uses environment: staging, and runs ./scripts/deploy.sh staging with DEPLOY_TOKEN passed from secrets', hint: 'Start from the example in the "Anatomy of a deploy workflow" lens. The env: block belongs to the deploy step, indented under it.', solution: 'edit .github/workflows/deploy.yml', test: [{ cmd: 'edit .github/workflows/deploy.yml', edit: DEPLOY_YML }], check: t => deployOk(t.file('~/forecast/.github/workflows/deploy.yml')) },
          { title: 'Commit and push it. The deploy job fails: read why with gh run view', solution: 'git add .github && git commit -m "ci: deploy main to staging" && git push && gh run view', check: t => { const r = t.runsOf('you/forecast', 'deploy.yml')[0]; return !!r && jobRes(r, 'test') === 'success' && r.jobs.some(j => j.def?.environment?.name === 'staging' && j.conclusion === 'failure') && t.ran(/\bgh run (view|watch)/); } },
          { title: 'Store the token dt_forecast_42 as the secret DEPLOY_TOKEN, then re-run the failed job', hint: 'gh secret set …, then gh run rerun <id> --failed (the run id is shown by gh run list).', solution: 'gh secret set DEPLOY_TOKEN --body "dt_forecast_42" && gh run rerun --failed', check: t => !!t.deployment('you/forecast', 'staging') },
          { title: 'Check that staging now serves your latest main commit', solution: 'curl https://staging.forecast.example/health', check: t => !!t.deployment('you/forecast', 'staging') && t.ran(/curl\b.*staging\.forecast\.example/) },
          { title: 'Write .github/workflows/release.yml: on push of tags matching v* (and on workflow_dispatch), a test job and a deploy-production job that needs test, uses environment: production, and runs ./scripts/deploy.sh production with the token', hint: 'Copy deploy.yml and change the trigger and the environment. Tags filter: tags: [\'v*\'].', solution: 'edit .github/workflows/release.yml', test: [{ cmd: 'edit .github/workflows/release.yml', edit: RELEASE_YML }], check: t => releaseOk(t.file('~/forecast/.github/workflows/release.yml')) },
          { title: 'Commit and push it, then create the annotated tag v1.1.0 and push the tag', solution: 'git add .github && git commit -m "ci: release tags to production" && git push && git tag -a v1.1.0 -m "Forecast 1.1.0" && git push origin v1.1.0', check: t => t.runsOf('you/forecast', 'release.yml').some(r => r.branch === 'v1.1.0' && r.status === 'waiting') },
          { title: 'The release is waiting for you. Approve it in the GitHub tab (Actions → Review deployments → Approve and deploy)', solution: 'Click "Approve and deploy" in the GitHub tab', test: [{ act: H => H.approve('you/forecast'), label: 'Approve and deploy' }], check: t => t.deployment('you/forecast', 'production')?.version === 'v1.1.0' },
          { title: 'Confirm production now reports v1.1.0', solution: 'curl https://forecast.example/health', check: t => t.deployment('you/forecast', 'production')?.version === 'v1.1.0' && after(t, e => e.type === 'deployment' && e.env === 'production', e => e.type === 'http' && /(\/\/|^)forecast\.example\/health/.test(e.url)) },
        ],
      },
      quiz: [
        { type: 'mc', q: 'What is the difference between continuous delivery and continuous deployment?', choices: ['There is none', 'Delivery keeps every change ready to release with a deliberate release step; deployment releases every passing change automatically', 'Delivery is for mobile apps only', 'Deployment means deploying to staging only'], answer: 1, explain: 'In continuous delivery a person or rule decides when; in continuous deployment the pipeline does.' },
        { type: 'mc', q: 'Your deploy job has no `needs:`. What can happen?', choices: ['Nothing; jobs always run in file order', 'It runs in parallel with the tests and may deploy code whose tests fail', 'GitHub refuses the workflow', 'It never runs'], answer: 1, explain: 'Jobs run in parallel by default; needs: orders them and skips the deploy when tests fail.' },
        { type: 'mc', q: 'The deploy step fails with "DEPLOY_TOKEN is not set", but the secret exists. Most likely cause?', choices: ['Secrets expire after a day', 'The step does not pass it: secrets must be mapped explicitly, e.g. env: DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}', 'Tokens only work on pull_request', 'The runner is out of disk'], answer: 1, explain: 'Secrets are only available where you pass them.' },
        { type: 'multi', q: 'What can a protected GitHub environment enforce?', choices: ['Required reviewers who must approve a deployment', 'Which branches or tags may deploy to it', 'Environment-specific secrets', 'That the code has no bugs'], answer: [0, 1, 2], explain: 'Protection rules control who and what may deploy; they cannot prove correctness.' },
        { type: 'mc', q: 'Which trigger runs a release workflow when you push v2.0.0?', choices: ['on: push: branches: [v*]', "on: push: tags: ['v*']", 'on: release_tag', 'on: pull_request: tags'], answer: 1, explain: 'Tag pushes are push events with a refs/tags/ ref.' },
        { type: 'tf', q: '"Build once, deploy many" means the commit tested in the pipeline is the one deployed to staging and to production.', answer: true, explain: 'Rebuilding by hand for production deploys something nobody tested.' },
        { type: 'type', q: 'Type the gh command that re-runs only the failed jobs of run 7.', accept: ['gh run rerun 7 --failed', 'gh run rerun --failed 7'], model: 'gh run rerun 7 --failed', explain: 'Useful after fixing a missing secret: no new commit needed.' },
        { type: 'mc', q: 'What should a /health endpoint report so that deploys are easy to verify?', choices: ['The server\'s CPU model', 'The running version and commit', 'The list of users', 'The deploy token'], answer: 1, explain: 'Then "what is in production?" has a precise answer.' },
        { type: 'mc', q: 'Which of these is one of the four DORA delivery metrics?', choices: ['Lines of code per day', 'Number of branches', 'Change failure rate', 'Test coverage percentage'], answer: 2, explain: 'Deployment frequency, lead time for changes, change failure rate, time to restore service.' },
      ],
    },
    {
      id: 'release-rollback',
      title: 'Releases, rollbacks and safe deploys',
      summary: 'Restore service first: roll back by redeploying a tag, revert the cause, add a smoke test, and ship a patch release.',
      minutes: 22,
      lab: {
        cwd: '~/forecast',
        panels: ['github', 'graph'],
        setup(H) {
          H.world.deployToken = 'dt_forecast_42';
          H.world.siteRule = (files, { path }) => (path === '/' && /data\.hourly\.map\(/.test(files['app.js'] || '')) ? { status: 500, body: "500 Internal Server Error\nTypeError: Cannot read properties of undefined (reading 'map')\n    at renderHourly (app.js:9:22)" } : null;
          H.remote('you', 'forecast', [
            { message: 'Create Forecast app with CI', files: FORECAST_FILES },
            { message: 'ci: deploy main to staging', files: { '.github/workflows/deploy.yml': DEPLOY_YML } },
            { message: 'ci: release tags to production', files: { '.github/workflows/release.yml': RELEASE_YML } },
          ], { authorName: 'You', authorEmail: 'you@example.com' });
          H.bare('you/forecast').meta.runs.length = 0;
          H.tagRemote('you/forecast', 'v1.1.0');
          H.environment('you/forecast', 'staging', { url: 'https://staging.forecast.example' });
          H.environment('you/forecast', 'production', { url: 'https://forecast.example', reviewers: ['you'], branches: [], tags: ['v*'] });
          H.secret('you/forecast', 'DEPLOY_TOKEN', 'dt_forecast_42');
          H.deploy('you/forecast', 'production', 'v1.1.0');
          H.deploy('you/forecast', 'staging', 'main', { refType: 'branch' });
          H.hours(20);
          H.teammate('you/forecast', { message: 'feat: show the details panel (#13)', files: { 'details.js': 'export const details = d => `${d.wind} km/h, ${d.humidity}%`;\n' }, author: { name: 'Priya Sharma', email: 'priya@example.com' } });
          const bad = H.teammate('you/forecast', { message: 'feat: hourly forecast (#14)', files: { 'app.js': APP_HOURLY }, author: { name: 'Jonas Weber', email: 'jonas@example.com' } });
          H.teammate('you/forecast', { message: 'docs: describe the hourly view (#15)', files: { 'README.md': '# Forecast\n\nNow with an hourly view.\n' }, author: { name: 'Priya Sharma', email: 'priya@example.com' } });
          H.world.labData = { bad };
          H.run('git clone -q https://github.com/you/forecast.git');
          H.cd('~/forecast');
        },
        suggestions: ['curl https://forecast.example/health', 'git log --oneline v1.1.0..main', 'gh run list'],
        tasks: [
          { title: 'Check which version production runs', solution: 'curl https://forecast.example/health', check: t => t.ran(/curl\b.*(\/\/|\s)forecast\.example\/health/) },
          { title: 'List what will ship: the commits on main since v1.1.0', solution: 'git log --oneline v1.1.0..main', check: t => t.ran(/^git log\b.*v1\.1\.0\.\.(main|origin\/main|HEAD)?/) },
          { title: 'Release it: tag main as v1.2.0 (annotated), push the tag and approve the production deployment', solution: 'git tag -a v1.2.0 -m "Forecast 1.2.0" && git push origin v1.2.0, then Approve and deploy in the GitHub tab', test: ['git tag -a v1.2.0 -m "Forecast 1.2.0" && git push origin v1.2.0', { act: H => H.approve('you/forecast'), label: 'Approve and deploy' }], check: t => t.deployment('you/forecast', 'production')?.version === 'v1.2.0' },
          { title: 'Users report errors. Look at the production home page, with the status line', solution: 'curl -i https://forecast.example/', check: t => t.events('http').some(e => isProdRoot(e.url) && e.status === 500) },
          { title: 'Restore service first: roll production back to v1.1.0 with gh workflow run, and approve it', hint: 'release.yml has a workflow_dispatch trigger, so you can run it on any ref: --ref v1.1.0.', solution: 'gh workflow run release.yml --ref v1.1.0, then Approve and deploy', test: ['gh workflow run release.yml --ref v1.1.0', { act: H => H.approve('you/forecast'), label: 'Approve and deploy' }], check: t => { const b = t.remote('you/forecast'); return t.deployment('you/forecast', 'production')?.version === 'v1.1.0' && b.meta.deployments.some(d => d.version === 'v1.2.0'); } },
          { title: 'Confirm the home page works again', solution: 'curl -i https://forecast.example/', check: t => after(t, e => e.type === 'deployment' && e.env === 'production' && e.version === 'v1.1.0', e => e.type === 'http' && isProdRoot(e.url) && e.status === 200) },
          { title: 'Now fix the cause calmly: revert the hourly forecast commit on main and push (staging redeploys)', hint: 'git log --oneline finds it; git revert --no-edit <id> undoes it with a new commit.', solution: 'git revert --no-edit <id> && git push', test: [t => `git revert --no-edit ${t.world.labData.bad.slice(0, 7)} && git push`], check: t => { const b = t.remote('you/forecast'); const head = b.refs['refs/heads/main']; const c = t.world.commit(head); return /^Revert/.test(c.message) && t.isAncestor(t.world.labData.bad, head) && t.deployment('you/forecast', 'staging')?.hash === head; } },
          { title: 'Make the pipeline catch this next time: in deploy.yml, add a smoke test step after the staging deploy that runs curl -f https://staging.forecast.example/ , then push', hint: 'Add a new list item under the deploy-staging steps:  - name: Smoke test  /  run: curl -f https://staging.forecast.example/', solution: 'edit .github/workflows/deploy.yml && git commit -am "ci: smoke test staging after deploy" && git push', test: [{ cmd: 'edit .github/workflows/deploy.yml', edit: DEPLOY_SMOKE_YML }, 'git commit -am "ci: smoke test staging after deploy" && git push'], check: t => { const b = t.remote('you/forecast'); const head = b.refs['refs/heads/main']; const flat = t.world.readTreeFlat(t.world.commit(head).tree); const f = flat.get('.github/workflows/deploy.yml'); const txt = f && t.world.objects.get(f).content; return smokeOk(txt) && t.runsOf('you/forecast', 'deploy.yml').some(r => r.hash === head && r.conclusion === 'success'); } },
          { title: 'Ship the fix as v1.2.1, approve it, and confirm the production home page works', solution: 'git tag -a v1.2.1 -m "Forecast 1.2.1" && git push origin v1.2.1, approve, then curl -i https://forecast.example/', test: ['git tag -a v1.2.1 -m "Forecast 1.2.1" && git push origin v1.2.1', { act: H => H.approve('you/forecast'), label: 'Approve and deploy' }, 'curl -i https://forecast.example/'], check: t => t.deployment('you/forecast', 'production')?.version === 'v1.2.1' && after(t, e => e.type === 'deployment' && e.env === 'production' && e.version === 'v1.2.1', e => e.type === 'http' && isProdRoot(e.url) && e.status === 200) },
        ],
      },
      quiz: [
        { type: 'order', q: 'Production is down after a release. Put the response in order.', items: ['Roll back to the last good release', 'Confirm users can use the site again', 'Find and revert the cause on main', 'Ship a new patch release through the pipeline', 'Write a blameless postmortem with one pipeline improvement'], explain: 'Restore service first; fix the cause calmly afterwards.' },
        { type: 'mc', q: 'With tag-driven releases, what is a rollback?', choices: ['Force-pushing main to an older commit', 'Redeploying the previous known-good tag through the pipeline', 'Deleting the bad tag', 'Editing files on the production server'], answer: 1, explain: 'Nothing is rebuilt and nothing is typed by hand.' },
        { type: 'mc', q: 'The v1.2.0 tag points at a bad commit. What should the fix be released as?', choices: ['Move the v1.2.0 tag to the fixed commit', 'A new version such as v1.2.1', 'Delete v1.2.0 and pretend it never happened', 'v1.1.0 again'], answer: 1, explain: 'Tags are permanent names for exact commits; never reuse them.' },
        { type: 'tf', q: 'A /health endpoint that returns ok proves the main user journey works.', answer: false, explain: 'It only proves the process answers. Smoke tests exercise real pages.' },
        { type: 'mc', q: 'What does `curl -f` add to a smoke-test step?', choices: ['It follows redirects', 'It exits with an error on HTTP 400 and above, so the job fails', 'It runs faster', 'It hides the output'], answer: 1, explain: 'Without -f, curl succeeds even when the server answers 500.' },
        { type: 'multi', q: 'Which strategies reduce the impact of a bad release?', choices: ['Canary releases to a small share of users', 'Feature flags', 'Blue-green deployments', 'Bigger, rarer releases'], answer: [0, 1, 2], explain: 'Bigger releases make failures more likely and harder to diagnose.' },
        { type: 'type', q: 'Type the gh command that runs release.yml on the tag v1.1.0.', accept: ['gh workflow run release.yml --ref v1.1.0', 'gh workflow run release.yml -r v1.1.0'], model: 'gh workflow run release.yml --ref v1.1.0', explain: 'The workflow needs a workflow_dispatch trigger.' },
        { type: 'mc', q: 'Why can a rollback fail after a release that changed the database schema?', choices: ['Git cannot check out old tags', 'The old code may not work with the new schema', 'Rollbacks delete the database', 'Approvals expire'], answer: 1, explain: 'Make migrations backward compatible so both versions work.' },
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
        { type: 'mc', q: 'Staging should get every merge to main; production only version tags after approval. Which pair of triggers fits?', choices: ['Both on pull_request', "Staging: push branches [main]; production: push tags ['v*'] with a protected production environment", 'Both on push with no filters', 'Staging on schedule; production on issues'], answer: 1, explain: 'Branch filter for staging, tag filter plus environment protection for production.' },
        { type: 'mc', q: 'A release broke production. What comes first?', choices: ['Find the guilty commit with bisect', 'Roll back to the last good release', 'Write the postmortem', 'Force-push main'], answer: 1, explain: 'Restore service, then fix the cause through the pipeline.' },
        { type: 'type', q: 'Type the gh command that stores DEPLOY_TOKEN with the value abc123 as a repository secret.', accept: ['gh secret set DEPLOY_TOKEN --body "abc123"', 'gh secret set DEPLOY_TOKEN --body abc123', 'gh secret set DEPLOY_TOKEN -b abc123', 'gh secret set DEPLOY_TOKEN -b "abc123"'], model: 'gh secret set DEPLOY_TOKEN --body "abc123"', explain: 'Workflows read it as ${{ secrets.DEPLOY_TOKEN }}.' },
      ],
    },
  ],
};
