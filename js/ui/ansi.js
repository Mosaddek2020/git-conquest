// Convert ANSI SGR colour codes to HTML spans.

import { esc } from './dom.js';

// a carriage return (Windows line ending) is shown the way `cat -A` and git do: ^M
const cr = s => esc(s).replace(/\r/g, '<span class="ansi-2">^M</span>');

export function ansiToHtml(text) {
  let out = '';
  const stack = [];
  const re = /\x1b\[([0-9;]*)m/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    out += cr(text.slice(last, m.index));
    last = re.lastIndex;
    const codes = m[1].split(';').filter(Boolean);
    if (!codes.length || codes.includes('0')) { while (stack.length) { out += '</span>'; stack.pop(); } continue; }
    for (const c of codes) { out += `<span class="ansi-${c}">`; stack.push(c); }
  }
  out += cr(text.slice(last));
  while (stack.length) { out += '</span>'; stack.pop(); }
  return out;
}
