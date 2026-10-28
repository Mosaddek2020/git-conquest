// Content filters: .gitattributes (text, eol, binary, filter=lfs), core.autocrlf and Git LFS.
// `git add` runs the clean side (CRLF -> LF, big file -> LFS pointer); checkout runs the smudge
// side (pointer -> real file when git-lfs is installed). Big binary files are simulated as a
// marker string that carries their size, so a 180 MB video costs a few bytes here.

import { contentFilters } from './core.js';
import { sha1Bytes, utf8 } from './sha1.js';

// ---------- simulated binary files ----------

export function fakeBinary(label, bytes) { return `\u0000BINARY ${bytes} ${label}\u0000`; }
export const isFakeBinary = c => typeof c === 'string' && c.startsWith('\u0000BINARY ');
export function contentSize(c) {
  if (isFakeBinary(c)) return Number(c.split(' ')[1]);
  return utf8(c || '').length;
}
export const looksBinary = c => typeof c === 'string' && c.includes('\u0000');

export function humanSize(n) {
  if (n >= 1024 ** 3) return (n / 1024 ** 3).toFixed(2) + ' GB';
  if (n >= 1024 ** 2) return (n / 1024 ** 2).toFixed(2) + ' MB';
  if (n >= 1024) return (n / 1024).toFixed(1) + ' KB';
  return n + ' B';
}

// ---------- .gitattributes ----------

const MACROS = { binary: { text: false, diff: false, merge: false } };

function patternRegex(pat) {
  const anchored = pat.includes('/');
  const body = pat.replace(/^\//, '').split('**').map(part => part.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]')).join('.*');
  return anchored ? new RegExp(`^${body}$`) : new RegExp(`(^|/)${body}$`);
}

export function parseAttributes(text) {
  const rules = [];
  for (let line of String(text || '').split('\n')) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    const [pat, ...attrs] = line.split(/\s+/);
    const set = {};
    for (const a of attrs) {
      if (MACROS[a]) Object.assign(set, MACROS[a]);
      else if (a.startsWith('-')) set[a.slice(1)] = false;
      else if (a.startsWith('!')) set[a.slice(1)] = undefined;
      else if (a.includes('=')) set[a.slice(0, a.indexOf('='))] = a.slice(a.indexOf('=') + 1);
      else set[a] = true;
    }
    rules.push({ pattern: pat, re: patternRegex(pat), set });
  }
  return rules;
}

// attributes come from the working tree's .gitattributes (falling back to the index copy)
export function attributesFor(repo, path) {
  const w = repo.world;
  let text = w.files.get(repo.root + '/.gitattributes');
  if (text === undefined && repo.index.has('.gitattributes')) text = w.objects.get(repo.index.get('.gitattributes'))?.content;
  const out = {};
  for (const r of parseAttributes(text)) if (r.re.test(path)) Object.assign(out, r.set);
  return out;
}

const cfg = (repo, key) => repo.config[key] ?? repo.world.globalConfig[key] ?? repo.world.globalConfig[key.toLowerCase()];

// ---------- Git LFS ----------

export const lfsInstalled = world => !!(world.globalConfig['filter.lfs.clean'] || world.globalConfig['filter.lfs.process']);

function sha256ish(content) {
  // a stand-in for SHA-256: deterministic, 64 hex digits
  const a = sha1Bytes(utf8('lfs:' + content)), b = sha1Bytes(utf8(content + ':lfs'));
  return (a + b).slice(0, 64);
}

export function lfsPointer(world, content) {
  const oid = sha256ish(content);
  world.lfsObjects = world.lfsObjects || new Map();
  world.lfsObjects.set(oid, content);
  return `version https://git-lfs.github.com/spec/v1\noid sha256:${oid}\nsize ${contentSize(content)}\n`;
}

export function parsePointer(c) {
  const m = typeof c === 'string' && c.match(/^version https:\/\/git-lfs\.github\.com\/spec\/v1\noid sha256:([0-9a-f]{64})\nsize (\d+)\n$/);
  return m ? { oid: m[1], size: Number(m[2]) } : null;
}

// ---------- the filters ----------

export function clean(repo, path, content, warn) {
  if (typeof content !== 'string') return content;
  const a = attributesFor(repo, path);
  if (a.filter === 'lfs' && lfsInstalled(repo.world) && !parsePointer(content)) return lfsPointer(repo.world, content);
  if (looksBinary(content) || a.text === false) return content;
  const autocrlf = String(cfg(repo, 'core.autocrlf') || 'false');
  const normalize = a.text === true || a.text === 'auto' || a.eol || ((autocrlf === 'true' || autocrlf === 'input') && a.text !== false);
  if (normalize && content.includes('\r\n')) {
    warn?.(`warning: in the working copy of '${path}', CRLF will be replaced by LF the next time Git touches it`);
    return content.replace(/\r\n/g, '\n');
  }
  return content;
}

export function smudge(repo, path, content) {
  const ptr = parsePointer(content);
  if (ptr && lfsInstalled(repo.world) && repo.world.lfsObjects?.has(ptr.oid)) return repo.world.lfsObjects.get(ptr.oid);
  if (typeof content !== 'string' || looksBinary(content)) return content;
  const a = attributesFor(repo, path);
  if (a.eol === 'crlf' || (String(cfg(repo, 'core.autocrlf')) === 'true' && a.text !== false)) return content.replace(/\r?\n/g, '\r\n');
  return content;
}

contentFilters.clean = clean;
contentFilters.smudge = smudge;

// end-of-line description used by `git ls-files --eol` and `file`
export function eolInfo(content) {
  if (content === undefined) return '';
  if (looksBinary(content)) return '-text';
  const crlf = (content.match(/\r\n/g) || []).length;
  const lf = (content.match(/\n/g) || []).length - crlf;
  if (crlf && lf) return 'mixed';
  if (crlf) return 'crlf';
  if (lf) return 'lf';
  return 'none';
}
