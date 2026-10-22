import { World, stripAnsi } from '../js/git/world.js';
import { Shell } from '../js/git/shell.js';
import { seedRemote } from '../js/git/github.js';

const w = new World();
const sh = new Shell(w);
const run = (line, editText) => {
  let r = sh.run(line);
  console.log(`\x1b[36m$ ${line}\x1b[0m`);
  console.log(r.out.map(stripAnsi).join('\n'));
  while (r.editor) {
    const text = typeof editText === 'function' ? editText(r.editor.content) : (editText ?? r.editor.content);
    console.log(`  [editor ${r.editor.title}] -> saving`);
    r = sh.resolveEditor(r.editor, text);
    console.log(r.out.map(stripAnsi).join('\n'));
    editText = undefined;
  }
  return r;
};
run('mkdir project && cd project && git init');
run('echo "# My App" > README.md && echo "console.log(1)" > app.js');
run('git status');
run('git add README.md');
run('git status -s');
run('git commit -m "Add README"');
run('git add . && git commit -m "Add app"');
run('git log --oneline');
run('echo "more" >> README.md && git diff');
run('git commit -am "Expand README"');
run('git switch -c feature');
run('echo "feature line" >> app.js && git commit -am "Feature work"');
run('git switch main');
run('echo "main line" >> app.js && git commit -am "Main work"');
run('git merge feature');
run('git status');
run('cat app.js');
run('printf "console.log(1)\\nmain line\\nfeature line\\n" > app.js && git add app.js && git commit --no-edit');
run('git log --oneline --graph --all');
run('git branch -d feature');
run('git reset --hard HEAD~1');
run('git reflog');
run('git cat-file -p HEAD');
run('git cat-file -p HEAD^{tree}');
run('echo hello | git hash-object --stdin');
run('ls -a && ls .git && cat .git/HEAD');
// remotes
seedRemote(w, 'acme', 'webshop', [{ message: 'Initial commit', files: { 'README.md': '# Webshop\n', 'index.html': '<h1>Shop</h1>\n' } }, { message: 'Add cart', files: { 'cart.js': 'export const cart = [];\n' } }]);
run('cd ~ && git clone https://github.com/acme/webshop.git && cd webshop && git log --oneline && git branch -vv');
run('echo x >> README.md && git commit -am "Tweak readme" && git push');
