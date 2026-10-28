// Commands for the Scale & Trust and Maintainer realms: commit signing, Git LFS, sparse
// checkout, filter-repo, rerere, range-diff, format-patch / am / apply, notes, cherry,
// merge-base and submodules. They register themselves on the shared `commands` table.

import { GitError, C, shortHash, formatDate, normPath, dirname, basename, stripAnsi } from './world.js';
import { sha1, utf8 } from './sha1.js';
import { unifiedHunks, splitLines, diffStats } from './diff.js';
import {
  headCommit, currentBranch, headRef, resolve, resolveCommit, revList, mergeBase, isAncestor, commitTreeFlat,
  headTreeFlat, worktree, writeWork, removeWork, checkoutTree, computeStatus, setHeadCommit, updateRef, logRef,
  makeCommit, indexTree, identity, requireIdentity, isGitlink, conflictHooks, skipWorktree, mergeTrees, applyMerge,
} from './core.js';
import { commands, logHooks, parseOpts, relPath, treePairs, statLines, needRepo, needWorkTree, firstLine, GIT_VERSION } from './git.js';
import { pushGuards } from './remote.js';
import { protectionFor } from './github.js';
import { attributesFor, parseAttributes, parsePointer, lfsPointer, lfsInstalled, contentSize, humanSize, eolInfo, looksBinary, isFakeBinary } from './filters.js';

const cfg = (repo, key) => (repo && repo.config[key] !== undefined ? repo.config[key] : undefined) ?? repo?.world.globalConfig[key] ?? repo?.world.globalConfig[key.toLowerCase()];
const truthy = v => ['true', 'yes', 'on', '1'].includes(String(v).toLowerCase());
const home = (w, p) => (p.startsWith('~/') ? w.home + p.slice(1) : p);
const pl = (n, w, p = w + 's') => `${n} ${n === 1 ? w : p}`;

// ============================================================================
// signing
// ============================================================================

function fingerprint(key) {
  const hex = sha1(key);
  const b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let s = '';
  for (let i = 0; i < 43; i++) s += b64[parseInt(hex.slice((i * 2) % 38, (i * 2) % 38 + 2), 16) % 64];
  return 'SHA256:' + s;
}

export function signingKey(w, repo) {
  const format = cfg(repo, 'gpg.format') || 'openpgp';
  const key = cfg(repo, 'user.signingkey') || cfg(repo, 'user.signingKey');
  if (format !== 'ssh') {
    throw new GitError(`error: gpg failed to sign the data:\ngpg: skipped "${key || cfg(repo, 'user.email') || 'dev'}": No secret key\n\nfatal: failed to write commit object\nhint: this simulator signs with SSH keys: git config --global gpg.format ssh`);
  }
  if (!key) throw new GitError('error: user.signingkey needs to be set for ssh signing\nfatal: failed to write commit object');
  let pub = key.startsWith('key::') ? key.slice(5) : w.files.get(normPath(home(w, key)));
  if (pub && pub.includes('PRIVATE KEY')) pub = w.files.get(normPath(home(w, key)) + '.pub');
  if (!pub) throw new GitError(`error: Couldn't load public key ${key}: No such file or directory\n\nfatal: failed to write commit object`);
  pub = pub.trim();
  return { format: 'ssh', key: pub.split(/\s+/).slice(0, 2).join(' '), fingerprint: fingerprint(pub.split(/\s+/)[1] || pub), type: (pub.split(/\s+/)[0] || 'ssh-ed25519').replace(/^ssh-/, '').toUpperCase() };
}

const SIGNING_COMMANDS = new Set(['commit', 'merge', 'rebase', 'cherry-pick', 'revert', 'am', 'pull']);

// Runs before every git command: strips -S/-s style flags, decides whether new commits and
// tags get signed, and exposes a shallow repository's boundary to history walks.
export function prepareGit(ctx, args) {
  const w = ctx.world;
  const repo = ctx.repo;
  let i = 0;
  while (args[i] && args[i].startsWith('-')) i += (args[i] === '-C' || args[i] === '-c') ? 2 : 1;
  const sub = args[i];
  const head = args.slice(0, i + 1), rest = args.slice(i + 1);
  let signCommit = null, signTag = false;
  const kept = [];
  for (let k = 0; k < rest.length; k++) {
    const a = rest[k];
    if (SIGNING_COMMANDS.has(sub) && (a === '-S' || a === '--gpg-sign' || /^--gpg-sign=/.test(a) || /^-S\S+$/.test(a))) { signCommit = true; continue; }
    if (SIGNING_COMMANDS.has(sub) && a === '--no-gpg-sign') { signCommit = false; continue; }
    if (sub === 'tag' && (a === '-s' || a === '--sign')) { signTag = true; kept.push('-a'); continue; }
    if (sub === 'tag' && a === '-u') { signTag = true; kept.push('-a'); k++; continue; }
    kept.push(a);
  }
  w.graft = repo?.shallow || null;
  w.signing = null;
  if (repo && SIGNING_COMMANDS.has(sub) && !kept.includes('--abort') && (signCommit ?? truthy(cfg(repo, 'commit.gpgsign')))) {
    w.signing = { commit: signingKey(w, repo) };
  }
  if (repo && sub === 'tag' && (signTag || (truthy(cfg(repo, 'tag.gpgsign')) && kept.some(a => ['-a', '-m', '--annotate'].includes(a) || /^-m/.test(a))))) {
    if (!kept.includes('-d') && !kept.includes('-l') && kept.some(a => !a.startsWith('-'))) w.signing = { ...(w.signing || {}), tag: signingKey(w, repo) };
  }
  return { args: [...head, ...kept], done() { w.signing = null; w.graft = null; } };
}

// local verification needs gpg.ssh.allowedSignersFile (lines: "email key-type key")
export function verifySignature(w, repo, hash) {
  const sig = w.signatures.get(hash);
  if (!sig) return { status: 'N', lines: [] };
  const file = cfg(repo, 'gpg.ssh.allowedSignersFile') || cfg(repo, 'gpg.ssh.allowedsignersfile');
  const text = file ? w.files.get(normPath(home(w, file))) : undefined;
  if (text === undefined) return { status: 'E', lines: ['error: gpg.ssh.allowedSignersFile needs to be configured and exist for ssh signature verification'] };
  // lines are: principals [options] key-type key [comment]
  const keyed = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(l => { const p = l.split(/\s+/); const k = p.findIndex(x => /^(ssh-|ecdsa-|sk-)/.test(x)); return { principals: p[0].split(','), key: k > 0 ? p.slice(k, k + 2).join(' ') : '' }; });
  const hit = keyed.find(k => k.key === sig.key && k.principals.includes(sig.email));
  if (hit) return { status: 'G', signer: sig.email, lines: [C.green(`Good "git" signature for ${sig.email} with ${sig.type || 'ED25519'} key ${sig.fingerprint}`)] };
  return { status: 'U', lines: [C.yellow(`Good "git" signature with ${sig.type || 'ED25519'} key ${sig.fingerprint}`), C.yellow('No principal matched.')] };
}

// what github.com shows: Verified when the key is a registered signing key and the email is the account's
export function githubVerified(w, hash) {
  const sig = w.signatures.get(hash);
  if (!sig) return false;
  const emails = w.github.emails || [w.globalConfig['user.email'], `${w.github.user}@users.noreply.github.com`];
  return (w.github.signingKeys || []).some(k => k.key.split(/\s+/).slice(0, 2).join(' ') === sig.key) && emails.includes(sig.email);
}

logHooks.header.push((repo, h, o) => (o['--show-signature'] ? verifySignature(repo.world, repo, h).lines : []));
logHooks.format['G?'] = (repo, h) => verifySignature(repo.world, repo, h).status;
logHooks.format.GS = (repo, h) => verifySignature(repo.world, repo, h).signer || '';
logHooks.format.GK = (repo, h) => repo.world.signatures.get(h)?.fingerprint || '';

function verifyCmd(kind) {
  return (ctx, args) => {
    const repo = needRepo(ctx);
    const o = parseOpts(args, { bool: ['-v', '--verbose', '--raw'] });
    if (!o._.length) throw new GitError(`usage: git verify-${kind} [-v | --verbose] [--raw] <${kind}>...`, 129);
    let code = 0;
    for (const rev of o._) {
      const h = kind === 'tag' ? repo.refs['refs/tags/' + rev] : resolveCommit(repo, rev);
      if (!h) throw new GitError(`error: ${kind} '${rev}' not found.`, 1);
      const obj = ctx.world.objects.get(h);
      if (kind === 'tag' && obj.type !== 'tag') { ctx.out.push(`error: ${rev}: cannot verify a non-tag object of type commit.`); code = 1; continue; }
      const v = verifySignature(ctx.world, repo, h);
      if (o['-v'] || o['--verbose']) ctx.out.push(...stripAnsi(obj.raw || '').split('\n').filter(Boolean));
      if (v.status === 'N') { ctx.out.push('error: no signature found'); code = 1; continue; }
      ctx.out.push(...v.lines);
      if (v.status !== 'G') code = 1;
    }
    return code;
  };
}
commands['verify-commit'] = verifyCmd('commit');
commands['verify-tag'] = verifyCmd('tag');

pushGuards.push(({ world, bare, dst, isTag, newCommits }) => {
  const rule = !isTag && protectionFor(bare, dst);
  if (!rule?.requireSigned) return null;
  const bad = newCommits.filter(h => !githubVerified(world, h));
  if (!bad.length) return null;
  return { reject: [`error: GH006: Protected branch update failed for refs/heads/${dst}.`, `error: Commits must have verified signatures.`, `error: Found ${pl(bad.length, 'unverified commit')}: ${bad.map(shortHash).join(', ')}`] };
});

// ============================================================================
// large files: GitHub limits and LFS
// ============================================================================

const MB = 1024 * 1024;

function blobsOf(world, commits) {
  const seen = new Map();
  for (const h of commits) {
    const c = world.commit(h);
    const before = c.parents[0] ? world.readTreeFlat(world.commit(c.parents[0]).tree) : new Map();
    for (const [p, b] of world.readTreeFlat(c.tree)) if (before.get(p) !== b && !seen.has(b)) seen.set(b, { path: p, commit: h });
  }
  return seen;
}

pushGuards.push(({ world, bare, newCommits }) => {
  const blobs = blobsOf(world, newCommits);
  const tooBig = [], big = [], lfs = [];
  for (const [b, at] of blobs) {
    const content = world.objects.get(b).content;
    const ptr = parsePointer(content);
    if (ptr) { lfs.push({ ...ptr, path: at.path }); continue; }
    const size = contentSize(content);
    if (size > 100 * MB) tooBig.push({ path: at.path, size });
    else if (size > 50 * MB) big.push({ path: at.path, size });
  }
  if (tooBig.length) {
    return { reject: [`error: Trace: ${sha1(tooBig[0].path).slice(0, 32)}`, 'error: See https://gh.io/lfs for more information.', ...tooBig.map(f => `error: File ${f.path} is ${(f.size / MB).toFixed(2)} MB; this exceeds GitHub's file size limit of 100.00 MB`), 'error: GH001: Large files detected. You may want to try Git Large File Storage - https://git-lfs.github.com.'] };
  }
  const info = big.map(f => `remote: warning: File ${f.path} is ${(f.size / MB).toFixed(2)} MB; this is larger than GitHub's recommended maximum file size of 50.00 MB`);
  if (lfs.length) {
    const missing = lfs.filter(p => !world.lfsObjects?.has(p.oid));
    if (missing.length) return { reject: [`error: GH008: Your push referenced at least ${pl(missing.length, 'unknown Git LFS object')}:`, ...missing.map(m => `    ${m.oid}`), 'Try to push them with \'git lfs push --all\'.'] };
    bare.meta.lfs = bare.meta.lfs || new Set();
    const fresh = lfs.filter(p => !bare.meta.lfs.has(p.oid));
    for (const p of fresh) bare.meta.lfs.add(p.oid);
    if (fresh.length) info.unshift(`Uploading LFS objects: 100% (${fresh.length}/${fresh.length}), ${humanSize(fresh.reduce((n, p) => n + p.size, 0))} | 18 MB/s, done.`);
  }
  return info.length ? { info } : null;
});

// ============================================================================
// secret scanning push protection
// ============================================================================

const SECRET_PATTERNS = [
  { name: 'Stripe API Key', re: new RegExp('sk_' + 'live_[0-9A-Za-z]{10,}') },
  { name: 'Amazon AWS Access Key ID', re: new RegExp('AK' + 'IA[0-9A-Z]{16}') },
  { name: 'GitHub Personal Access Token', re: new RegExp('gh' + 'p_[0-9A-Za-z]{30,}') },
  { name: 'OpenSSH Private Key', re: new RegExp('-----BEGIN OPENSSH ' + 'PRIVATE KEY-----\\n(?!\\(private key)') },
];
export function findSecrets(text) {
  const hits = [];
  splitLines(text || '').forEach((line, i) => { for (const p of SECRET_PATTERNS) if (p.re.test(line)) hits.push({ name: p.name, line: i + 1 }); });
  return hits;
}

pushGuards.push(({ world, bare, ref, newCommits }) => {
  if (!bare.meta.pushProtection) return null;
  const found = [];
  for (const [b, at] of blobsOf(world, newCommits)) for (const s of findSecrets(world.objects.get(b).content)) found.push({ ...s, path: at.path, commit: at.commit });
  if (!found.length) return null;
  const lines = [`error: GH013: Repository rule violations found for ${ref}.`, '', '- GITHUB PUSH PROTECTION', '  —————————————————————————————————————————', '    Resolve the following violations before pushing again', '', '    - Push cannot contain secrets', ''];
  for (const f of found) lines.push(`     —— ${f.name} ————————————————————————`, '       locations:', `         - commit: ${shortHash(f.commit)}`, `           path: ${f.path}:${f.line}`, '');
  lines.push('     (?) Remove the secret from every commit that contains it, then push again.', '         https://docs.github.com/code-security/secret-scanning/working-with-secret-scanning-and-push-protection');
  return { reject: lines };
});

// ============================================================================
// history rewriting shared by `git lfs migrate` and `git filter-repo`
// ============================================================================

function rewriteHistory(w, repo, refNames, mapTree, { pruneEmpty = false, mapMessage = m => m } = {}) {
  const tips = refNames.map(r => w.peel(repo.refs[r])).filter(h => w.objects.get(h)?.type === 'commit');
  const commits = revList(w, tips).reverse();
  const map = new Map();
  for (const h of commits) {
    const c = w.commit(h);
    const parents = [...new Set(c.parents.map(p => (map.has(p) ? map.get(p) : p)).filter(Boolean))];
    const flat = mapTree(w.readTreeFlat(c.tree), c, h);
    const tree = w.writeTree(flat);
    const wasEmpty = c.parents.length === 1 && w.commit(c.parents[0]).tree === c.tree;
    if (pruneEmpty && !wasEmpty && c.parents.length <= 1) {
      if (parents.length === 1 && w.commit(parents[0]).tree === tree) { map.set(h, parents[0]); continue; }
      if (!parents.length && flat.size === 0) { map.set(h, null); continue; }
    }
    map.set(h, w.writeCommit({ tree, parents, message: mapMessage(c.message), author: c.author, committer: c.committer }));
  }
  const changed = [];
  for (const r of refNames) {
    const old = repo.refs[r];
    const obj = w.objects.get(old);
    if (obj?.type === 'tag') {
      const target = map.get(obj.object);
      if (target && target !== obj.object) { repo.refs[r] = w.writeTag({ object: target, tag: obj.tag, tagger: obj.tagger, message: obj.message }); changed.push([r, old, repo.refs[r]]); }
    } else if (map.has(old) && map.get(old) !== old) {
      if (map.get(old) === null) delete repo.refs[r]; else repo.refs[r] = map.get(old);
      changed.push([r, old, repo.refs[r]]);
    }
  }
  return { map, commits, changed };
}

function globRe(g) {
  return new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*').replace(/\?/g, '.') + '$');
}

function refreshWorktree(repo) {
  const h = headCommit(repo);
  if (!h) return;
  checkoutTree(repo, commitTreeFlat(repo, h), { force: true });
  for (const [p] of worktree(repo)) if (!repo.index.has(p) && !commitTreeFlat(repo, h).has(p)) { /* untracked files stay */ }
}

// ============================================================================
// git lfs
// ============================================================================

commands.lfs = (ctx, args) => {
  const w = ctx.world;
  const [sub, ...rest] = args;
  const out = ctx.out;
  if (!sub || sub === 'help' || sub === '--help') {
    out.push('git lfs <command> [<args>]', '', 'Git LFS is a system for managing and versioning large files in', 'association with a Git repository.', '', 'Commands: install, track, untrack, ls-files, status, migrate, pull, version');
    return 0;
  }
  if (sub === 'version' || sub === '--version') { out.push('git-lfs/3.5.1 (git-conquest simulator)'); return 0; }
  if (sub === 'install') {
    Object.assign(w.globalConfig, { 'filter.lfs.clean': 'git-lfs clean -- %f', 'filter.lfs.smudge': 'git-lfs smudge -- %f', 'filter.lfs.process': 'git-lfs filter-process', 'filter.lfs.required': 'true' });
    out.push('Updated Git hooks.', 'Git LFS initialized.');
    w.emit({ type: 'lfs-install' });
    return 0;
  }
  const repo = needWorkTree(ctx);
  const attrPath = repo.root + '/.gitattributes';
  const attrText = () => w.files.get(attrPath) || '';
  if (sub === 'track') {
    const pats = rest.filter(a => !a.startsWith('-'));
    if (!pats.length) {
      out.push('Listing tracked patterns');
      for (const r of parseAttributes(attrText())) if (r.set.filter === 'lfs') out.push(`    ${r.pattern} (.gitattributes)`);
      out.push('Listing excluded patterns');
      return 0;
    }
    let text = attrText();
    for (const p of pats) {
      if (parseAttributes(text).some(r => r.pattern === p && r.set.filter === 'lfs')) { out.push(`"${p}" already supported`); continue; }
      text += (text && !text.endsWith('\n') ? '\n' : '') + `${p} filter=lfs diff=lfs merge=lfs -text\n`;
      out.push(`Tracking "${p}"`);
    }
    w.writeFile(attrPath, text);
    w.emit({ type: 'lfs-track', patterns: pats });
    return 0;
  }
  if (sub === 'untrack') {
    let text = attrText();
    for (const p of rest) { text = text.split('\n').filter(l => !(l.split(/\s+/)[0] === p && /filter=lfs/.test(l))).join('\n'); out.push(`Untracking "${p}"`); }
    w.writeFile(attrPath, text);
    return 0;
  }
  if (sub === 'ls-files') {
    const all = rest.includes('--all');
    const tips = all ? Object.values(repo.refs).map(h => w.peel(h)) : [headCommit(repo)];
    const seen = new Set();
    for (const h of all ? revList(w, tips.filter(Boolean)) : tips.filter(Boolean)) {
      for (const [p, b] of commitTreeFlat(repo, h)) {
        const ptr = parsePointer(w.objects.get(b).content);
        if (!ptr || seen.has(p + ptr.oid)) continue;
        seen.add(p + ptr.oid);
        const local = parsePointer(w.files.get(repo.root + '/' + p)) ? '-' : '*';
        out.push(`${ptr.oid.slice(0, 10)} ${local} ${p}`);
      }
    }
    return 0;
  }
  if (sub === 'status') {
    out.push(`On branch ${currentBranch(repo) || 'HEAD'}`, '', 'Objects to be committed:', '');
    const head = headTreeFlat(repo);
    for (const [p, b] of repo.index) {
      if (head.get(p) === b) continue;
      const ptr = parsePointer(w.objects.get(b).content);
      out.push(`\t${p} (${ptr ? 'LFS: ' + ptr.oid.slice(0, 7) : 'Git: ' + shortHash(b)})`);
    }
    out.push('', 'Objects not staged for commit:', '');
    return 0;
  }
  if (sub === 'pull' || sub === 'checkout' || sub === 'fetch') {
    let n = 0;
    for (const [p, b] of repo.index) {
      const ptr = parsePointer(w.objects.get(b).content);
      if (!ptr || !lfsInstalled(w) || skipWorktree(repo, p)) continue;
      writeWork(repo, p, w.objects.get(b).content);
      n++;
    }
    if (sub !== 'fetch') out.push(`Downloading LFS objects: 100% (${n}/${n}), done.`);
    return 0;
  }
  if (sub === 'migrate') {
    const mode = rest[0];
    const opts = { include: [], everything: false };
    for (const a of rest.slice(1)) {
      if (a === '--everything') opts.everything = true;
      else if (a.startsWith('--include=')) opts.include.push(...a.slice(10).replace(/^["']|["']$/g, '').split(','));
      else if (a.startsWith('--include-ref=')) opts.ref = a.slice(14);
    }
    const refs = opts.everything ? Object.keys(repo.refs).filter(r => r.startsWith('refs/heads/') || r.startsWith('refs/tags/')) : [headRef(repo) || 'HEAD'].filter(r => r !== 'HEAD');
    if (mode === 'info') {
      const stats = new Map();
      const tips = refs.map(r => w.peel(repo.refs[r]));
      const counted = new Set();
      for (const h of revList(w, tips)) for (const [p, b] of w.readTreeFlat(w.commit(h).tree)) {
        if (counted.has(b)) continue;
        counted.add(b);
        const content = w.objects.get(b).content;
        if (parsePointer(content)) continue;
        const ext = p.includes('.') ? '*' + p.slice(p.lastIndexOf('.')) : p;
        const s = stats.get(ext) || { size: 0, files: 0 };
        s.size += contentSize(content); s.files++;
        stats.set(ext, s);
      }
      out.push('migrate: Sorting commits: ..., done.', 'migrate: Examining commits: 100%, done.');
      for (const [ext, s] of [...stats].sort((a, b) => b[1].size - a[1].size).slice(0, 5)) out.push(`${ext.padEnd(12)}${humanSize(s.size).padStart(10)}  ${pl(s.files, 'file')}`);
      return 0;
    }
    if (mode !== 'import') throw new GitError(`Error: unknown command "${mode}" for "git-lfs migrate"`, 2);
    if (!opts.include.length) throw new GitError('Error: --include is required for this simulator (e.g. --include="*.psd")', 2);
    if (!lfsInstalled(w)) throw new GitError('Error: Git LFS is not installed: run git lfs install first', 2);
    const res = computeStatus(repo);
    if (res.staged.length || res.unstaged.length) throw new GitError('Error: working tree has uncommitted changes; commit or stash them first', 2);
    const res2 = rewriteHistory(w, repo, refs, (flat) => {
      let touched = false;
      for (const [p, b] of [...flat]) {
        const content = w.objects.get(b).content;
        if (parsePointer(content)) continue;
        if (opts.include.some(g => globRe(g.includes('/') ? g : '**/' + g).test(p) || globRe(g).test(p))) { flat.set(p, w.writeBlob(lfsPointer(w, content))); touched = true; }
      }
      if (touched || flat.has('.gitattributes')) {
        let text = flat.has('.gitattributes') ? w.objects.get(flat.get('.gitattributes')).content : '';
        for (const g of opts.include) if (!parseAttributes(text).some(r => r.pattern === g)) text += (text && !text.endsWith('\n') ? '\n' : '') + `${g} filter=lfs diff=lfs merge=lfs -text\n`;
        if (touched) flat.set('.gitattributes', w.writeBlob(text));
      }
      return flat;
    });
    out.push('migrate: Sorting commits: ..., done.', `migrate: Rewriting commits: 100% (${res2.commits.length}/${res2.commits.length}), done.`);
    for (const [r, a, b] of res2.changed) out.push(`  ${r.replace(/^refs\/(heads|tags)\//, '').padEnd(10)}${shortHash(a)} -> ${shortHash(b)}`);
    out.push('migrate: Updating refs: ..., done.', 'migrate: checkout: ..., done.');
    if (headRef(repo)) logRef(repo, 'HEAD', null, headCommit(repo), 'lfs migrate');
    refreshWorktree(repo);
    w.emit({ type: 'lfs-migrate', include: opts.include });
    return 0;
  }
  throw new GitError(`Error: unknown command "${sub}" for "git-lfs"`, 2);
};

// ============================================================================
// git ls-files --eol, git add --renormalize helpers, git check-attr
// ============================================================================

const origLsFiles = commands['ls-files'];
commands['ls-files'] = (ctx, args) => {
  if (!args.includes('--eol')) return origLsFiles(ctx, args);
  const repo = needWorkTree(ctx);
  const w = ctx.world;
  for (const [p, b] of [...repo.index].sort()) {
    const a = attributesFor(repo, p);
    const attr = [a.text === true ? 'text' : a.text === 'auto' ? 'text=auto' : a.text === false ? '-text' : '', a.eol ? `eol=${a.eol}` : ''].filter(Boolean).join(' ');
    const wtc = w.files.get(repo.root + '/' + p);
    ctx.out.push(`i/${eolInfo(w.objects.get(b).content).padEnd(6)}w/${eolInfo(wtc).padEnd(6)}attr/${attr.padEnd(20)}\t${p}`);
  }
  return 0;
};

commands['check-attr'] = (ctx, args) => {
  const repo = needWorkTree(ctx);
  const all = args.includes('-a') || args.includes('--all');
  const rest = args.filter(a => !a.startsWith('-'));
  const sep = rest.indexOf('--') >= 0 ? rest.indexOf('--') : -1;
  const names = all ? [] : rest.slice(0, sep >= 0 ? sep : 1);
  const paths = all ? rest : rest.slice(sep >= 0 ? sep + 1 : 1);
  for (const p of paths) {
    const a = attributesFor(repo, relPath(ctx, p));
    const keys = all ? Object.keys(a) : names;
    for (const k of keys) ctx.out.push(`${p}: ${k}: ${a[k] === true ? 'set' : a[k] === false ? 'unset' : a[k] === undefined ? 'unspecified' : a[k]}`);
  }
  return 0;
};

// ============================================================================
// git sparse-checkout, rev-parse --is-shallow-repository, status note
// ============================================================================

function applySparse(repo) {
  const w = repo.world;
  for (const [p, b] of repo.index) {
    const abs = repo.root + '/' + p;
    if (skipWorktree(repo, p)) { if (w.files.has(abs)) removeWork(repo, p); }
    else if (!w.files.has(abs) && !isGitlink(w.objects.get(b).content)) writeWork(repo, p, w.objects.get(b).content);
  }
  w.pruneEmptyDirs(repo.root);
}

commands['sparse-checkout'] = (ctx, args) => {
  const repo = needWorkTree(ctx);
  const [sub, ...rest] = args;
  const dirs = rest.filter(a => !a.startsWith('-')).map(d => d.replace(/^\.?\/+|\/+$/g, ''));
  if (sub === 'init') { repo.sparse = repo.sparse || { cone: true, dirs: [] }; applySparse(repo); return 0; }
  if (sub === 'set') { repo.sparse = { cone: !rest.includes('--no-cone'), dirs }; applySparse(repo); ctx.world.emit({ type: 'sparse-set', dirs }); return 0; }
  if (sub === 'add') {
    if (!repo.sparse) throw new GitError('fatal: no sparse-checkout to add to');
    repo.sparse.dirs = [...new Set([...repo.sparse.dirs, ...dirs])]; applySparse(repo); ctx.world.emit({ type: 'sparse-set', dirs: repo.sparse.dirs }); return 0;
  }
  if (sub === 'list') {
    if (!repo.sparse) throw new GitError('fatal: this worktree is not sparse');
    ctx.out.push(...repo.sparse.dirs); return 0;
  }
  if (sub === 'disable') { delete repo.sparse; applySparse(repo); ctx.world.emit({ type: 'sparse-disable' }); return 0; }
  if (sub === 'reapply') { applySparse(repo); return 0; }
  throw new GitError(`usage: git sparse-checkout (init | list | set | add | reapply | disable) [<options>]`, 129);
};

const origStatus = commands.status;
commands.status = (ctx, args) => {
  const code = origStatus(ctx, args);
  const repo = ctx.repo;
  if (repo?.sparse && !args.some(a => a === '-s' || a === '--short' || a === '--porcelain')) {
    const total = repo.index.size || 1;
    const present = [...repo.index.keys()].filter(p => !skipWorktree(repo, p)).length;
    const i = ctx.out.findIndex(l => /^(On branch|HEAD detached)/.test(stripAnsi(l)));
    ctx.out.splice(i + 1, 0, `You are in a sparse checkout with ${Math.round(present / total * 100)}% of tracked files present.`, '');
  }
  return code;
};

const origRevParse = commands['rev-parse'];
commands['rev-parse'] = (ctx, args) => {
  if (args.includes('--is-shallow-repository')) { ctx.out.push(needRepo(ctx).shallow ? 'true' : 'false'); return 0; }
  return origRevParse(ctx, args);
};

// ============================================================================
// git filter-repo
// ============================================================================

commands['filter-repo'] = (ctx, args) => {
  const repo = needWorkTree(ctx);
  const w = ctx.world;
  const o = { paths: [], globs: [], invert: false, force: false, replace: null, replaceMsg: null, analyze: false, bigger: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const val = () => (a.includes('=') ? a.slice(a.indexOf('=') + 1) : args[++i]);
    if (a === '--path' || a.startsWith('--path=')) o.paths.push(val().replace(/\/$/, ''));
    else if (a === '--path-glob' || a.startsWith('--path-glob=')) o.globs.push(val());
    else if (a === '--invert-paths') o.invert = true;
    else if (a === '--force' || a === '-f') o.force = true;
    else if (a === '--replace-text' || a.startsWith('--replace-text=')) o.replace = val();
    else if (a === '--replace-message' || a.startsWith('--replace-message=')) o.replaceMsg = val();
    else if (a === '--analyze') o.analyze = true;
    else if (a === '--strip-blobs-bigger-than' || a.startsWith('--strip-blobs-bigger-than=')) o.bigger = val();
    else throw new GitError(`filter-repo: error: unrecognized arguments: ${a}`, 2);
  }
  const allRefs = Object.keys(repo.refs).filter(r => r.startsWith('refs/heads/') || r.startsWith('refs/tags/'));
  if (o.analyze) {
    const sizes = new Map(), deleted = new Set();
    const tips = allRefs.map(r => w.peel(repo.refs[r]));
    const headFlat = headTreeFlat(repo);
    for (const h of revList(w, tips)) for (const [p, b] of w.readTreeFlat(w.commit(h).tree)) {
      const s = sizes.get(p) || { size: 0, blobs: new Set() };
      if (!s.blobs.has(b)) { s.blobs.add(b); s.size += contentSize(w.objects.get(b).content); }
      sizes.set(p, s);
      if (!headFlat.has(p)) deleted.add(p);
    }
    ctx.out.push('Processed ' + pl(sizes.size, 'path') + ' in ' + pl(revList(w, tips).length, 'commit'), 'Writing reports to .git/filter-repo/analysis...done.', '', '== Largest paths in all history (also in path-all-sizes.txt) ==');
    for (const [p, s] of [...sizes].sort((a, b) => b[1].size - a[1].size).slice(0, 8)) ctx.out.push(`  ${humanSize(s.size).padStart(10)}  ${p}${deleted.has(p) ? C.dim('  (deleted, still in history)') : ''}`);
    return 0;
  }
  if (!o.force) {
    const st = computeStatus(repo);
    const fresh = (repo.reflog.HEAD || []).length <= 1 && !repo.stash.length && !st.staged.length && !st.unstaged.length;
    if (!fresh) {
      throw new GitError('Aborting: Refusing to destructively overwrite repo history since\nthis does not look like a fresh clone.\n  (expected freshly packed repo)\nPlease operate on a fresh clone instead.  If you want to proceed\nanyway, use --force.', 1);
    }
  }
  let rules = [];
  if (o.replace) {
    const text = w.files.get(normPath(o.replace.startsWith('/') ? o.replace : ctx.cwd + '/' + home(w, o.replace)));
    if (text === undefined) throw new GitError(`filter-repo: error: ${o.replace}: No such file or directory`, 1);
    rules = text.split('\n').filter(l => l.trim()).map(l => {
      const [pat, repl = '***REMOVED***'] = l.split('==>');
      if (pat.startsWith('regex:')) return { re: new RegExp(pat.slice(6), 'g'), repl };
      const lit = pat.startsWith('literal:') ? pat.slice(8) : pat;
      return { re: new RegExp(lit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), repl };
    });
  }
  const limit = o.bigger ? Number(String(o.bigger).replace(/[KMG]$/i, '')) * ({ K: 1024, M: MB, G: 1024 * MB }[String(o.bigger).slice(-1).toUpperCase()] || 1) : null;
  const pathHit = p => o.paths.some(x => p === x || p.startsWith(x + '/')) || o.globs.some(g => globRe(g).test(p));
  const filtered = !!(o.paths.length || o.globs.length);
  const res = rewriteHistory(w, repo, allRefs, (flat) => {
    for (const [p, b] of [...flat]) {
      if (filtered && (o.invert ? pathHit(p) : !pathHit(p))) { flat.delete(p); continue; }
      const content = w.objects.get(b).content;
      if (limit && contentSize(content) > limit) { flat.delete(p); continue; }
      if (rules.length && typeof content === 'string' && !looksBinary(content)) {
        let next = content;
        for (const r of rules) next = next.replace(r.re, r.repl);
        if (next !== content) flat.set(p, w.writeBlob(next));
      }
    }
    return flat;
  }, { pruneEmpty: true, mapMessage: m => (o.replaceMsg ? m : m) });
  // filter-repo removes origin so the rewritten history is not pushed back by accident
  const originUrl = repo.config['remote.origin.url'];
  for (const k of Object.keys(repo.config)) if (k.startsWith('remote.origin.')) delete repo.config[k];
  for (const k of Object.keys(repo.config)) if (/^branch\..*\.(remote|merge)$/.test(k)) delete repo.config[k];
  for (const r of Object.keys(repo.refs)) if (r.startsWith('refs/remotes/')) delete repo.refs[r];
  repo.reflog = {};
  repo.stash = [];
  const n = res.commits.length;
  ctx.out.push(`Parsed ${n} commits`, 'New history written in 0.04 seconds; now repacking/cleaning...', 'Repacking your repo and cleaning out old unneeded objects');
  refreshWorktree(repo);
  const h = headCommit(repo);
  if (h) ctx.out.push(`HEAD is now at ${shortHash(h)} ${firstLine(w.commit(h).message)}`);
  if (originUrl) ctx.out.push(C.yellow(`NOTICE: Removing 'origin' remote; see 'Why is my origin removed?'`), C.yellow(`        in the manual if you want to push back there.`), C.yellow(`        (was ${originUrl})`));
  ctx.out.push(`Completely finished after 0.21 seconds.`);
  w.emit({ type: 'filter-repo', changed: res.changed.length, paths: o.paths, replace: !!o.replace });
  return 0;
};

// ============================================================================
// git rerere
// ============================================================================

const rrOn = repo => truthy(cfg(repo, 'rerere.enabled'));
const rrState = repo => (repo.rr = repo.rr || { pending: {}, resolved: {} });

function conflictBlocks(text) {
  const blocks = [];
  const lines = splitLines(text);
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('<<<<<<<')) continue;
    const start = i; const a = [], b = []; let side = a;
    for (i++; i < lines.length && !lines[i].startsWith('>>>>>>>'); i++) {
      if (lines[i].startsWith('|||||||')) { side = null; continue; }
      if (lines[i].startsWith('=======')) { side = b; continue; }
      if (side) side.push(lines[i]);
    }
    blocks.push({ start, end: i, a, b });
  }
  return { lines, blocks };
}

function conflictId(text) {
  const { blocks } = conflictBlocks(text);
  if (!blocks.length) return null;
  return sha1(blocks.map(k => [k.a.join('\n'), k.b.join('\n')].sort().join('\u0001')).join('\u0002'));
}

conflictHooks.push((repo, path, c) => {
  if (!rrOn(repo) || c.kind === 'modify/delete') return null;
  const id = conflictId(c.text);
  if (!id) return null;
  const st = rrState(repo);
  const rec = st.resolved[id];
  if (rec) {
    const { lines, blocks } = conflictBlocks(c.text);
    // replay each recorded block resolution in place
    let text = null;
    if (blocks.length === rec.blocks.length) {
      const outLines = [];
      let pos = 0;
      blocks.forEach((k, i) => { outLines.push(...lines.slice(pos, k.start), ...rec.blocks[i]); pos = k.end + 1; });
      outLines.push(...lines.slice(pos));
      text = outLines.join('\n') + (c.text.endsWith('\n') ? '\n' : '');
    }
    if (text !== null) {
      const auto = truthy(cfg(repo, 'rerere.autoupdate'));
      repo.world.emit({ type: 'rerere-reuse', path });
      return { text, stage: auto, note: auto ? `Staged '${path}' using previous resolution.` : `Resolved '${path}' using previous resolution.` };
    }
  }
  st.pending[path] = { id, pre: c.text };
  return { note: `Recorded preimage for '${path}'` };
});

// how the user resolved each conflict block: the text between the unchanged lines around it
function recordResolution(repo, path, resolved) {
  const st = rrState(repo);
  const p = st.pending[path];
  if (!p) return false;
  const { lines, blocks } = conflictBlocks(p.pre);
  const post = splitLines(resolved);
  const res = [];
  let cursor = 0;
  for (let i = 0; i < blocks.length; i++) {
    const before = lines.slice(i === 0 ? 0 : blocks[i - 1].end + 1, blocks[i].start);
    const after = lines.slice(blocks[i].end + 1, blocks[i + 1] ? blocks[i + 1].start : lines.length);
    cursor += before.length;
    let end = post.length;
    if (after.length) {
      for (let j = cursor; j <= post.length - after.length; j++) if (after.every((l, k) => post[j + k] === l)) { end = j; break; }
    } else end = post.length;
    res.push(post.slice(cursor, end));
    cursor = end;
  }
  st.resolved[p.id] = { blocks: res };
  delete st.pending[path];
  return true;
}

const origAdd = commands.add;
commands.add = (ctx, args) => {
  const repo = ctx.repo;
  const before = repo && rrOn(repo) ? [...repo.conflicts.keys()] : [];
  const code = origAdd(ctx, args);
  for (const p of before) {
    if (repo.conflicts.has(p) || !repo.index.has(p)) continue;
    if (recordResolution(repo, p, ctx.world.objects.get(repo.index.get(p)).content)) ctx.out.push(`Recorded resolution for '${p}'.`);
  }
  return code;
};

commands.rerere = (ctx, args) => {
  const repo = needWorkTree(ctx);
  const st = rrState(repo);
  const [sub, ...rest] = args;
  if (!sub) {
    for (const p of Object.keys(st.pending)) if (!repo.conflicts.has(p) && repo.index.has(p) && recordResolution(repo, p, ctx.world.objects.get(repo.index.get(p)).content)) ctx.out.push(`Recorded resolution for '${p}'.`);
    return 0;
  }
  if (sub === 'status') { ctx.out.push(...Object.keys(st.pending)); return 0; }
  if (sub === 'remaining') { ctx.out.push(...repo.conflicts.keys()); return 0; }
  if (sub === 'diff') {
    for (const [p, v] of Object.entries(st.pending)) {
      const cur = ctx.world.files.get(repo.root + '/' + p) ?? '';
      ctx.out.push(C.bold(`--- a/${p}`), C.bold(`+++ b/${p}`), ...unifiedHunks(v.pre, cur).map(l => (l.startsWith('+') ? C.green(l) : l.startsWith('-') ? C.red(l) : l)));
    }
    return 0;
  }
  if (sub === 'forget') {
    for (const p of rest) {
      const text = ctx.world.files.get(repo.root + '/' + p) ?? '';
      const id = conflictId(text) || st.pending[p]?.id;
      if (id && st.resolved[id]) { delete st.resolved[id]; ctx.out.push(`Updated preimage for '${p}'`, `Forgot resolution for '${p}'`); }
    }
    return 0;
  }
  if (sub === 'clear') { st.pending = {}; return 0; }
  if (sub === 'gc') { return 0; }
  throw new GitError(`usage: git rerere [clear | forget <path>... | diff | status | remaining | gc]`, 129);
};

// ============================================================================
// patch ids, git cherry, git range-diff, git merge-base
// ============================================================================

function commitPatch(w, h) {
  const c = w.commit(h);
  const before = c.parents[0] ? w.readTreeFlat(w.commit(c.parents[0]).tree) : new Map();
  const lines = [];
  for (const p of treePairs(before, w.readTreeFlat(c.tree))) {
    lines.push(`@@ ${p.path}`);
    const a = p.old ? w.objects.get(p.old).content : '', b = p.new ? w.objects.get(p.new).content : '';
    for (const l of unifiedHunks(a, b, 0)) if (l[0] === '+' || l[0] === '-') lines.push(l);
  }
  return lines;
}
const patchId = (w, h) => sha1(commitPatch(w, h).join('\n'));

commands.cherry = (ctx, args) => {
  const repo = needRepo(ctx);
  const w = ctx.world;
  const o = parseOpts(args, { bool: ['-v', '--abbrev'] });
  const upRev = o._[0] || (() => { const b = currentBranch(repo); const k = repo.config[`branch.${b}.merge`]; const r = repo.config[`branch.${b}.remote`]; if (!k) throw new GitError('fatal: could not find default upstream branch'); return `${r}/${k.slice(11)}`; })();
  const up = resolveCommit(repo, upRev), head = resolveCommit(repo, o._[1] || 'HEAD');
  const limit = o._[2] ? resolveCommit(repo, o._[2]) : null;
  const theirs = new Set(revList(w, [up], [head]).map(h => patchId(w, h)));
  for (const h of revList(w, [head], [up, ...(limit ? [limit] : [])]).reverse()) {
    if (w.commit(h).parents.length > 1) continue;
    const sign = theirs.has(patchId(w, h)) ? '-' : '+';
    ctx.out.push(`${sign === '+' ? C.green('+') : C.dim('-')} ${o['-v'] ? shortHash(h) : h}${o['-v'] ? ' ' + firstLine(w.commit(h).message) : ''}`);
  }
  return 0;
};

function parseRange(repo, spec) {
  const w = repo.world;
  if (spec.includes('...')) { const [a, b] = spec.split('...'); const A = resolveCommit(repo, a || 'HEAD'), B = resolveCommit(repo, b || 'HEAD'); const mb = mergeBase(w, A, B); return [[mb, A], [mb, B]]; }
  const [a, b] = spec.split('..');
  return [resolveCommit(repo, a), resolveCommit(repo, b || 'HEAD')];
}

commands['range-diff'] = (ctx, args) => {
  const repo = needRepo(ctx);
  const w = ctx.world;
  const pos = args.filter(a => !a.startsWith('-'));
  let r1, r2;
  if (pos.length === 1 && pos[0].includes('...')) [r1, r2] = parseRange(repo, pos[0]);
  else if (pos.length === 2) { r1 = parseRange(repo, pos[0]); r2 = parseRange(repo, pos[1]); }
  else if (pos.length === 3) { const base = resolveCommit(repo, pos[0]); r1 = [base, resolveCommit(repo, pos[1])]; r2 = [base, resolveCommit(repo, pos[2])]; }
  else throw new GitError('usage: git range-diff <base> <old-tip> <new-tip>\n   or: git range-diff <old-tip>...<new-tip>\n   or: git range-diff <base1>..<old-tip> <base2>..<new-tip>', 129);
  const A = revList(w, [r1[1]], [r1[0]]).reverse().filter(h => w.commit(h).parents.length < 2);
  const B = revList(w, [r2[1]], [r2[0]]).reverse().filter(h => w.commit(h).parents.length < 2);
  const pa = A.map(h => ({ h, id: patchId(w, h), subj: firstLine(w.commit(h).message), patch: commitPatch(w, h) }));
  const pb = B.map(h => ({ h, id: patchId(w, h), subj: firstLine(w.commit(h).message), patch: commitPatch(w, h) }));
  const pair = new Map();
  for (const x of pa) { const m = pb.find(y => y.id === x.id && ![...pair.values()].includes(y)); if (m) pair.set(x, m); }
  for (const x of pa) { if (pair.has(x)) continue; const m = pb.find(y => y.subj === x.subj && ![...pair.values()].includes(y)); if (m) pair.set(x, m); }
  const num = (arr, x) => String(arr.indexOf(x) + 1).padStart(String(Math.max(pa.length, pb.length)).length);
  const dash = '-'.repeat(7);
  let ia = 0;
  const shownA = new Set();
  const flushA = (upTo) => {
    while (ia < pa.length && (upTo === null || !pair.has(pa[ia]) || pb.indexOf(pair.get(pa[ia])) < upTo)) {
      const x = pa[ia++];
      if (pair.has(x) || shownA.has(x)) continue;
      shownA.add(x);
      ctx.out.push(C.red(`${num(pa, x)}:  ${shortHash(x.h)} < ${'-'.padStart(num(pa, x).length)}:  ${dash} ${x.subj}`));
    }
  };
  pb.forEach((y, j) => {
    const x = [...pair].find(([, v]) => v === y)?.[0];
    flushA(j);
    if (!x) { ctx.out.push(C.green(`${'-'.padStart(num(pb, y).length)}:  ${dash} > ${num(pb, y)}:  ${shortHash(y.h)} ${y.subj}`)); return; }
    const same = x.id === y.id && x.subj === y.subj && w.commit(x.h).message === w.commit(y.h).message;
    ctx.out.push(`${num(pa, x)}:  ${shortHash(x.h)} ${same ? '=' : C.yellow('!')} ${num(pb, y)}:  ${shortHash(y.h)} ${y.subj}`);
    if (!same) {
      if (w.commit(x.h).message !== w.commit(y.h).message) {
        ctx.out.push('    @@ Metadata', ...splitLines(w.commit(x.h).message).filter(l => !splitLines(w.commit(y.h).message).includes(l)).map(l => C.red(`    -    ${l}`)), ...splitLines(w.commit(y.h).message).filter(l => !splitLines(w.commit(x.h).message).includes(l)).map(l => C.green(`    +    ${l}`)));
      }
      const onlyA = x.patch.filter(l => !l.startsWith('@@') && !y.patch.includes(l));
      const onlyB = y.patch.filter(l => !l.startsWith('@@') && !x.patch.includes(l));
      if (onlyA.length || onlyB.length) {
        const files = [...new Set([...x.patch, ...y.patch].filter(l => l.startsWith('@@')))];
        ctx.out.push(...files.map(f => `    ${f}`), ...onlyA.map(l => C.red(`    -${l}`)), ...onlyB.map(l => C.green(`    +${l}`)));
      }
    }
  });
  flushA(null);
  return 0;
};

commands['merge-base'] = (ctx, args) => {
  const repo = needRepo(ctx);
  const w = ctx.world;
  const o = parseOpts(args, { bool: ['--is-ancestor', '--all', '-a', '--fork-point', '--octopus'] });
  const revs = o._.map(r => resolveCommit(repo, r));
  if (o['--is-ancestor']) {
    if (revs.length !== 2) throw new GitError('usage: git merge-base --is-ancestor <commit> <commit>', 129);
    return isAncestor(w, revs[0], revs[1]) ? 0 : 1;
  }
  if (revs.length < 2) throw new GitError('usage: git merge-base [-a | --all] <commit> <commit>...', 129);
  let mb = revs[0];
  for (const r of revs.slice(1)) mb = mb && mergeBase(w, mb, r);
  if (!mb) return 1;
  ctx.out.push(mb);
  return 0;
};

// ============================================================================
// format-patch, am, apply
// ============================================================================

function rfcDate(ts) {
  const d = new Date(ts * 1000);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const p = n => String(n).padStart(2, '0');
  return `${days[d.getUTCDay()]}, ${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} +0000`;
}

export function patchText(w, before, after) {
  const out = [];
  for (const p of treePairs(before, after)) {
    const a = p.old ? w.objects.get(p.old).content : '', b = p.new ? w.objects.get(p.new).content : '';
    out.push(`diff --git a/${p.path} b/${p.path}`);
    if (!p.old) out.push('new file mode 100644', `index 0000000..${shortHash(p.new)}`);
    else if (!p.new) out.push('deleted file mode 100644', `index ${shortHash(p.old)}..0000000`);
    else out.push(`index ${shortHash(p.old)}..${shortHash(p.new)} 100644`);
    out.push(p.old ? `--- a/${p.path}` : '--- /dev/null', p.new ? `+++ b/${p.path}` : '+++ /dev/null');
    out.push(...unifiedHunks(a, b));
  }
  return out;
}

commands['format-patch'] = (ctx, args) => {
  const repo = needWorkTree(ctx);
  const w = ctx.world;
  const numArg = args.find(a => /^-\d+$/.test(a));
  const o = parseOpts(args.filter(a => a !== numArg), { bool: ['--stdout', '-s', '--signoff', '--cover-letter', '-n', '--numbered'], val: ['-o', '--output-directory', '-v', '--reroll-count', '--subject-prefix'] });
  let commits;
  if (numArg) {
    const n = Number(numArg.slice(1));
    const start = resolveCommit(repo, o._[0] || 'HEAD');
    commits = revList(w, [start], [], { firstParent: true }).slice(0, n).reverse();
  } else if (o._[0]) {
    const spec = o._[0];
    if (spec.includes('..')) { const [a, b] = spec.split('..'); commits = revList(w, [resolveCommit(repo, b || 'HEAD')], [resolveCommit(repo, a)]).reverse(); }
    else commits = revList(w, [headCommit(repo)], [resolveCommit(repo, spec)]).reverse();
  } else throw new GitError('usage: git format-patch [<options>] [<since> | <revision-range>]', 129);
  commits = commits.filter(h => w.commit(h).parents.length < 2);
  const ver = o['-v'] || o['--reroll-count'];
  const prefix = (o['--subject-prefix'] || 'PATCH') + (ver ? ` v${ver}` : '');
  const dir = o['-o'] || o['--output-directory'];
  const id = identity(repo);
  const files = [];
  commits.forEach((h, i) => {
    const c = w.commit(h);
    const before = c.parents[0] ? w.readTreeFlat(w.commit(c.parents[0]).tree) : new Map();
    const after = w.readTreeFlat(c.tree);
    const [subj, ...bodyLines] = c.message.split('\n');
    let body = bodyLines.join('\n').replace(/^\n+/, '');
    const sob = `Signed-off-by: ${id.name} <${id.email}>`;
    if ((o['-s'] || o['--signoff']) && !c.message.includes(sob)) body = (body ? body + '\n\n' : '') + sob;
    const nums = commits.length > 1 || o['-n'] ? ` ${i + 1}/${commits.length}` : '';
    const pairs = treePairs(before, after);
    const text = [
      `From ${h} Mon Sep 17 00:00:00 2001`, `From: ${c.author.name} <${c.author.email}>`, `Date: ${rfcDate(c.author.time)}`, `Subject: [${prefix}${nums}] ${subj}`, '',
      ...(body ? [body, ''] : []), '---', ...statLines(w, pairs).map(l => stripAnsi(l)), '', ...patchText(w, before, after), '-- ', GIT_VERSION, '',
    ].join('\n');
    const name = `${ver ? `v${ver}-` : ''}${String(i + 1).padStart(4, '0')}-${subj.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 52)}.patch`;
    files.push({ name, text });
  });
  if (o['--stdout']) { for (const f of files) ctx.out.push(...splitLines(f.text)); return 0; }
  const base = normPath(dir ? (dir.startsWith('/') ? dir : ctx.cwd + '/' + home(w, dir)) : ctx.cwd);
  w.dirs.add(base);
  for (const f of files) { w.writeFile(base + '/' + f.name, f.text); ctx.out.push((dir ? dir.replace(/\/$/, '') + '/' : '') + f.name); }
  w.emit({ type: 'format-patch', count: files.length, names: files.map(f => f.name) });
  return 0;
};

export function parseMbox(text) {
  const msgs = [];
  const chunks = text.split(/^(?=From [0-9a-f]{40} )/m).filter(c => c.trim());
  for (const chunk of chunks.length ? chunks : [text]) {
    const lines = chunk.split('\n');
    const m = { from: null, date: null, subject: '', body: [], files: [] };
    let i = 0;
    if (/^From [0-9a-f]{40} /.test(lines[0])) {
      for (i = 1; i < lines.length && lines[i] !== ''; i++) {
        const l = lines[i];
        if (l.startsWith('From: ')) { const mm = l.slice(6).match(/^(.*?)\s*<(.*)>$/); m.from = mm ? { name: mm[1], email: mm[2] } : { name: l.slice(6), email: '' }; }
        else if (l.startsWith('Date: ')) m.date = Math.floor(Date.parse(l.slice(6)) / 1000) || null;
        else if (l.startsWith('Subject: ')) m.subject = l.slice(9).replace(/^\[[^\]]*\]\s*/, '');
      }
      for (i++; i < lines.length && lines[i] !== '---' && !lines[i].startsWith('diff --git'); i++) m.body.push(lines[i]);
    }
    let file = null, hunk = null;
    for (; i < lines.length; i++) {
      const l = lines[i];
      if (l === '-- ') break;
      if (l.startsWith('diff --git ')) { const mm = l.match(/^diff --git a\/(.*) b\/(.*)$/); file = { path: mm[2], oldPath: mm[1], newFile: false, deleted: false, index: null, hunks: [] }; m.files.push(file); hunk = null; continue; }
      if (!file) continue;
      if (l.startsWith('new file mode')) file.newFile = true;
      else if (l.startsWith('deleted file mode')) file.deleted = true;
      else if (l.startsWith('index ')) file.index = l.slice(6).split(' ')[0].split('..');
      else if (l.startsWith('--- ') || l.startsWith('+++ ')) { /* names already known */ }
      else if (l.startsWith('@@')) { const mm = l.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/); hunk = { oldStart: Number(mm[1]), lines: [] }; file.hunks.push(hunk); }
      else if (hunk && (l[0] === ' ' || l[0] === '+' || l[0] === '-')) hunk.lines.push(l);
      else if (hunk && l === '') hunk.lines.push(' ');
    }
    while (m.body.length && !m.body[m.body.length - 1].trim()) m.body.pop();
    msgs.push(m);
  }
  return msgs;
}

export function applyHunks(content, hunks, reverse = false) {
  const lines = content === '' ? [] : splitLines(content);
  let offset = 0;
  for (const hk of hunks) {
    const hl = reverse ? hk.lines.map(l => (l[0] === '+' ? '-' + l.slice(1) : l[0] === '-' ? '+' + l.slice(1) : l)) : hk.lines;
    const oldL = hl.filter(l => l[0] !== '+').map(l => l.slice(1));
    const newL = hl.filter(l => l[0] !== '-').map(l => l.slice(1));
    const want = Math.max(0, hk.oldStart - 1 + offset);
    let at = -1;
    for (let d = 0; d <= lines.length && at < 0; d++) {
      for (const cand of [want - d, want + d]) if (cand >= 0 && cand + oldL.length <= lines.length && oldL.every((l, k) => lines[cand + k] === l)) { at = cand; break; }
    }
    if (at < 0 && !(oldL.length === 0)) return { ok: false, line: hk.oldStart };
    if (at < 0) at = Math.min(want, lines.length);
    lines.splice(at, oldL.length, ...newL);
    offset += newL.length - oldL.length;
  }
  return { ok: true, text: lines.length ? lines.join('\n') + '\n' : '' };
}

function applyPatchFiles(ctx, repo, files, { index = true, reverse = false, threeWay = false } = {}) {
  const w = ctx.world;
  const results = [];
  for (const f of files) {
    const abs = repo.root + '/' + f.path;
    const cur = index ? (repo.index.has(f.path) ? w.objects.get(repo.index.get(f.path)).content : undefined) : w.files.get(abs);
    if ((f.newFile && !reverse) && cur !== undefined) return { ok: false, err: [`error: ${f.path}: already exists in ${index ? 'index' : 'working directory'}`] };
    if (!(f.newFile && !reverse) && cur === undefined) return { ok: false, err: [`error: ${f.path}: does not exist in ${index ? 'index' : 'working directory'}`] };
    const r = applyHunks(cur ?? '', f.hunks, reverse);
    if (!r.ok) {
      if (threeWay && f.index) {
        const baseBlob = [...w.objects.keys()].find(k => k.startsWith(f.index[0]) && w.objects.get(k).type === 'blob');
        const base = baseBlob ? w.objects.get(baseBlob).content : null;
        const theirs = base !== null ? applyHunks(base, f.hunks) : null;
        if (theirs?.ok) { results.push({ path: f.path, threeWay: { base: baseBlob, theirs: w.writeBlob(theirs.text) } }); continue; }
      }
      return { ok: false, err: [`error: patch failed: ${f.path}:${r.line}`, `error: ${f.path}: patch does not apply`] };
    }
    results.push({ path: f.path, text: (f.deleted && !reverse) || (f.newFile && reverse) ? null : r.text });
  }
  return { ok: true, results };
}

commands.apply = (ctx, args) => {
  const repo = needWorkTree(ctx);
  const w = ctx.world;
  const o = parseOpts(args, { bool: ['--check', '--stat', '--index', '--cached', '-R', '--reverse', '-v', '--3way', '-3'] });
  const name = o._[0];
  const text = name ? w.files.get(normPath(ctx.cwd + '/' + name)) : ctx.stdin;
  if (text === undefined || text === null) throw new GitError(`error: can't open patch '${name}': No such file or directory`);
  const files = parseMbox(text).flatMap(m => m.files);
  if (o['--stat']) { for (const f of files) { const add = f.hunks.flatMap(h => h.lines).filter(l => l[0] === '+').length, del = f.hunks.flatMap(h => h.lines).filter(l => l[0] === '-').length; ctx.out.push(` ${f.path} | ${add + del} ${C.green('+'.repeat(add))}${C.red('-'.repeat(del))}`); } return 0; }
  const reverse = o['-R'] || o['--reverse'];
  const res = applyPatchFiles(ctx, repo, files, { index: !!(o['--index'] || o['--cached']), reverse });
  if (!res.ok) { ctx.out.push(...res.err.map(C.red)); return 1; }
  if (o['--check']) return 0;
  for (const r of res.results) {
    if (!o['--cached']) { if (r.text === null) removeWork(repo, r.path); else writeWork(repo, r.path, r.text); }
    if (o['--index'] || o['--cached']) { if (r.text === null) repo.index.delete(r.path); else repo.index.set(r.path, w.writeBlob(r.text)); }
  }
  w.emit({ type: 'apply', files: files.map(f => f.path) });
  return 0;
};

function amCommit(ctx, repo, msg, signoff) {
  const w = ctx.world;
  const id = identity(repo);
  w.tick(2);
  let message = [msg.subject, msg.body.length ? '\n' + msg.body.join('\n') : ''].join('\n').replace(/\n+$/, '');
  const sob = `Signed-off-by: ${id.name} <${id.email}>`;
  if (signoff && !message.includes(sob)) message += (/\nSigned-off-by: /.test(message) ? '\n' : '\n\n') + sob;
  const head = headCommit(repo);
  const author = msg.from ? { ...msg.from, time: msg.date || w.time } : { ...id, time: w.time };
  const h = makeCommit(repo, { message, parents: head ? [head] : [], tree: indexTree(repo), author });
  setHeadCommit(repo, h, `am: ${msg.subject}`);
  return h;
}

function amRun(ctx, repo) {
  const w = ctx.world;
  const s = repo.state;
  while (s.next < s.msgs.length) {
    const msg = s.msgs[s.next];
    ctx.out.push(`Applying: ${msg.subject}`);
    const res = applyPatchFiles(ctx, repo, msg.files, { index: true, threeWay: s.threeWay });
    if (!res.ok) {
      ctx.out.push(...res.err, `Patch failed at ${String(s.next + 1).padStart(4, '0')} ${msg.subject}`,
        C.yellow(`hint: Use 'git am --show-current-patch=diff' to see the failed patch`),
        C.yellow(`hint: When you have resolved this problem, run "git am --continue".`),
        C.yellow(`hint: If you prefer to skip this patch, run "git am --skip" instead.`),
        C.yellow(`hint: To restore the original branch and stop patching, run "git am --abort".`));
      w.emit({ type: 'am-failed', subject: msg.subject });
      return 128;
    }
    let conflicted = false;
    for (const r of res.results) {
      if (r.threeWay) {
        const ours = new Map(repo.index);
        const base = new Map(ours); base.set(r.path, r.threeWay.base);
        const theirs = new Map(ours); theirs.set(r.path, r.threeWay.theirs);
        const m = mergeTrees(w, base, ours, theirs, { ours: 'HEAD', theirs: msg.subject });
        ctx.out.push('Using index info to reconstruct a base tree...', 'Falling back to patching base and 3-way merge...');
        applyMerge(repo, ours, m);
        if (m.conflicts.length) { conflicted = true; ctx.out.push(`CONFLICT (content): Merge conflict in ${r.path}`); }
        continue;
      }
      if (r.text === null) { repo.index.delete(r.path); removeWork(repo, r.path); } else { repo.index.set(r.path, w.writeBlob(r.text)); writeWork(repo, r.path, r.text); }
    }
    if (conflicted) {
      ctx.out.push(`error: Failed to merge in the changes.`, `Patch failed at ${String(s.next + 1).padStart(4, '0')} ${msg.subject}`, C.yellow(`hint: When you have resolved this problem, run "git am --continue".`));
      return 128;
    }
    amCommit(ctx, repo, msg, s.signoff);
    s.next++;
  }
  repo.state = null;
  w.emit({ type: 'am-done', count: s.msgs.length });
  return 0;
}

commands.am = (ctx, args) => {
  const repo = needWorkTree(ctx);
  const w = ctx.world;
  const o = parseOpts(args, { bool: ['--continue', '--abort', '--skip', '-s', '--signoff', '-3', '--3way', '--resolved', '-q'], val: ['--show-current-patch'] });
  const s = repo.state?.type === 'am' ? repo.state : null;
  if (o['--abort']) {
    if (!s) throw new GitError('fatal: Resolve operation not in progress, we are not resuming.');
    checkoutTree(repo, commitTreeFlat(repo, s.orig), { force: true });
    setHeadCommit(repo, s.orig, 'am --abort');
    repo.state = null;
    return 0;
  }
  if (args.some(a => a.startsWith('--show-current-patch'))) {
    if (!s) throw new GitError('fatal: Resolve operation not in progress, we are not resuming.');
    const m = s.msgs[s.next];
    ctx.out.push(`Subject: ${m.subject}`, '', ...m.files.flatMap(f => [`diff --git a/${f.path} b/${f.path}`, ...f.hunks.flatMap(h => [`@@ -${h.oldStart} @@`, ...h.lines])]));
    return 0;
  }
  if (o['--skip']) {
    if (!s) throw new GitError('fatal: Resolve operation not in progress, we are not resuming.');
    checkoutTree(repo, headTreeFlat(repo), { force: true });
    s.next++;
    return amRun(ctx, repo);
  }
  if (o['--continue'] || o['--resolved']) {
    if (!s) throw new GitError('fatal: Resolve operation not in progress, we are not resuming.');
    if (repo.conflicts.size) { ctx.out.push(...[...repo.conflicts.keys()].map(p => `${p}: needs merge`)); return 1; }
    const st = computeStatus(repo);
    if (!st.staged.length) { ctx.out.push(`Applying: ${s.msgs[s.next].subject}`, 'No changes - did you forget to use \'git add\'?', 'If there is nothing left to stage, chances are that something else', 'already introduced the same changes; you might want to skip this patch.'); return 1; }
    ctx.out.push(`Applying: ${s.msgs[s.next].subject}`);
    amCommit(ctx, repo, s.msgs[s.next], s.signoff);
    s.next++;
    return amRun(ctx, repo);
  }
  if (s) throw new GitError('error: previous rebase directory .git/rebase-apply still exists but mbox given.', 1);
  if (repo.state) throw new GitError(`fatal: It seems that there is already a ${repo.state.type} in progress.`);
  requireIdentity(repo);
  const st = computeStatus(repo);
  if (st.staged.length) throw new GitError('error: Dirty index: cannot apply patches (dirty: ' + st.staged.map(x => x.path).join(' ') + ')', 1);
  let text = '';
  if (o._.length) {
    for (const f of o._) {
      const c = w.files.get(normPath(ctx.cwd + '/' + home(w, f)));
      if (c === undefined) throw new GitError(`fatal: could not open '${f}' for reading: No such file or directory`);
      text += c + (c.endsWith('\n') ? '' : '\n');
    }
  } else if (ctx.stdin) text = ctx.stdin;
  else throw new GitError('fatal: no patches given (git am reads mbox files or a patch on stdin)', 128);
  const msgs = parseMbox(text).filter(m => m.files.length);
  if (!msgs.length) throw new GitError('Patch format detection failed.', 128);
  repo.state = { type: 'am', msgs, next: 0, orig: headCommit(repo), signoff: !!(o['-s'] || o['--signoff']), threeWay: !!(o['-3'] || o['--3way']) };
  return amRun(ctx, repo);
};

// ============================================================================
// git notes
// ============================================================================

function notesRef(o) { const r = o['--ref'] || 'commits'; return r.startsWith('refs/') ? r : 'refs/notes/' + r; }
export function noteFor(repo, hash, ref = 'refs/notes/commits') {
  const n = repo.refs[ref];
  if (!n) return null;
  const flat = repo.world.readTreeFlat(repo.world.commit(n).tree);
  const b = flat.get(hash);
  return b ? repo.world.objects.get(b).content : null;
}
function writeNote(repo, ref, hash, text, why) {
  const w = repo.world;
  const prev = repo.refs[ref];
  const flat = prev ? w.readTreeFlat(w.commit(prev).tree) : new Map();
  if (text === null) flat.delete(hash); else flat.set(hash, w.writeBlob(text.endsWith('\n') ? text : text + '\n'));
  const id = identity(repo);
  w.tick(1);
  const sig = { ...id, time: w.time };
  const signing = w.signing; w.signing = null;
  repo.refs[ref] = w.writeCommit({ tree: w.writeTree(flat), parents: prev ? [prev] : [], message: `Notes ${why} by 'git notes ${why === 'added' ? 'add' : why === 'removed' ? 'remove' : 'append'}'`, author: sig, committer: sig });
  w.signing = signing;
}

commands.notes = (ctx, args) => {
  const repo = needRepo(ctx);
  const w = ctx.world;
  const known = ['add', 'append', 'show', 'list', 'remove', 'edit', 'copy', 'prune'];
  const sub = known.includes(args.find(a => !a.startsWith('-'))) ? args.find(a => !a.startsWith('-')) : 'list';
  const o = parseOpts(args.filter(a => a !== sub), { bool: ['-f', '--force'], val: ['-m', '--message', '-F', '--file', '--ref'] });
  const ref = notesRef(o);
  const target = o._[0] ? resolveCommit(repo, o._[0]) : headCommit(repo);
  const msg = o.mList ? o.mList.join('\n\n') : o['--message'] || (o['-F'] || o['--file'] ? w.files.get(normPath(ctx.cwd + '/' + (o['-F'] || o['--file']))) : null);
  const existing = target ? noteFor(repo, target, ref) : null;
  if (sub === 'list') {
    if (o._[0]) { if (!existing) throw new GitError(`error: no note found for object ${target}.`, 1); ctx.out.push(w.blobHash(existing)); return 0; }
    const n = repo.refs[ref];
    if (!n) return 0;
    for (const [h, b] of w.readTreeFlat(w.commit(n).tree)) ctx.out.push(`${b} ${h}`);
    return 0;
  }
  if (sub === 'show') { if (!existing) throw new GitError(`error: no note found for object ${target}.`, 1); ctx.out.push(...splitLines(existing)); return 0; }
  if (sub === 'remove') { if (!existing) throw new GitError(`error: Object ${target} has no note`, 1); writeNote(repo, ref, target, null, 'removed'); ctx.out.push(`Removing note for object ${target}`); return 0; }
  const save = (text, why) => { writeNote(repo, ref, target, text, why); w.emit({ type: 'note', commit: target, text }); };
  if (sub === 'add' || sub === 'append' || sub === 'edit') {
    if (sub === 'add' && existing && !(o['-f'] || o['--force'])) throw new GitError(`error: Cannot add notes. Found existing notes for object ${target}. Use '-f' to overwrite existing notes`, 1);
    if (msg !== null && msg !== undefined && sub !== 'edit') {
      if (sub === 'add' && existing) ctx.out.push(`Overwriting existing notes for object ${target}`);
      save(sub === 'append' && existing ? existing.replace(/\n+$/, '') + '\n\n' + msg : msg, sub === 'append' ? 'appended' : 'added');
      return 0;
    }
    ctx.openEditor({
      title: '.git/NOTES_EDITMSG', content: (existing || '') + `\n#\n# Write/edit the notes for the following object:\n#\n# ${shortHash(target)} ${firstLine(w.commit(target).message)}\n#`,
      hint: 'Write the note, then save. Lines starting with # are ignored.',
      onSave: (text) => { const clean = text.split('\n').filter(l => !l.startsWith('#')).join('\n').trim(); if (!clean) { return 0; } save(clean, 'added'); return 0; },
    });
    return 0;
  }
  if (sub === 'prune') return 0;
  throw new GitError(`error: unknown subcommand: ${sub}`, 129);
};

logHooks.footer.push((repo, h, o) => {
  if (o['--no-notes']) return [];
  const n = noteFor(repo, h);
  return n ? ['', 'Notes:', ...splitLines(n).map(l => '    ' + l)] : [];
});
logHooks.format.N = (repo, h) => noteFor(repo, h) || '';

// ============================================================================
// git submodule
// ============================================================================

export function parseGitmodules(text) {
  const mods = [];
  let cur = null;
  for (const raw of String(text || '').split('\n')) {
    const l = raw.trim();
    const m = l.match(/^\[submodule "(.+)"\]$/);
    if (m) { cur = { name: m[1] }; mods.push(cur); continue; }
    const kv = l.match(/^(\w+)\s*=\s*(.*)$/);
    if (kv && cur) cur[kv[1]] = kv[2];
  }
  return mods;
}

function gitmodules(repo) {
  const w = repo.world;
  const text = w.files.get(repo.root + '/.gitmodules') ?? (repo.index.has('.gitmodules') ? w.objects.get(repo.index.get('.gitmodules')).content : '');
  return parseGitmodules(text);
}

function gitlinks(repo) {
  const w = repo.world;
  const out = [];
  for (const [p, b] of repo.index) { const c = w.objects.get(b).content; if (isGitlink(c)) out.push({ path: p, sha: c.slice(17).trim() }); }
  return out;
}

function describeIn(w, sub, h) {
  for (const [r, v] of Object.entries(sub.refs)) if (r.startsWith('refs/tags/') && w.peel(v) === h) return r.slice(10);
  for (const [r, v] of Object.entries(sub.refs)) if (r.startsWith('refs/heads/') && v === h) return 'heads/' + r.slice(11);
  for (const [r, v] of Object.entries(sub.refs)) if (r.startsWith('refs/remotes/') && v === h && !r.endsWith('/HEAD')) return 'remotes/' + r.slice(13);
  return shortHash(h);
}

function detach(sub, h) {
  checkoutTree(sub, commitTreeFlat(sub, h), { force: true });
  const prev = headCommit(sub);
  sub.HEAD = h;
  logRef(sub, 'HEAD', prev, h, `checkout: moving to ${h}`);
}

commands.submodule = (ctx, args) => {
  const repo = needWorkTree(ctx);
  const w = ctx.world;
  const [sub, ...rest] = args[0] && !args[0].startsWith('-') ? args : ['status', ...args];
  const flags = new Set(rest.filter(a => a.startsWith('-')));
  const paths = rest.filter(a => !a.startsWith('-')).map(p => relPath(ctx, p).replace(/\/$/, ''));
  const subRepo = p => w.repos.get(repo.root + '/' + p) || null;
  const pick = list => list.filter(x => !paths.length || paths.includes(x.path));
  if (sub === 'add') {
    const o = parseOpts(rest, { bool: ['-f', '--force', '-q'], val: ['-b', '--branch', '--name'] });
    const url = o._[0];
    if (!url) throw new GitError('usage: git submodule add [<options>] [--] <repository> [<path>]', 129);
    const path = relPath(ctx, o._[1] || basename(url).replace(/\.git$/, ''));
    if (repo.index.has(path)) throw new GitError(`fatal: '${path}' already exists in the index`);
    const c2 = { ...ctx, cwd: repo.root, repo: null, out: [] };
    const cargs = [url, path];
    if (o['-b'] || o['--branch']) cargs.push('-b', o['-b'] || o['--branch']);
    commands.clone(c2, cargs);
    ctx.out.push(`Cloning into '${repo.root}/${path}'...`, 'done.');
    const s = subRepo(path);
    let text = w.files.get(repo.root + '/.gitmodules') || '';
    text += `[submodule "${path}"]\n\tpath = ${path}\n\turl = ${url}\n` + (o['-b'] || o['--branch'] ? `\tbranch = ${o['-b'] || o['--branch']}\n` : '');
    w.writeFile(repo.root + '/.gitmodules', text);
    repo.index.set('.gitmodules', w.writeBlob(text));
    repo.index.set(path, w.writeBlob(`Subproject commit ${headCommit(s)}\n`));
    repo.config[`submodule.${path}.url`] = url;
    repo.config[`submodule.${path}.active`] = 'true';
    w.emit({ type: 'submodule-add', path, url });
    return 0;
  }
  if (sub === 'status') {
    for (const g of pick(gitlinks(repo))) {
      const s = subRepo(g.path);
      const h = s && headCommit(s);
      if (!h) ctx.out.push(`-${g.sha} ${g.path}`);
      else ctx.out.push(`${h === g.sha ? ' ' : C.yellow('+')}${h} ${g.path} (${describeIn(w, s, h)})`);
    }
    return 0;
  }
  if (sub === 'init' || sub === 'sync') {
    for (const m of gitmodules(repo).filter(x => !paths.length || paths.includes(x.path))) {
      if (sub === 'init' && repo.config[`submodule.${m.name}.url`]) continue;
      repo.config[`submodule.${m.name}.url`] = m.url;
      repo.config[`submodule.${m.name}.active`] = 'true';
      ctx.out.push(sub === 'init' ? `Submodule '${m.name}' (${m.url}) registered for path '${m.path}'` : `Synchronizing submodule url for '${m.path}'`);
      const s = subRepo(m.path);
      if (sub === 'sync' && s) s.config['remote.origin.url'] = m.url;
    }
    return 0;
  }
  if (sub === 'update') {
    if (flags.has('--init')) commands.submodule(ctx, ['init', ...paths]);
    const mods = gitmodules(repo);
    for (const g of pick(gitlinks(repo))) {
      const m = mods.find(x => x.path === g.path);
      if (!m || !repo.config[`submodule.${m.name}.url`]) continue;
      let s = subRepo(g.path);
      if (!s) {
        w.dirs.delete(repo.root + '/' + g.path);
        commands.clone({ ...ctx, cwd: repo.root, repo: null, out: [] }, [repo.config[`submodule.${m.name}.url`], g.path]);
        ctx.out.push(`Cloning into '${repo.root}/${g.path}'...`);
        s = subRepo(g.path);
      }
      let target = g.sha;
      if (flags.has('--remote')) {
        commands.fetch({ ...ctx, cwd: s.root, repo: s, out: [] }, ['origin']);
        const branch = m.branch || (w.remotes.get(w.canonicalUrl(s.config['remote.origin.url'])?.url)?.HEAD || 'ref: refs/heads/main').replace('ref: refs/heads/', '');
        target = s.refs[`refs/remotes/origin/${branch}`] || target;
      }
      if (headCommit(s) !== target) {
        if (!w.objects.has(target)) commands.fetch({ ...ctx, cwd: s.root, repo: s, out: [] }, ['origin']);
        detach(s, target);
        ctx.out.push(`Submodule path '${g.path}': checked out '${target}'`);
      }
      if (flags.has('--recursive')) commands.submodule({ ...ctx, cwd: s.root, repo: s }, ['update', '--init', '--recursive']);
    }
    w.emit({ type: 'submodule-update', remote: flags.has('--remote') });
    return 0;
  }
  if (sub === 'foreach') {
    const cmd = rest.filter(a => a !== '--recursive').join(' ');
    let code = 0;
    for (const g of gitlinks(repo)) {
      const s = subRepo(g.path);
      if (!s) continue;
      ctx.out.push(`Entering '${g.path}'`);
      code = ctx.runShell ? ctx.runShell(`cd ${s.root} && ${cmd}; cd ${ctx.cwd}`, ctx.out) : 0;
    }
    return code;
  }
  if (sub === 'deinit') {
    for (const g of pick(gitlinks(repo))) {
      const s = subRepo(g.path);
      const m = gitmodules(repo).find(x => x.path === g.path);
      if (s) {
        for (const f of [...w.files.keys()]) if (f.startsWith(s.root + '/')) w.files.delete(f);
        w.repos.delete(s.root);
        w.dirs.add(s.root);
        ctx.out.push(`Cleared directory '${g.path}'`);
      }
      if (m) { delete repo.config[`submodule.${m.name}.url`]; delete repo.config[`submodule.${m.name}.active`]; ctx.out.push(`Submodule '${m.name}' (${m.url}) unregistered for path '${g.path}'`); }
    }
    return 0;
  }
  if (sub === 'summary') {
    for (const g of gitlinks(repo)) {
      const s = subRepo(g.path);
      const h = s && headCommit(s);
      if (!h || h === g.sha) continue;
      const ahead = revList(w, [h], [g.sha]);
      ctx.out.push(`* ${g.path} ${shortHash(g.sha)}...${shortHash(h)} (${ahead.length}):`, ...ahead.map(x => `  > ${firstLine(w.commit(x).message)}`), '');
    }
    return 0;
  }
  throw new GitError(`usage: git submodule [--quiet] [--cached]\n   or: git submodule [--quiet] add [-b <branch>] [-f|--force] [--name <name>] [--reference <repository>] [--] <repository> [<path>]\n   or: git submodule [--quiet] status [--cached] [--recursive] [--] [<path>...]\n   or: git submodule [--quiet] init [--] [<path>...]\n   or: git submodule [--quiet] update [--init] [--remote] [--recursive] [--] [<path>...]\n   or: git submodule [--quiet] foreach [--recursive] <command>\n   or: git submodule [--quiet] sync [--recursive] [--] [<path>...]`, 1);
};

// `git status` shows submodule pointers as "(new commits)"
const origStatus2 = commands.status;
commands.status = (ctx, args) => {
  const code = origStatus2(ctx, args);
  const repo = ctx.repo;
  if (!repo || repo.bare) return code;
  const links = new Set(gitlinks(repo).map(g => g.path));
  if (!links.size) return code;
  for (let i = 0; i < ctx.out.length; i++) {
    const m = stripAnsi(ctx.out[i]).match(/^\tmodified:\s+(\S+)$/);
    if (m && links.has(m[1]) && !ctx.out[i].includes('(new commits)')) ctx.out[i] += ' (new commits)';
  }
  return code;
};

export { isFakeBinary };
