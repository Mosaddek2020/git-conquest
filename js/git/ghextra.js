// GitHub extras for the Everyday Mastery realm: `gh api` (the REST API, with --jq), and
// Dependabot (alerts for vulnerable npm dependencies, security-update PRs, and version-update
// PRs when .github/dependabot.yml asks for them). Registers on github.js's ghGroups and on
// the Actions runner's pushHooks, so a push to the default branch rescans the manifests.

import { GitError, C } from './world.js';
import { ghGroups, contextRepo, createPR, ghOpts, checksFor, protectionFor } from './github.js';
import { pushHooks } from './actions.js';
import { parseYaml } from './yaml.js';

// ============================================================================
// Dependabot
// ============================================================================

// A tiny advisory database (real advisories, so learners can look them up).
export const ADVISORIES = [
  { pkg: 'lodash', below: '4.17.21', patched: '4.17.21', ghsa: 'GHSA-35jh-r3h4-6jhm', cve: 'CVE-2021-23337', severity: 'high', summary: 'Command Injection in lodash' },
  { pkg: 'minimist', below: '1.2.6', patched: '1.2.6', ghsa: 'GHSA-xvch-5gv4-984h', cve: 'CVE-2021-44906', severity: 'critical', summary: 'Prototype Pollution in minimist' },
];
// what "latest" means for version updates in this simulated world
export const LATEST = { express: '4.21.2', jest: '29.7.0', eslint: '9.17.0' };

const ver = v => String(v || '').replace(/^[\^~>=<\s]+/, '').split('.').map(n => parseInt(n, 10) || 0);
export function semverLess(a, b) { const x = ver(a), y = ver(b); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0); } return false; }
const bareVersion = v => String(v || '').replace(/^[\^~>=<\s]+/, '');

function readFile(world, bare, path, branch) {
  const h = bare.refs['refs/heads/' + branch];
  if (!h) return null;
  const flat = world.readTreeFlat(world.commit(world.peel(h)).tree);
  return flat.has(path) ? world.objects.get(flat.get(path)).content : null;
}

function manifestDeps(text) {
  try {
    const j = JSON.parse(text);
    return { ...(j.dependencies || {}), ...(j.devDependencies || {}) };
  } catch { return null; }
}

export function dependabotOf(bare) { return bare.meta.dependabot || null; }

// Turn Dependabot on for a repository (labs; and `gh repo edit --enable-dependabot…` style flags).
export function enableDependabot(world, bare, { alerts = true, securityUpdates = true } = {}) {
  bare.meta.dependabot = bare.meta.dependabot || { alerts: [], nextAlert: 1, enabled: true, securityUpdates };
  bare.meta.dependabot.enabled = alerts;
  bare.meta.dependabot.securityUpdates = securityUpdates;
  dependabotScan(world, bare);
  return bare.meta.dependabot;
}

function versionUpdateConfig(world, bare, branch) {
  const text = readFile(world, bare, '.github/dependabot.yml', branch) ?? readFile(world, bare, '.github/dependabot.yaml', branch);
  if (text === null) return null;
  try {
    const doc = parseYaml(text);
    const updates = Array.isArray(doc?.updates) ? doc.updates : [];
    return updates.filter(u => u && u['package-ecosystem'] === 'npm' && (u.directory === '/' || u.directory == null));
  } catch { return []; }
}

function openUpdatePR(world, bare, { pkg, from, to, branch, security }) {
  const def = bare.meta.defaultBranch || 'main';
  const prBranch = `dependabot/npm_and_yarn/${pkg}-${to}`;
  if (bare.meta.prs.some(p => p.head === prBranch && p.state === 'open')) return null;
  const tip = world.peel(bare.refs['refs/heads/' + def]);
  const flat = world.readTreeFlat(world.commit(tip).tree);
  const edit = (path) => {
    if (!flat.has(path)) return;
    const text = world.objects.get(flat.get(path)).content;
    const next = text.replace(new RegExp(`("${pkg}"\\s*:\\s*")([\\^~]?)${from.replace(/\./g, '\\.')}(")`), `$1$2${to}$3`);
    if (next !== text) flat.set(path, world.writeBlob(next));
  };
  edit('package.json');
  edit('package-lock.json');
  world.tick(7);
  const sig = { name: 'dependabot[bot]', email: '49699333+dependabot[bot]@users.noreply.github.com', time: world.time };
  const msg = `Bump ${pkg} from ${from} to ${to}\n\nBumps [${pkg}](https://github.com/${pkg}/${pkg}) from ${from} to ${to}.\n\n---\nupdated-dependencies:\n- dependency-name: ${pkg}\n  dependency-type: direct:production\n...\n\nSigned-off-by: dependabot[bot] <support@github.com>`;
  const h = world.writeCommit({ tree: world.writeTree(flat), parents: [tip], message: msg, author: sig, committer: { name: 'GitHub', email: 'noreply@github.com', time: world.time } });
  bare.refs['refs/heads/' + prBranch] = h;
  const pr = createPR(world, bare, { title: `Bump ${pkg} from ${from} to ${to}`, body: `Bumps ${pkg} from ${from} to ${to}.${security ? `\n\nThis fixes ${security.ghsa} (${security.severity}): ${security.summary}.` : ''}\n\nDependabot will resolve any conflicts with this PR as long as you don't alter it yourself. You can also trigger a rebase manually by commenting \`@dependabot rebase\`.`, head: prBranch, headRepo: bare.meta.url, base: def, author: 'dependabot[bot]' });
  pr.labels = ['dependencies', 'javascript', ...(security ? ['security'] : [])];
  pr.dependabot = { pkg, from, to, security: !!security };
  world.emit({ type: 'dependabot-pr', url: bare.meta.url, number: pr.number, pkg, to, security: !!security });
  void branch;
  return pr;
}

// Re-read package.json on the default branch: open, fix or reopen alerts and open update PRs.
export function dependabotScan(world, bare) {
  const d = bare.meta.dependabot;
  if (!d) return;
  const def = bare.meta.defaultBranch || 'main';
  const text = readFile(world, bare, 'package.json', def);
  const deps = text ? manifestDeps(text) || {} : {};
  if (d.enabled) {
    for (const adv of ADVISORIES) {
      const v = deps[adv.pkg];
      const vulnerable = v !== undefined && semverLess(bareVersion(v), adv.below);
      const alert = d.alerts.find(a => a.ghsa === adv.ghsa);
      if (vulnerable && !alert) {
        const a = { number: d.nextAlert++, pkg: adv.pkg, ghsa: adv.ghsa, cve: adv.cve, severity: adv.severity, summary: adv.summary, range: `< ${adv.below}`, patched: adv.patched, version: bareVersion(v), manifest: 'package.json', state: 'open', created: world.time };
        d.alerts.push(a);
        world.emit({ type: 'dependabot-alert', url: bare.meta.url, number: a.number, pkg: adv.pkg });
      } else if (vulnerable && alert && alert.state === 'fixed') { alert.state = 'open'; alert.version = bareVersion(v); }
      else if (!vulnerable && alert && alert.state === 'open') { alert.state = 'fixed'; alert.fixedAt = world.time; world.emit({ type: 'dependabot-fixed', url: bare.meta.url, number: alert.number, pkg: adv.pkg }); }
      if (vulnerable && d.securityUpdates && (alert || d.alerts.find(a => a.ghsa === adv.ghsa)).state === 'open') openUpdatePR(world, bare, { pkg: adv.pkg, from: bareVersion(v), to: adv.patched, branch: def, security: adv });
    }
  }
  // version updates: only when dependabot.yml lists the npm ecosystem
  const cfg = versionUpdateConfig(world, bare, def);
  if (cfg && cfg.length) {
    const limit = Number(cfg[0]['open-pull-requests-limit'] ?? 5);
    const ignored = new Set((cfg[0].ignore || []).map(i => i && i['dependency-name']).filter(Boolean));
    for (const [pkg, latest] of Object.entries(LATEST)) {
      const v = deps[pkg];
      if (v === undefined || ignored.has(pkg) || !semverLess(bareVersion(v), latest)) continue;
      const open = bare.meta.prs.filter(p => p.state === 'open' && p.dependabot && !p.dependabot.security).length;
      if (open >= limit) break;
      openUpdatePR(world, bare, { pkg, from: bareVersion(v), to: latest, branch: def, security: null });
    }
  }
  // close Dependabot PRs whose update already landed
  for (const p of bare.meta.prs) {
    if (p.state !== 'open' || !p.dependabot) continue;
    const now = deps[p.dependabot.pkg];
    if (now === undefined || !semverLess(bareVersion(now), p.dependabot.to)) { p.state = 'closed'; p.closedReason = `Looks like ${p.dependabot.pkg} is up-to-date now, so this is no longer needed.`; }
  }
}

pushHooks.push((world, bare, ref) => {
  if (bare.meta?.dependabot && ref === (bare.meta.defaultBranch || 'main')) dependabotScan(world, bare);
});

// ============================================================================
// gh api
// ============================================================================

// a small jq: paths (.a.b, .[0], .[], .a[]), pipes, select(), map(), length, keys,
// first, last, join(), comparisons, and object/array construction of paths
export function jq(src, input) {
  const s = src.trim();
  const out = [];
  const run = (expr, v) => evalPipe(expr, v);
  for (const r of run(s, input)) out.push(r);
  return out;
}

function splitTop(s, sep) {
  const parts = [];
  let depth = 0, q = false, cur = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"' && s[i - 1] !== '\\') q = !q;
    if (!q) { if ('([{'.includes(ch)) depth++; else if (')]}'.includes(ch)) depth--; }
    if (!q && depth === 0 && s.startsWith(sep, i)) { parts.push(cur); cur = ''; i += sep.length - 1; continue; }
    cur += ch;
  }
  parts.push(cur);
  return parts.map(p => p.trim());
}

function evalPipe(expr, v) {
  const stages = splitTop(expr, '|');
  let vals = [v];
  for (const st of stages) vals = vals.flatMap(x => evalOne(st, x));
  return vals;
}

function evalOne(e, v) {
  e = e.trim();
  if (!e || e === '.') return [v];
  const commas = splitTop(e, ',');
  if (commas.length > 1) return commas.flatMap(c => evalOne(c, v));
  for (const op of [' and ', ' or ']) {
    const parts = splitTop(e, op);
    if (parts.length > 1) { const bs = parts.map(p => truthy(evalOne(p, v)[0])); return [op === ' and ' ? bs.every(Boolean) : bs.some(Boolean)]; }
  }
  for (const op of ['==', '!=', '>=', '<=', '>', '<']) {
    const parts = splitTop(e, op);
    if (parts.length === 2) {
      const a = evalOne(parts[0], v)[0], b = evalOne(parts[1], v)[0];
      return [op === '==' ? a === b : op === '!=' ? a !== b : op === '>=' ? a >= b : op === '<=' ? a <= b : op === '>' ? a > b : a < b];
    }
  }
  let m;
  if (/^"(.*)"$/.test(e)) return [JSON.parse(e)];
  if (/^-?\d+(\.\d+)?$/.test(e)) return [Number(e)];
  if (e === 'true' || e === 'false') return [e === 'true'];
  if (e === 'null') return [null];
  if (e === 'length') return [Array.isArray(v) || typeof v === 'string' ? v.length : v && typeof v === 'object' ? Object.keys(v).length : 0];
  if (e === 'keys') return [Object.keys(v || {}).sort()];
  if (e === 'first') return [Array.isArray(v) ? v[0] : null];
  if (e === 'last') return [Array.isArray(v) ? v[v.length - 1] : null];
  if (e === 'not') return [!truthy(v)];
  if (e === 'tostring') return [typeof v === 'string' ? v : JSON.stringify(v)];
  if ((m = e.match(/^select\((.*)\)$/))) return truthy(evalPipe(m[1], v)[0]) ? [v] : [];
  if ((m = e.match(/^map\((.*)\)$/))) return [(Array.isArray(v) ? v : Object.values(v || {})).flatMap(x => evalPipe(m[1], x))];
  if ((m = e.match(/^join\("(.*)"\)$/))) return [(v || []).join(m[1])];
  if ((m = e.match(/^test\("(.*)"\)$/))) return [new RegExp(m[1]).test(String(v))];
  if ((m = e.match(/^startswith\("(.*)"\)$/))) return [String(v).startsWith(m[1])];
  if ((m = e.match(/^\[(.*)\]$/s)) && !e.startsWith('[]')) return [m[1].trim() ? evalPipe(m[1], v) : []];
  if ((m = e.match(/^\{(.*)\}$/s))) {
    const obj = {};
    for (const part of splitTop(m[1], ',')) {
      const [k, ...rest] = splitTop(part, ':');
      const key = k.replace(/^"|"$/g, '');
      obj[key] = rest.length ? evalPipe(rest.join(':'), v)[0] : (v || {})[key];
    }
    return [obj];
  }
  if (e.startsWith('.')) return path(e, v);
  throw new GitError(`failed to parse jq expression (line 1, column 1)\n    ${e}\n    ^  unexpected token`, 1);
}

const truthy = x => x !== false && x !== null && x !== undefined;

function path(e, v) {
  let vals = [v];
  let rest = e, m;
  const tokens = [];
  while (rest.length) {
    if ((m = rest.match(/^\.?([A-Za-z_][\w]*)/)) && rest.startsWith('.')) { tokens.push({ key: m[1] }); rest = rest.slice(m[0].length); continue; }
    if ((m = rest.match(/^\.?\[\]/))) { tokens.push({ iter: true }); rest = rest.slice(m[0].length); continue; }
    if ((m = rest.match(/^\.?\[(-?\d+)\]/))) { tokens.push({ idx: Number(m[1]) }); rest = rest.slice(m[0].length); continue; }
    if ((m = rest.match(/^\.?\["([^"]+)"\]/))) { tokens.push({ key: m[1] }); rest = rest.slice(m[0].length); continue; }
    if (rest === '.') break;
    throw new GitError(`failed to parse jq expression: ${e}`, 1);
  }
  for (const t of tokens) {
    vals = vals.flatMap(x => {
      if (t.iter) return Array.isArray(x) ? x : x && typeof x === 'object' ? Object.values(x) : [];
      if (t.idx !== undefined) return [Array.isArray(x) ? x[t.idx < 0 ? x.length + t.idx : t.idx] ?? null : null];
      return [x && typeof x === 'object' ? (x[t.key] ?? null) : null];
    });
  }
  return vals;
}

const login = n => String(n || '').toLowerCase().includes('dependabot') ? 'dependabot[bot]' : n;

function prJson(bare, p) {
  return { number: p.number, title: p.title, state: p.state === 'merged' ? 'closed' : p.state, merged: p.state === 'merged', draft: !!p.draft, user: { login: login(p.author) }, head: { ref: p.head, label: `${p.headOwner}:${p.head}` }, base: { ref: p.base }, labels: (p.labels || []).map(name => ({ name })), html_url: `https://github.com/${bare.meta.owner}/${bare.meta.name}/pull/${p.number}` };
}

function alertJson(bare, a) {
  return {
    number: a.number, state: a.state,
    dependency: { package: { ecosystem: 'npm', name: a.pkg }, manifest_path: a.manifest, scope: 'runtime' },
    security_advisory: { ghsa_id: a.ghsa, cve_id: a.cve, summary: a.summary, severity: a.severity },
    security_vulnerability: { vulnerable_version_range: a.range, first_patched_version: { identifier: a.patched } },
    dismissed_reason: a.dismissedReason || null, dismissed_comment: a.dismissedComment || null,
    html_url: `https://github.com/${bare.meta.owner}/${bare.meta.name}/security/dependabot/${a.number}`,
  };
}

function apiGet(world, bare, route, query) {
  const m = bare.meta;
  const w = world;
  let r;
  if (route === '') return { name: m.name, full_name: `${m.owner}/${m.name}`, owner: { login: m.owner }, private: m.visibility === 'private', visibility: m.visibility, default_branch: m.defaultBranch || 'main', description: m.description || null, stargazers_count: m.stars || 0, open_issues_count: m.issues.filter(i => i.state === 'open').length + m.prs.filter(p => p.state === 'open').length, delete_branch_on_merge: !!m.deleteBranchOnMerge, fork: !!m.forkOf };
  if (route === '/pulls') { const st = query.state || 'open'; return m.prs.filter(p => st === 'all' || (st === 'open' ? p.state === 'open' : p.state !== 'open')).slice().reverse().map(p => prJson(bare, p)); }
  if ((r = route.match(/^\/pulls\/(\d+)$/))) { const p = m.prs.find(x => x.number === Number(r[1])); if (!p) return null; return { ...prJson(bare, p), mergeable: true, body: p.body }; }
  if ((r = route.match(/^\/pulls\/(\d+)\/reviews$/))) { const p = m.prs.find(x => x.number === Number(r[1])); return p ? p.reviews.map((rv, i) => ({ id: i + 1, user: { login: rv.author }, state: rv.state, body: rv.body })) : null; }
  if (route === '/issues') { const st = query.state || 'open'; return m.issues.filter(i => st === 'all' || i.state === st).slice().reverse().map(i => ({ number: i.number, title: i.title, state: i.state, labels: i.labels.map(name => ({ name })), user: { login: i.author } })); }
  if ((r = route.match(/^\/issues\/(\d+)$/))) { const i = m.issues.find(x => x.number === Number(r[1])); return i ? { number: i.number, title: i.title, state: i.state, body: i.body, labels: i.labels.map(name => ({ name })) } : null; }
  if (route === '/branches') return Object.keys(bare.refs).filter(k => k.startsWith('refs/heads/')).map(k => ({ name: k.slice(11), commit: { sha: bare.refs[k] }, protected: !!protectionFor(bare, k.slice(11)) }));
  if ((r = route.match(/^\/branches\/([^/]+)\/protection$/))) { const p = protectionFor(bare, r[1]); return p ? { required_pull_request_reviews: p.requirePR ? { required_approving_review_count: p.requiredReviews || 0, require_code_owner_reviews: !!p.requireCodeOwners } : (p.requiredReviews ? { required_approving_review_count: p.requiredReviews } : null), required_status_checks: p.requireChecks ? { strict: !!p.requireUpToDate, contexts: [] } : null, enforce_admins: { enabled: !!p.enforceAdmins } } : null; }
  if (route === '/commits') {
    const tip = bare.refs['refs/heads/' + (query.sha || m.defaultBranch || 'main')];
    const list = [];
    let cur = tip ? w.peel(tip) : null;
    while (cur && list.length < Number(query.per_page || 30)) { const c = w.commit(cur); list.push({ sha: cur, commit: { message: c.message, author: { name: c.author.name, email: c.author.email } } }); cur = c.parents[0]; }
    return list;
  }
  if ((r = route.match(/^\/commits\/([0-9a-f]{7,40})\/check-runs$/))) { const full = [...w.objects.keys()].find(k => k.startsWith(r[1])); const checks = full ? checksFor(bare, full) : []; return { total_count: checks.length, check_runs: checks.map(c => ({ name: c.workflow, status: 'completed', conclusion: c.conclusion })) }; }
  if (route === '/actions/runs') return { total_count: m.runs.length, workflow_runs: m.runs.map(x => ({ id: x.id, name: x.workflow, head_branch: x.branch, head_sha: x.hash, event: x.event, status: x.status, conclusion: x.conclusion, run_attempt: x.attempt, path: x.path })) };
  if ((r = route.match(/^\/actions\/runs\/(\d+)\/jobs$/))) { const run = m.runs.find(x => x.id === Number(r[1])); return run ? { total_count: run.jobs.length, jobs: run.jobs.map(j => ({ name: j.id, status: j.status, conclusion: j.conclusion })) } : null; }
  if (route === '/actions/secrets') return { total_count: Object.keys(m.secrets || {}).length, secrets: Object.keys(m.secrets || {}).map(name => ({ name })) };
  if (route === '/releases') return m.releases.map(x => ({ tag_name: x.tag, name: x.title, draft: false, prerelease: !!x.prerelease }));
  if (route === '/tags') return Object.keys(bare.refs).filter(k => k.startsWith('refs/tags/')).map(k => ({ name: k.slice(10), commit: { sha: w.peel(bare.refs[k]) } }));
  if (route === '/environments') return { total_count: Object.keys(m.environments || {}).length, environments: Object.values(m.environments || {}).map(e => ({ name: e.name, protection_rules: e.reviewers?.length ? [{ type: 'required_reviewers' }] : [] })) };
  if (route === '/dependabot/alerts') {
    if (!m.dependabot?.enabled) return { __status: 403, message: 'Dependabot alerts are disabled for this repository.' };
    const st = query.state;
    return m.dependabot.alerts.filter(a => !st || st.split(',').includes(a.state)).filter(a => !query.severity || query.severity.split(',').includes(a.severity)).slice().reverse().map(a => alertJson(bare, a));
  }
  if ((r = route.match(/^\/dependabot\/alerts\/(\d+)$/))) { const a = m.dependabot?.alerts.find(x => x.number === Number(r[1])); return a ? alertJson(bare, a) : null; }
  if (route === '/contributors') {
    const by = new Map();
    let cur = bare.refs['refs/heads/' + (m.defaultBranch || 'main')]; cur = cur && w.peel(cur);
    while (cur) { const c = w.commit(cur); by.set(c.author.name, (by.get(c.author.name) || 0) + 1); cur = c.parents[0]; }
    return [...by].sort((a, b) => b[1] - a[1]).map(([name, contributions]) => ({ login: name, contributions }));
  }
  return undefined;
}

function apiWrite(world, bare, method, route, fields) {
  const m = bare.meta;
  let r;
  if (method === 'PATCH' && (r = route.match(/^\/dependabot\/alerts\/(\d+)$/))) {
    const a = m.dependabot?.alerts.find(x => x.number === Number(r[1]));
    if (!a) return null;
    if (fields.state === 'dismissed') {
      const reasons = ['fix_started', 'inaccurate', 'no_bandwidth', 'not_used', 'tolerable_risk'];
      if (!reasons.includes(fields.dismissed_reason)) return { __status: 422, message: `Validation Failed: dismissed_reason must be one of ${reasons.join(', ')}` };
      Object.assign(a, { state: 'dismissed', dismissedReason: fields.dismissed_reason, dismissedComment: fields.dismissed_comment || null });
      for (const p of m.prs) if (p.state === 'open' && p.dependabot?.security && p.dependabot.pkg === a.pkg) { p.state = 'closed'; p.closedReason = 'The alert was dismissed.'; }
      world.emit({ type: 'dependabot-dismissed', url: m.url, number: a.number, reason: fields.dismissed_reason });
    } else if (fields.state === 'open') { a.state = 'open'; delete a.dismissedReason; }
    return alertJson(bare, a);
  }
  if (method === 'POST' && route === '/issues') {
    if (!fields.title) return { __status: 422, message: 'Validation Failed: title is required' };
    const issue = { number: m.nextNumber++, title: fields.title, body: fields.body || '', labels: [].concat(fields['labels[]'] || []), state: 'open', author: world.github.user, comments: [], time: world.time };
    m.issues.push(issue);
    world.emit({ type: 'issue-created', url: m.url, number: issue.number });
    return { number: issue.number, title: issue.title, state: 'open', html_url: `https://github.com/${m.owner}/${m.name}/issues/${issue.number}` };
  }
  if (method === 'PATCH' && route === '') {
    if ('delete_branch_on_merge' in fields) m.deleteBranchOnMerge = fields.delete_branch_on_merge === true || fields.delete_branch_on_merge === 'true';
    if ('description' in fields) m.description = fields.description;
    world.emit({ type: 'repo-edit', url: m.url });
    return apiGet(world, bare, '', {});
  }
  return undefined;
}

ghGroups.api = (ctx, args) => {
  const w = ctx.world;
  const o = ghOpts(args, { bool: ['--paginate', '-i', '--include', '--silent'], val: ['--jq', '-q', '-X', '--method', '-f', '--raw-field', '-F', '--field', '-H', '--header', '--template', '-t'], alias: { '-q': '--jq', '--method': '-X', '--raw-field': '-f', '--field': '-F', '--header': '-H', '-t': '--template' } });
  // -f / -F may repeat
  const fields = {};
  for (let i = 0; i < args.length; i++) {
    if (['-f', '--raw-field', '-F', '--field'].includes(args[i]) && args[i + 1]) {
      const [k, ...v] = args[i + 1].split('=');
      let val = v.join('=');
      if (args[i] === '-F' || args[i] === '--field') val = val === 'true' ? true : val === 'false' ? false : /^\d+$/.test(val) ? Number(val) : val;
      if (k.endsWith('[]')) (fields[k] = fields[k] || []).push(val); else fields[k] = val;
    }
  }
  let endpoint = o._[0];
  if (!endpoint) throw new GitError('accepts 1 arg(s), received 0', 1);
  endpoint = endpoint.replace(/^\//, '').replace(/^https:\/\/api\.github\.com\//, '');
  if (/[{]owner[}]|[{]repo[}]/.test(endpoint)) {
    const { bare } = contextRepo(ctx, { upstreamFirst: false });
    endpoint = endpoint.replace('{owner}', bare.meta.owner).replace('{repo}', bare.meta.name);
  }
  const [pathPart, qs] = endpoint.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs || ''));
  const method = (o['-X'] || (Object.keys(fields).length ? 'POST' : 'GET')).toUpperCase();
  let result;
  if (pathPart === 'user') result = { login: w.github.user, type: 'User' };
  else if (pathPart === 'rate_limit') result = { resources: { core: { limit: 5000, remaining: 4987 } } };
  else {
    const m = pathPart.match(/^repos\/([^/]+)\/([^/]+)(\/.*)?$/);
    if (!m) throw new GitError(`gh: Not Found (HTTP 404)\n{"message":"Not Found","documentation_url":"https://docs.github.com/rest","status":"404"}`, 1);
    const bare = w.remotes.get(`https://github.com/${m[1]}/${m[2]}.git`);
    if (!bare || (bare.meta.visibility === 'private' && bare.meta.owner !== w.github.user && !bare.meta.collaborators.includes(w.github.user))) throw new GitError(`gh: Not Found (HTTP 404)`, 1);
    if (method !== 'GET' && bare.meta.owner !== w.github.user && !bare.meta.collaborators.includes(w.github.user)) throw new GitError('gh: Must have admin rights to Repository. (HTTP 403)', 1);
    result = method === 'GET' ? apiGet(w, bare, m[3] || '', query) : apiWrite(w, bare, method, m[3] || '', fields);
  }
  if (result === undefined) throw new GitError(`gh: Not Found (HTTP 404)\n${C.dim('(this endpoint is not simulated here; try repos/{owner}/{repo}, /pulls, /issues, /branches, /commits, /actions/runs, /dependabot/alerts, /releases)')}`, 1);
  if (result === null) throw new GitError('gh: Not Found (HTTP 404)', 1);
  if (result.__status) throw new GitError(`gh: ${result.message} (HTTP ${result.__status})`, 1);
  w.emit({ type: 'gh-api', method, endpoint: pathPart, jq: o['--jq'] || null });
  if (o['--silent']) return 0;
  if (o['--jq']) {
    for (const v of jq(o['--jq'], result)) ctx.out.push(typeof v === 'string' ? v : JSON.stringify(v));
    return 0;
  }
  ctx.out.push(...JSON.stringify(result, null, 2).split('\n'));
  return 0;
};
