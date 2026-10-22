// Runs every lab's reference solution through the simulator and checks that each task passes.
// Task fields used: `test` (array of commands or {cmd, edit}) or else `solution`.
import { realms } from '../js/content/index.js';
import { World, stripAnsi } from '../js/git/world.js';
import { Shell } from '../js/git/shell.js';
import { makeHelpers, makeCheckApi } from '../js/lab.js';

const only = process.argv[2];
let failures = 0, labs = 0, warnings = 0;
for (const realm of realms) {
  for (const lesson of realm.lessons) {
    const id = `${realm.id}/${lesson.id}`;
    if (only && !id.includes(only)) continue;
    const def = lesson.lab;
    if (!def) continue;
    labs++;
    const world = new World(def.world || {});
    const shell = new Shell(world, { cwd: world.home });
    const history = [];
    const H = makeHelpers(world, shell);
    def.setup?.(H);
    shell.cwd = shell.resolvePath(def.cwd || '~');
    world.events.length = 0;
    const api = makeCheckApi(world, shell, history);
    world.listeners.clear();
    if (def.events) world.listeners.add(ev => def.events(ev, { ...H, ...api, say: () => {} }));
    const log = [];
    let ok = true;
    for (let i = 0; i < def.tasks.length; i++) {
      const t = def.tasks[i];
      const steps = t.test || (t.solution ? [t.solution] : []);
      let early = false;
      try { early = !!t.check(api); } catch { early = false; }
      if (early && !t.allowEarly) { console.log(`! ${id} task ${i + 1} passes before its steps run: ${t.title}`); warnings++; }
      for (const step of steps) {
        if (step && step.act) { step.act(H, api); log.push(`[${step.label || 'action'}]`); continue; }
        const s = typeof step === 'string' ? { cmd: step } : typeof step === 'function' ? { cmd: step(api) } : step;
        const edits = s.edits ? [...s.edits] : (s.edit !== undefined ? [s.edit] : []);
        let r = shell.run(s.cmd);
        history.push(s.cmd);
        log.push(`$ ${s.cmd}`, ...r.out.map(stripAnsi));
        while (r.editor) {
          const e = edits.shift();
          const text = typeof e === 'function' ? e(r.editor.content) : (e ?? r.editor.content);
          r = shell.resolveEditor(r.editor, text);
          log.push(`  [saved ${r.editor?.title || 'editor'}]`, ...r.out.map(stripAnsi));
        }
        def.onCommand?.(s.cmd, r, { ...H, ...api, say: () => {} });
      }
      let pass = false;
      try { pass = !!t.check(api); } catch (e) { log.push('check threw: ' + e.message); }
      if (!pass) { ok = false; console.log(`✗ ${id} task ${i + 1}: ${t.title}`); console.log(log.slice(-25).map(l => '    ' + l).join('\n')); break; }
    }
    if (ok) console.log(`✓ ${id} (${def.tasks.length} tasks)`); else failures++;
  }
}
console.log(`\n${labs - failures}/${labs} labs solvable, ${warnings} premature-pass warnings`);
process.exit(failures ? 1 : 0);
