// `ai`: a simulated coding assistant. Labs script its answers in world.ai.rules so a lesson can
// show a plausible but flawed suggestion; the learner's job is to check it against the diff,
// the tests and the history. Context comes from a pipe (`git diff --staged | ai "…"`) or -f.
// With world.ai.dlp on, prompts that carry secret-shaped text are blocked before they leave.

import { C, stripAnsi } from './world.js';
import { findSecrets } from './extras.js';

export function runAi(shell, args, out, stdin) {
  const w = shell.world;
  const cfg = w.ai || {};
  const name = cfg.name || 'Lumen';
  let file = null;
  const words = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-f' || args[i] === '--file') file = args[++i];
    else words.push(args[i]);
  }
  const prompt = words.join(' ').trim();
  if (!prompt) {
    out.push('usage: ai "<question>"', '       <command> | ai "<question>"     (the piped output becomes context)', '       ai -f <file> "<question>"');
    return 2;
  }
  let context = stdin ? stripAnsi(stdin) : '';
  if (file) {
    const c = shell.readFile(shell.resolvePath(file));
    if (c === undefined) { out.push(`ai: ${file}: No such file or directory`); return 1; }
    context += (context ? '\n' : '') + c;
  }
  if (cfg.dlp) {
    const hits = findSecrets(prompt + '\n' + context);
    if (hits.length) {
      out.push(C.red(`✋ Blocked by your organisation's AI policy: the prompt contains what looks like a secret (${hits[0].name}).`), C.dim('   Nothing was sent. Remove or redact it, or leave that file out of the context, then ask again.'));
      w.emit({ type: 'ai-ask', prompt, context, blocked: true, rule: null });
      return 3;
    }
  }
  const rule = (cfg.rules || []).find(r => (!r.match || r.match.test(prompt)) && (!r.ctx || r.ctx.test(context)) && (!r.when || r.when(w)));
  const reply = rule
    ? (typeof rule.reply === 'function' ? rule.reply({ prompt, context, world: w, shell }) : rule.reply)
    : `I can help with the work in this lab. Give me context by piping it in, for example:\n  git diff --staged | ai "write a commit message"`;
  const lines = context ? context.split('\n').length : 0;
  out.push(C.magenta(`${name} ✦`) + C.dim(lines ? `  (read ${lines} line${lines === 1 ? '' : 's'} of context)` : ''));
  out.push(...String(reply).split('\n'));
  if (rule?.writes) {
    for (const [p, c] of Object.entries(rule.writes)) shell.writeFile(shell.resolvePath(p), c);
    out.push(C.dim(`(${name} edited ${Object.keys(rule.writes).join(', ')})`));
  }
  w.emit({ type: 'ai-ask', prompt, context, blocked: false, rule: rule?.id || null });
  return 0;
}
