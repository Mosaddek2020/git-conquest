// Commands for the Everyday Mastery realm: repository housekeeping (count-objects, gc,
// maintenance, commit-graph, fsck --unreachable, reflog expire), moving history without a
// server (bundle, and cloning or fetching from one), release tarballs (archive, with
// export-ignore), and check-mailmap. They register themselves on the shared `commands` table.

import { GitError, C, shortHash, normPath, basename, Repo } from './world.js';
import { headCommit, currentBranch, resolve, resolveCommit, revList, commitTreeFlat, mailmapFor, updateRef } from './core.js';
import { commands, parseOpts, needRepo, firstLine } from './git.js';
import { parseAttributes, contentSize, humanSize, fakeBinary } from './filters.js';

const pathIn = (ctx, p) => normPath(p.startsWith('/') ? p : p.startsWith('~') ? ctx.world.home + p.slice(1) : ctx.cwd + '/' + p);
const pl = (n, w, p = w + 's') => `${n} ${n === 1 ? w : p}`;

// ============================================================================
// objects: what a repository holds, loose or packed
// ============================================================================

// every object reachable from refs, HEAD, reflogs, the stash and the index
export function reachableObjects(repo, { reflogs = true } = {}) {
  const w = repo.world;
  const seen = new Set();
  const tips = new Set(Object.values(repo.refs).filter(Boolean));
  const h = headCommit(repo); if (h) tips.add(h);
  if (reflogs) for (const log of Object.values(repo.reflog || {})) for (const e of log) { if (e.new) tips.add(e.new); if (e.old) tips.add(e.old); }
  for (const s of repo.stash || []) tips.add(s.hash);
  const walkTree = (t) => {
    if (!t || seen.has(t)) return;
    seen.add(t);
    const obj = w.objects.get(t);
    for (const e of obj?.entries || []) { if (e.type === 'tree') walkTree(e.hash); else if (e.type === 'blob') seen.add(e.hash); }
  };
  const queue = [...tips];
  while (queue.length) {
    const x = queue.pop();
    if (!x || seen.has(x)) continue;
    const obj = w.objects.get(x);
    if (!obj) continue;
    if (obj.type === 'tag') { seen.add(x); queue.push(obj.object || w.peel(x)); continue; }
    if (obj.type !== 'commit') { if (obj.type === 'tree') walkTree(x); else seen.add(x); continue; }
    seen.add(x);
    const c = w.commit(x);
    walkTree(c.tree);
    if (!(w.graft && w.graft.has && w.graft.has(x))) queue.push(...c.parents);
  }
  for (const b of repo.index?.values() || []) seen.add(b);
  return seen;
}

function objectStats(repo) {
  const w = repo.world;
  const present = new Set([...reachableObjects(repo), ...(repo.dangling || [])]);
  const packed = repo.packed || new Set();
  let loose = 0, looseKiB = 0, inPack = 0, packBytes = 0;
  for (const x of present) {
    const obj = w.objects.get(x);
    const size = obj ? (obj.type === 'blob' ? contentSize(obj.content) : (obj.size || 200)) : 0;
    if (packed.has(x)) { inPack++; packBytes += Math.max(30, Math.round(size * 0.32)); } else { loose++; looseKiB += Math.max(4, Math.ceil(size * 0.55 / 1024)); }
  }
  return { present, loose, looseKiB, inPack, packKiB: Math.ceil(packBytes / 1024), packs: inPack ? (repo.packs || 1) : 0 };
}

commands['count-objects'] = (ctx, args) => {
  const repo = needRepo(ctx);
  const o = parseOpts(args, { bool: ['-v', '--verbose', '-H', '--human-readable', '-vH', '-Hv'], val: [] });
  const s = objectStats(repo);
  const human = o['-H'] || o['--human-readable'] || o['-vH'] || o['-Hv'];
  const kib = n => (human ? humanSize(n * 1024).replace(' KB', ' KiB').replace(' MB', ' MiB').replace(' B', ' bytes') : String(n));
  if (o['-v'] || o['--verbose'] || o['-vH'] || o['-Hv']) {
    ctx.out.push(`count: ${s.loose}`, `size: ${kib(s.looseKiB)}`, `in-pack: ${s.inPack}`, `packs: ${s.packs}`, `size-pack: ${kib(s.packKiB)}`, 'prune-packable: 0', 'garbage: 0', `size-garbage: ${kib(0)}`);
  } else ctx.out.push(`${pl(s.loose, 'object')}, ${human ? kib(s.looseKiB) : s.looseKiB + ' kilobytes'}`);
  return 0;
};

commands.gc = (ctx, args) => {
  const repo = needRepo(ctx);
  const o = parseOpts(args, { bool: ['--aggressive', '--auto', '-q', '--quiet', '--no-prune'], val: ['--prune'] });
  const w = ctx.world;
  const before = objectStats(repo);
  if (o['--auto'] && before.loose < Number(repo.config['gc.auto'] ?? w.globalConfig['gc.auto'] ?? 6700)) return 0;
  const reach = reachableObjects(repo);
  const pruneNow = o['--prune'] === 'now' || o['--prune'] === 'all';
  const dropped = pruneNow ? [...(repo.dangling || [])].filter(x => !reach.has(x)).length : 0;
  if (pruneNow) repo.dangling = new Set();
  repo.packed = reach;
  repo.packs = 1;
  repo.commitGraph = true;
  repo.packedRefs = true;
  const n = reach.size;
  const deltas = Math.round(n * 0.3);
  if (!o['-q'] && !o['--quiet']) {
    ctx.out.push(`Enumerating objects: ${n}, done.`, `Counting objects: 100% (${n}/${n}), done.`, 'Delta compression using up to 8 threads',
      `Compressing objects: 100% (${deltas}/${deltas}), done.`, `Writing objects: 100% (${n}/${n}), done.`, `Total ${n} (delta ${Math.round(deltas * 0.6)}), reused 0 (delta 0), pack-reused 0`);
    if (!pruneNow && (repo.dangling?.size)) ctx.out.push(C.dim(`(${pl(repo.dangling.size, 'unreachable object')} kept loose: gc only prunes objects older than gc.pruneExpire, 2 weeks by default)`));
    if (dropped) ctx.out.push(C.dim(`(pruned ${pl(dropped, 'unreachable object')})`));
  }
  w.emit({ type: 'gc', prune: pruneNow, aggressive: !!o['--aggressive'], objects: n, before: before.loose });
  return 0;
};

// reflog expire: drop entries (and remember what became unreachable, for fsck and gc)
const origReflog = commands.reflog;
commands.reflog = (ctx, args) => {
  if (args[0] !== 'expire' && args[0] !== 'delete') return origReflog(ctx, args);
  const repo = needRepo(ctx);
  const o = parseOpts(args.slice(1), { bool: ['--all', '-n', '--dry-run', '--verbose', '--stale-fix', '--rewrite', '--updateref'], val: ['--expire', '--expire-unreachable'] });
  if (args[0] === 'delete') {
    for (const spec of o._) {
      const m = spec.match(/^(.*?)@\{(\d+)\}$/);
      if (!m) throw new GitError(`error: not a reflog: ${spec}`);
      const ref = m[1] === 'HEAD' || !m[1] ? 'HEAD' : 'refs/heads/' + m[1];
      const [e] = (repo.reflog[ref] || []).splice(Number(m[2]), 1);
      if (e) (repo.dangling = repo.dangling || new Set()).add(e.new);
    }
    return 0;
  }
  const when = o['--expire'] || o['--expire-unreachable'] || '90.days.ago';
  const before = reachableObjects(repo);
  if (when !== 'now' && when !== 'all') { ctx.out.push(C.dim('(no reflog entries are old enough to expire)')); return 0; }
  const refs = o['--all'] ? Object.keys(repo.reflog) : (o._.length ? o._.map(r => (r === 'HEAD' ? 'HEAD' : 'refs/heads/' + r)) : ['HEAD']);
  if (o['-n'] || o['--dry-run']) { for (const r of refs) for (const e of repo.reflog[r] || []) ctx.out.push(`would prune ${e.msg}`); return 0; }
  for (const r of refs) {
    const log = repo.reflog[r] || [];
    // --expire-unreachable only drops entries whose commit is no longer on the ref
    repo.reflog[r] = o['--expire-unreachable'] && !o['--expire'] ? log.filter(e => e.new && resolve(repo, r, { quiet: true }) && revList(repo.world, [resolve(repo, r, { quiet: true })]).includes(e.new)) : [];
  }
  const after = reachableObjects(repo);
  repo.dangling = repo.dangling || new Set();
  for (const x of before) if (!after.has(x)) repo.dangling.add(x);
  ctx.world.emit({ type: 'reflog-expire', refs });
  return 0;
};

const origFsck = commands.fsck;
commands.fsck = (ctx, args) => {
  const repo = needRepo(ctx);
  const o = parseOpts(args, { bool: ['--unreachable', '--lost-found', '--dangling', '--no-dangling', '--full', '--connectivity-only', '--no-reflogs', '--strict'], val: [] });
  const w = ctx.world;
  origFsck(ctx, []);
  if (o['--no-dangling']) return 0;
  const reach = reachableObjects(repo, { reflogs: !o['--no-reflogs'] });
  const orphans = [...(repo.dangling || [])];
  if (o['--no-reflogs']) {
    // objects only the reflog keeps alive count as unreachable here
    const strict = reachableObjects(repo, { reflogs: false });
    for (const x of reachableObjects(repo)) if (!strict.has(x)) orphans.push(x);
  }
  const unreachable = [...new Set(orphans)].filter(x => !reach.has(x) && w.objects.get(x));
  // "dangling" = unreachable and not pointed to by another unreachable object; show commits first
  const shown = unreachable.filter(x => o['--unreachable'] || w.objects.get(x).type === 'commit' || !unreachable.some(y => w.objects.get(y).type === 'commit'));
  shown.sort((a, b) => (w.objects.get(a).type === 'commit' ? -1 : 1) - (w.objects.get(b).type === 'commit' ? -1 : 1));
  for (const x of shown) {
    const t = w.objects.get(x).type;
    ctx.out.push(`${o['--unreachable'] ? 'unreachable' : 'dangling'} ${t} ${x}`);
    if (o['--lost-found'] && t === 'commit') {
      const dir = repo.root + '/.git/lost-found/commit';
      w.writeFile(`${dir}/${x}`, x + '\n');
    }
  }
  return 0;
};

commands['commit-graph'] = (ctx, args) => {
  const repo = needRepo(ctx);
  const sub = args[0];
  if (sub === 'write') {
    const n = revList(ctx.world, Object.values(repo.refs).filter(Boolean).map(h => ctx.world.peel(h)).filter(h => ctx.world.objects.get(h)?.type === 'commit')).length;
    repo.commitGraph = true;
    ctx.out.push(`Finding commits for commit graph among packed objects: 100% (${n}/${n}), done.`, `Computing commit graph generation numbers: 100% (${n}/${n}), done.`);
    ctx.world.emit({ type: 'commit-graph' });
    return 0;
  }
  if (sub === 'verify') { if (!repo.commitGraph) { ctx.out.push('error: commit-graph file is missing'); return 1; } ctx.out.push('Verifying commits in commit graph: 100%, done.'); return 0; }
  throw new GitError('usage: git commit-graph write [--reachable] | verify', 129);
};

const TASKS = ['gc', 'commit-graph', 'prefetch', 'loose-objects', 'incremental-repack', 'pack-refs'];
commands.maintenance = (ctx, args) => {
  const w = ctx.world;
  const [sub, ...rest] = args;
  const o = parseOpts(rest, { bool: ['--auto', '--quiet', '-q'], val: ['--task', '--schedule', '--scheduler'] });
  const repo = ctx.repo;
  const list = () => String(w.globalConfig['maintenance.repo'] || '').split('\n').filter(Boolean);
  if (sub === 'register' || sub === 'start') {
    needRepo(ctx);
    if (!list().includes(repo.root)) w.globalConfig['maintenance.repo'] = [...list(), repo.root].join('\n');
    repo.config['maintenance.auto'] = 'false';
    repo.config['maintenance.strategy'] = 'incremental';
    if (sub === 'start') {
      w.globalConfig['maintenance.scheduled'] = 'true';
      ctx.out.push(C.dim('(scheduled: hourly prefetch + commit-graph, daily loose-objects + incremental-repack, weekly pack-refs)'));
    }
    w.emit({ type: 'maintenance', action: sub });
    return 0;
  }
  if (sub === 'unregister' || sub === 'stop') {
    if (sub === 'unregister') { needRepo(ctx); w.globalConfig['maintenance.repo'] = list().filter(r => r !== repo.root).join('\n'); delete repo.config['maintenance.strategy']; }
    else delete w.globalConfig['maintenance.scheduled'];
    w.emit({ type: 'maintenance', action: sub });
    return 0;
  }
  if (sub === 'run') {
    needRepo(ctx);
    const tasks = o['--task'] ? rest.flatMap((a, i) => (a === '--task' ? [rest[i + 1]] : a.startsWith('--task=') ? [a.slice(7)] : [])) : ['gc'];
    for (const t of tasks) if (!TASKS.includes(t)) throw new GitError(`error: '${t}' is not a valid task`, 129);
    for (const t of tasks) {
      if (t === 'gc') commands.gc(ctx, o['--quiet'] || o['-q'] ? ['-q'] : []);
      else if (t === 'commit-graph') commands['commit-graph'](ctx, ['write', '--reachable']);
      else if (t === 'prefetch') {
        // fetch every remote into refs/prefetch/ so a later real fetch is quick; branches are untouched
        for (const k of Object.keys(repo.config).filter(k => /^remote\..*\.url$/.test(k))) {
          const name = k.split('.')[1];
          const bare = w.remoteByUrl(repo.config[k]);
          if (!bare) continue;
          for (const [r, hh] of Object.entries(bare.refs)) if (r.startsWith('refs/heads/')) repo.refs[`refs/prefetch/remotes/${name}/${r.slice(11)}`] = hh;
        }
      } else if (t === 'loose-objects' || t === 'incremental-repack') { repo.packed = new Set([...(repo.packed || []), ...reachableObjects(repo)]); repo.packs = (repo.packs || 0) + 1; }
      else if (t === 'pack-refs') repo.packedRefs = true;
    }
    w.emit({ type: 'maintenance', action: 'run', tasks });
    return 0;
  }
  throw new GitError('usage: git maintenance <subcommand> [<options>]\n\n   or: git maintenance run [--auto] [--[no-]quiet] [--task=<task>] [--schedule]\n   or: git maintenance start\n   or: git maintenance stop\n   or: git maintenance register\n   or: git maintenance unregister', 129);
};

// ============================================================================
// bundles: a whole repository (or part of it) in one file
// ============================================================================

const BUNDLE_HEAD = '# v2 git bundle\n';
export const isBundle = c => typeof c === 'string' && c.startsWith(BUNDLE_HEAD);

export function parseBundle(text) {
  const head = text.slice(BUNDLE_HEAD.length).split('\n\n')[0];
  const refs = [], prereqs = [];
  for (const line of head.split('\n').filter(Boolean)) {
    if (line.startsWith('-')) prereqs.push({ hash: line.slice(1, 41), msg: line.slice(42) });
    else { const [hash, ref] = line.split(' '); refs.push({ hash, ref }); }
  }
  return { refs, prereqs };
}

commands.bundle = (ctx, args) => {
  const w = ctx.world;
  const [sub, file, ...rest] = args;
  if (sub === 'create') {
    const repo = needRepo(ctx);
    if (!file) throw new GitError('usage: git bundle create [<options>] <file> <git-rev-list args>', 129);
    const o = parseOpts(rest, { bool: ['--all', '--branches', '--tags', '-q', '--quiet'], val: [] });
    const refs = new Map();
    const tips = [], exclude = [];
    if (o['--all'] || o['--branches']) for (const [r, hh] of Object.entries(repo.refs)) if (r.startsWith('refs/heads/')) refs.set(r, hh);
    if (o['--all'] || o['--tags']) for (const [r, hh] of Object.entries(repo.refs)) if (r.startsWith('refs/tags/')) refs.set(r, hh);
    for (const a of o._) {
      if (a.includes('..')) {
        const [x, y] = a.split('..');
        exclude.push(resolveCommit(repo, x));
        const name = y || 'HEAD';
        refs.set(repo.refs['refs/heads/' + name] ? 'refs/heads/' + name : name === 'HEAD' ? 'HEAD' : name, resolveCommit(repo, name));
      } else if (a.startsWith('^')) exclude.push(resolveCommit(repo, a.slice(1)));
      else if (a.startsWith('--since=')) continue;
      else {
        const full = repo.refs['refs/heads/' + a] !== undefined ? 'refs/heads/' + a : repo.refs['refs/tags/' + a] !== undefined ? 'refs/tags/' + a : a === 'HEAD' ? 'HEAD' : a;
        const hh = repo.refs[full] ?? resolve(repo, a, { peel: false });
        refs.set(full, hh);
      }
    }
    if (!refs.size) throw new GitError('fatal: Refusing to create empty bundle.', 128);
    if ([...refs.keys()].includes('HEAD') === false && (o['--all'])) refs.set('HEAD', headCommit(repo));
    for (const hh of refs.values()) tips.push(w.peel(hh));
    const commits = revList(w, tips, exclude);
    if (!commits.length) throw new GitError('fatal: Refusing to create empty bundle.', 128);
    const prereqs = exclude.map(x => `-${x} ${firstLine(w.commit(x).message)}`);
    const lines = [...prereqs, ...[...refs].sort((a, b) => (a[0] === 'HEAD' ? 1 : b[0] === 'HEAD' ? -1 : a[0].localeCompare(b[0]))).map(([r, hh]) => `${hh} ${r}`)];
    const objs = commits.length * 3;
    w.writeFile(pathIn(ctx, file), BUNDLE_HEAD + lines.join('\n') + '\n\n' + fakeBinary('PACK', objs * 180));
    if (!o['-q'] && !o['--quiet']) ctx.out.push(`Enumerating objects: ${objs}, done.`, `Counting objects: 100% (${objs}/${objs}), done.`, `Writing objects: 100% (${objs}/${objs}), done.`, `Total ${objs} (delta 0), reused 0 (delta 0), pack-reused 0`);
    w.emit({ type: 'bundle', file: pathIn(ctx, file), refs: [...refs.keys()], incremental: prereqs.length > 0 });
    return 0;
  }
  if (sub === 'verify' || sub === 'list-heads') {
    if (!file) throw new GitError(`usage: git bundle ${sub} <file>`, 129);
    const abs = pathIn(ctx, file);
    const text = w.files.get(abs);
    if (text === undefined) throw new GitError(`error: could not open '${file}'`);
    if (!isBundle(text)) throw new GitError(`error: '${file}' does not look like a v2 or v3 bundle file`);
    const b = parseBundle(text);
    if (sub === 'list-heads') { for (const r of b.refs) ctx.out.push(`${r.hash} ${r.ref}`); return 0; }
    const repo = ctx.repo;
    const missing = b.prereqs.filter(p => !repo || !reachableObjects(repo).has(p.hash));
    ctx.out.push(`The bundle contains ${b.refs.length === 1 ? 'this ref' : `these ${b.refs.length} refs`}:`, ...b.refs.map(r => `${r.hash} ${r.ref}`));
    if (!b.prereqs.length) ctx.out.push('The bundle records a complete history.');
    else ctx.out.push(`The bundle requires ${b.prereqs.length === 1 ? 'this ref' : `these ${b.prereqs.length} refs`}:`, ...b.prereqs.map(p => `${p.hash} ${p.msg}`));
    if (missing.length) { ctx.out.push(`error: Repository lacks these prerequisite commits:`, ...missing.map(p => `error: ${p.hash} ${p.msg}`)); return 1; }
    ctx.out.push(`${file} is okay`);
    return 0;
  }
  if (sub === 'unbundle') {
    const repo = needRepo(ctx);
    const b = parseBundle(w.files.get(pathIn(ctx, file)) || '');
    for (const r of b.refs) ctx.out.push(`${r.hash} ${r.ref}`);
    void repo;
    return 0;
  }
  throw new GitError('usage: git bundle create [<options>] <file> <git-rev-list args>\n   or: git bundle verify [<options>] <file>\n   or: git bundle list-heads <file> [<refname>...]\n   or: git bundle unbundle <file> [<refname>...]', 129);
};

// A bundle file can stand in for a remote: register a read-only bare repo for it under its path.
function bundleRemote(ctx, spec) {
  const w = ctx.world;
  if (!spec || /^(https?:|git@)/.test(spec)) return null;
  const abs = pathIn(ctx, spec);
  const text = w.files.get(abs);
  if (!isBundle(text)) return null;
  const b = parseBundle(text);
  const bare = new Repo(w, null, { bare: true });
  for (const r of b.refs) if (r.ref !== 'HEAD') bare.refs[r.ref] = r.hash;
  const headHash = b.refs.find(r => r.ref === 'HEAD')?.hash;
  const def = Object.keys(bare.refs).find(r => r.startsWith('refs/heads/') && bare.refs[r] === headHash) || (bare.refs['refs/heads/main'] ? 'refs/heads/main' : Object.keys(bare.refs).find(r => r.startsWith('refs/heads/')));
  bare.HEAD = 'ref: ' + (def || 'refs/heads/main');
  bare.meta = { owner: 'local', name: basename(abs).replace(/\.bundle$/, ''), url: abs, description: '', visibility: 'public', prs: [], issues: [], nextNumber: 1, protected: {}, forkOf: null, releases: [], runs: [], collaborators: [], stars: 0, defaultBranch: (def || 'refs/heads/main').slice(11), bundle: true };
  w.remotes.set(abs, bare);
  return { abs, bare, prereqs: b.prereqs };
}

const origClone = commands.clone;
commands.clone = (ctx, args) => {
  const pos = args.filter((a, i) => !a.startsWith('-') && !['-b', '--branch', '-o', '--origin', '--depth', '--filter'].includes(args[i - 1]));
  const br = pos[0] && bundleRemote(ctx, pos[0]);
  if (!br) return origClone(ctx, args);
  if (br.prereqs.length) throw new GitError(`error: Repository lacks these prerequisite commits:\n${br.prereqs.map(p => `error: ${p.hash} ${p.msg}`).join('\n')}\nfatal: an incremental bundle can only be fetched into a repository that has its prerequisites`);
  const i = args.indexOf(pos[0]);
  const next = [...args];
  next[i] = br.abs;
  if (pos.length < 2) next.splice(i + 1, 0, basename(br.abs).replace(/\.bundle$/, ''));
  return origClone(ctx, next);
};

for (const name of ['fetch', 'pull', 'ls-remote']) {
  const orig = commands[name];
  if (!orig) continue;
  commands[name] = (ctx, args) => {
    const repo = ctx.repo;
    // remotes whose url is a bundle file (relative urls are relative to the work tree)
    if (repo) for (const [k, v] of Object.entries(repo.config)) {
      if (!/^remote\..*\.url$/.test(k)) continue;
      const br = bundleRemote({ ...ctx, cwd: repo.root || ctx.cwd }, v);
      if (br && v !== br.abs) ctx.world.remotes.set(v, br.bare);
    }
    const pos = args.filter(a => !a.startsWith('-'));
    const br = pos[0] && !(repo && repo.config[`remote.${pos[0]}.url`]) ? bundleRemote(ctx, pos[0]) : null;
    if (!br || name === 'ls-remote') return orig(ctx, br ? args.map(a => (a === pos[0] ? br.abs : a)) : args);
    // fetch or pull straight from a bundle file given by path
    needRepo(ctx);
    const w = ctx.world;
    const missing = br.prereqs.filter(p => !reachableObjects(repo).has(p.hash));
    if (missing.length) throw new GitError(`error: Repository lacks these prerequisite commits:\n${missing.map(p => `error: ${p.hash} ${p.msg}`).join('\n')}`);
    const specs = pos.slice(1).length ? pos.slice(1) : ['HEAD'];
    ctx.out.push(`From ${pos[0]}`);
    let fetched = null;
    for (const spec of specs) {
      const [src, dst] = spec.replace(/^\+/, '').split(':');
      const ref = br.bare.refs[src.startsWith('refs/') ? src : 'refs/heads/' + src] || (src === 'HEAD' ? br.bare.refs[br.bare.HEAD.slice(5)] : null) || br.bare.refs['refs/tags/' + src];
      if (!ref) throw new GitError(`fatal: couldn't find remote ref ${src}`);
      fetched = fetched || ref;
      if (dst) {
        const full = dst.startsWith('refs/') ? dst : 'refs/heads/' + dst;
        updateRef(repo, full, ref, `fetch: storing head`);
        ctx.out.push(` * [new branch]      ${src}       -> ${dst}`);
      } else ctx.out.push(` * branch            ${src}       -> FETCH_HEAD`);
    }
    repo.fetchHead = fetched;
    w.emit({ type: 'fetch', bundle: br.abs });
    if (name === 'fetch') return 0;
    return commands.merge(ctx, [fetched, '-m', `Merge branch '${specs[0]}' of ${pos[0]}`]);
  };
}

// ============================================================================
// archive: a release tarball or zip of one tree, minus export-ignore paths
// ============================================================================

const ARCHIVE_TAG = '\u0000ARCHIVE ';
export const isArchive = c => typeof c === 'string' && c.startsWith(ARCHIVE_TAG);
export function parseArchive(c) {
  const [head, ...rest] = c.split('\n');
  const [, format, bytes] = head.replace(/\u0000/g, '').split(' ');
  const entries = rest.filter(Boolean).map(l => { const [path, hash, size] = l.split('\t'); return { path, hash, size: Number(size) }; });
  return { format, bytes: Number(bytes), entries };
}

commands.archive = (ctx, args) => {
  const repo = needRepo(ctx);
  const o = parseOpts(args, { bool: ['--worktree-attributes', '-l', '--list', '-v', '--verbose', '-0', '-9'], val: ['--format', '--prefix', '-o', '--output', '--remote'], alias: { '--output': '-o' } });
  const w = ctx.world;
  if (o['-l'] || o['--list']) { ctx.out.push('tar', 'tgz', 'tar.gz', 'zip'); return 0; }
  const treeish = o._[0];
  if (!treeish) throw new GitError('usage: git archive [<options>] <tree-ish> [<path>...]', 129);
  const out = o['-o'];
  let format = o['--format'] || (out && /\.zip$/.test(out) ? 'zip' : out && /\.(tgz|tar\.gz)$/.test(out) ? 'tar.gz' : 'tar');
  if (format === 'tgz') format = 'tar.gz';
  if (!['tar', 'tar.gz', 'zip'].includes(format)) throw new GitError(`fatal: Unknown archive format '${format}'`, 128);
  const hash = resolveCommit(repo, treeish);
  const flat = commitTreeFlat(repo, hash);
  const attrsText = o['--worktree-attributes'] ? w.files.get(repo.root + '/.gitattributes') : (flat.has('.gitattributes') ? w.objects.get(flat.get('.gitattributes')).content : '');
  const rules = parseAttributes(attrsText);
  const ignored = p => {
    let v = false;
    for (const r of rules) if ('export-ignore' in r.set && (r.re.test(p) || p.split('/').some((_, i, a) => r.re.test(a.slice(0, i + 1).join('/'))))) v = r.set['export-ignore'];
    return v === true;
  };
  const paths = (o._.slice(1).length ? o._.slice(1) : o.paths || []).map(p => p.replace(/\/$/, ''));
  const prefix = o['--prefix'] || '';
  const entries = [];
  for (const [p, b] of [...flat].sort()) {
    if (paths.length && !paths.some(x => p === x || p.startsWith(x + '/'))) continue;
    if (ignored(p)) continue;
    entries.push({ path: prefix + p, hash: b, size: contentSize(w.objects.get(b).content) });
  }
  const total = entries.reduce((n, e) => n + e.size, 0);
  const bytes = Math.max(1024, Math.round(format === 'tar' ? total + entries.length * 512 + 1024 : total * 0.4 + entries.length * 100));
  const content = `${ARCHIVE_TAG}${format} ${bytes}\u0000\n` + entries.map(e => `${e.path}\t${e.hash}\t${e.size}`).join('\n') + '\n';
  if (o['-v'] || o['--verbose']) for (const e of entries) ctx.out.push(e.path);
  if (out) w.writeFile(pathIn(ctx, out), content);
  else ctx.out.push(content.replace(/\n$/, ''));
  w.emit({ type: 'archive', file: out ? pathIn(ctx, out) : null, format, ref: treeish, prefix, paths: entries.map(e => e.path) });
  return 0;
};

// ============================================================================
// check-mailmap
// ============================================================================

commands['check-mailmap'] = (ctx, args) => {
  const repo = needRepo(ctx);
  const mm = mailmapFor(repo);
  if (!args.length) throw new GitError('usage: git check-mailmap [<options>] <contact>...', 129);
  for (const a of args) {
    const m = a.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
    if (!m) throw new GitError(`fatal: unable to parse contact: ${a}`, 128);
    const id = mm({ name: m[1], email: m[2] });
    ctx.out.push(`${id.name ? id.name + ' ' : ''}<${id.email}>`);
  }
  return 0;
};

void currentBranch; void shortHash; void updateRef;
