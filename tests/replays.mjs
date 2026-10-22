// Runs every ```replay block from the lesson text and prints each step's exit code and output.
import text from '../js/content/text.js';
import { renderMarkdown } from '../js/ui/markdown.js';
import { World, stripAnsi } from '../js/git/world.js';
import { Shell } from '../js/git/shell.js';
import { splitTop, expand } from '../js/ui/replay.js';

const verbose = process.argv.includes('-v');
let count = 0, failing = 0;
for (const [lessonId, { lenses }] of Object.entries(text)) {
  for (const lens of lenses) {
    const embeds = [];
    renderMarkdown(lens.md, embeds);
    for (const e of embeds.filter(x => x.kind === 'replay')) {
      count++;
      const world = new World({ time: 1767258000 });
      const shell = new Shell(world);
      world.dirs.add('/home/dev/project');
      shell.cwd = '/home/dev/project';
      const lines = [`■ ${lessonId} :: ${e.spec.title}`];
      for (const seg of e.spec.setup) { const { cmd } = expand(seg, world, shell); if (cmd) { const r = shell.run(cmd, { record: false }); if (r.code) lines.push(`  setup "${seg}" exit ${r.code}: ${r.out.map(stripAnsi).join(' | ')}`); } }
      for (const step of e.spec.steps) {
        for (const seg of splitTop(step.cmd)) {
          const { cmd } = expand(seg, world, shell);
          if (!cmd) continue;
          const r = shell.run(cmd, { record: false });
          lines.push(`  $ ${seg}  [exit ${r.code}]`);
          if (verbose || r.code) lines.push(...r.out.map(l => '      ' + stripAnsi(l)).slice(0, 6));
          if (r.code) failing++;
        }
      }
      console.log(lines.join('\n'));
    }
  }
}
console.log(`\n${count} replays, ${failing} non-zero steps (some are intentional, e.g. rejected pushes)`);
