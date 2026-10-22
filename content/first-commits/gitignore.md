## story | The 400 MB commit

On his first pull request, Diego's diff showed 18,437 changed files. Reviewers' browsers froze. He had committed the `node_modules/` folder (all the downloaded libraries, which anyone can recreate with `npm install`), a `.DS_Store` file from his Mac, the `dist/` build output, and, worst of all, a `.env` file containing the production database password.

The libraries and build output were just noise. The password was a security incident: it had to be changed immediately, because once it is pushed to GitHub you must assume someone has seen it.

All of this is prevented by one small text file named `.gitignore`.

## model | What belongs in a repository

**Commit** what people need to rebuild and understand the project:

- source code, tests, documentation,
- configuration that is the same for everyone (with **no secrets**),
- the dependency *list* (`package.json`, `requirements.txt`), not the dependencies themselves.

**Ignore** anything that is generated, personal, huge or secret:

| Kind | Examples |
|---|---|
| Dependencies | `node_modules/`, `vendor/`, `.venv/` |
| Build output | `dist/`, `build/`, `*.class`, `*.o` |
| Logs and temp files | `*.log`, `tmp/`, `*.swp` |
| OS and editor junk | `.DS_Store`, `Thumbs.db`, `.idea/`, `.vscode/` (sometimes) |
| Secrets | `.env`, `*.pem`, `credentials.json` |

`.gitignore` only affects **untracked** files. If a file is already committed, adding it to `.gitignore` does nothing until you stop tracking it with `git rm --cached`.

## commands | Pattern syntax

`.gitignore` lists one pattern per line:

```text
# Comments start with a hash
node_modules/      # a trailing slash matches folders only
*.log              # any file ending in .log, in any folder
/build             # a leading slash anchors to the repository root only
.env               # an exact name, anywhere
!keep.log          # "!" re-includes something an earlier pattern excluded
docs/**/*.pdf      # ** matches any number of folders
```

Then commit the `.gitignore` itself, so the whole team shares the rules:

```term
$ echo "node_modules/" >> .gitignore
$ git add .gitignore
$ git commit -m "Ignore installed dependencies"
```

Useful checks:

```term
$ git status --ignored          # also list what is being ignored
$ git rm --cached .env          # stop tracking a file that was committed by mistake (keeps it on disk)
$ git add -f special.log        # force-add one ignored file (rarely needed)
```

> [!TIP]
> GitHub keeps ready-made templates at github.com/github/gitignore (Node, Python, Java…), and offers to add one when you create a repository.

## analogy | The bouncer's list

`.gitignore` is the list held by the bouncer at the door of your repository. Anyone on the list is turned away from `git add`, quietly, without an argument. But the list only applies at the door: someone already inside the club (a file already tracked) is not thrown out just because their name is added to the list later. You have to escort them out yourself with `git rm --cached`.

## team | Ignore rules on real projects

- Add `.gitignore` in the **very first commit**, before anyone runs `git add .`.
- Teams commit an **example** config with fake values (`.env.example`) and ignore the real one (`.env`).
- Personal junk from your own tools (editor folders, OS files) can go in a **global** ignore file so you do not have to add it to every project: `git config --global core.excludesFile ~/.gitignore_global`.
- When a secret is committed and pushed, removing it in a new commit is **not enough**. It remains in history. Rotate (change) the secret immediately, then consider rewriting history. The Hero Trials realm covers this.

## traps | Ignore gotchas

**Adding a tracked file to `.gitignore` and expecting it to vanish.** It does not. Use `git rm --cached <file>` and commit.

**Ignoring `.gitignore`.** Commit it. It is part of the project.

**`*.log` vs `/logs`.** `*.log` matches files anywhere; `/logs` matches only a top-level `logs` entry; `logs/` matches any folder named logs.

**Negation inside an ignored folder.** `node_modules/` followed by `!node_modules/keep.js` does not work: git does not even look inside an ignored folder. Ignore the folder's contents (`node_modules/*`) if you need exceptions.

## lab | Keep the junk out

A web project has collected dependencies, logs, build output, an editor folder and a secrets file. Someone even committed a log file already. Write a `.gitignore` that keeps everything except the source out, fix the file that was tracked by mistake, and commit.

Use `edit .gitignore` to write the file comfortably, or build it line by line with `echo "pattern" >> .gitignore`.
