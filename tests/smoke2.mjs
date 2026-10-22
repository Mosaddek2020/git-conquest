import { World, stripAnsi } from '../js/git/world.js';
import { Shell } from '../js/git/shell.js';
import { seedRemote, teammateCommit } from '../js/git/github.js';

const w = new World();
const sh = new Shell(w);
const run = (line, ...edits) => {
  let r = sh.run(line);
  console.log(`\x1b[36m$ ${line}\x1b[0m`);
  console.log(r.out.map(stripAnsi).join('\n'));
  while (r.editor) {
    const e = edits.shift();
    const text = typeof e === 'function' ? e(r.editor.content) : (e ?? r.editor.content);
    console.log(`  [editor ${r.editor.title}]`);
    r = sh.resolveEditor(r.editor, text);
    console.log(r.out.map(stripAnsi).join('\n'));
  }
  return r;
};
run('gh repo create demo --public --clone');
run('cd demo && echo "# Demo" > README.md && git add . && git commit -m "init" && git push -u origin main');
run('git switch -c feat && for x in a; do echo; done');
run('echo a > a.txt && git add a.txt && git commit -m "add a" && echo b > b.txt && git add b.txt && git commit -m "add b" && echo c > c.txt && git add c.txt && git commit -m "WIP c"');
run('git rebase -i HEAD~3', t => t.replace(/^pick (\w+) add b/m, 'squash $1 add b').replace(/^pick (\w+) WIP c/m, 'reword $1 WIP c'), t => 'Add a and b', t => 'Add c');
run('git log --oneline');
run('git push');
run('git push -u origin feat');
run('gh pr create --title "Add letters" --body "Fixes #1"');
run('gh pr view 1');
run('gh pr merge 1 --squash --delete-branch');
run('git log --oneline --all --graph');
teammateCommit(w, 'https://github.com/you/demo.git', { files: { 'team.txt': 'hi\n' }, message: 'Teammate change' });
run('echo local > local.txt && git add . && git commit -m "local work" && git push');
run('git pull');
run('git pull --rebase');
run('git push');
run('git log --oneline --graph');
run('echo wip >> README.md && git stash && git status -s && git stash list && git stash pop');
run('git stash -m "readme tweak" && git switch -c hotfix && git cherry-pick HEAD~1 || true');
run('git switch main && git stash pop && git commit -am "readme" && git revert HEAD --no-edit && git log --oneline -3');
run('git tag v1.0.0 && git tag -a v1.1.0 -m "Release 1.1" && git tag && git show v1.1.0 --stat');
run('echo "node_modules/\n*.log" > .gitignore && mkdir node_modules && touch node_modules/x.js debug.log && git status -s && git add debug.log');
run('git checkout HEAD~2 && git status | head -2 && git switch -');
// bisect
run('cd ~ && mkdir bis && cd bis && git init -q && for i in 1; do :; done');
for (let i = 1; i <= 8; i++) run(`echo "v${i}${i >= 6 ? ' BUG' : ''}" > calc.js && git add . && git commit -qm "Change ${i}"`);
run('git bisect start HEAD HEAD~7 && git bisect run npm test && git bisect reset');
// hooks
run('printf "#!/bin/sh\\nif grep -q TODO app.js; then echo \\"Commit blocked: remove TODO\\"; exit 1; fi\\n" > .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit && echo "TODO fix" > app.js && git add app.js && git commit -m "try"');
run('echo "done" > app.js && git add app.js && git commit -m "fixed"');
run('git blame calc.js && git shortlog -sn');
