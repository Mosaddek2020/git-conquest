## story | Why developers live in a text window

Nadia, a designer moving into front-end development, asked her mentor why everyone at the company typed commands into a black window when there were perfectly good apps with buttons.

Her mentor opened a terminal and typed one line:

```term
$ git log --author="Nadia" --since="1 month ago" --oneline
```

It listed every change Nadia had made in the last month, across a project with 40,000 files, in under a second. "Find me the button for that," he said.

Buttons are great for things you do the same way every time. The terminal is better when you want to **say exactly what you mean**: combine options, repeat a command, paste it into a chat so a colleague can run the identical thing, or put it into an automated script. Git was born on the command line, and every git tool with buttons is running these same commands underneath.

You do not need to become a terminal expert. You need about ten commands. This lesson gives you all of them.

## analogy | Giving directions in a building

Using a terminal is like moving around a large building while giving instructions out loud.

- You are always **standing in one room**: the *current directory*. `pwd` ("print working directory") answers "where am I?"
- `ls` ("list") is looking around the room: what files and doors are here?
- `cd hallway` ("change directory") walks through a door into the next room. `cd ..` steps back out to the room you came from. `cd ~` teleports you to your own office: your *home directory*.
- `mkdir storage` builds a new room. `touch notes.txt` puts an empty sheet of paper on the desk. `rm notes.txt` shreds it, and there is no recycling bin, so be sure.

A **path** is a set of directions. `projects/shop/README.md` means "through the projects door, then the shop door, then the README.md sheet." Directions that start with `/` start from the building's front entrance (the *root*), no matter where you stand.

## commands | The survival kit

Every command follows the same pattern: **name**, then **options** (start with `-`), then **arguments** (what to act on).

```term
$ ls -a projects
#  ^   ^  ^ argument: which folder
#  |   option: -a shows hidden files too
#  command name
```

| Command | What it does | Example |
|---|---|---|
| `pwd` | Show the folder you are in | `pwd` |
| `ls` | List files; `-a` includes hidden ones (names starting with `.`) | `ls -a` |
| `cd <dir>` | Move into a folder; `cd ..` goes up, `cd ~` goes home | `cd projects` |
| `mkdir <dir>` | Make a folder; `-p` makes parent folders too | `mkdir -p code/demo` |
| `touch <file>` | Create an empty file | `touch notes.txt` |
| `echo "text" > file` | Write text into a file, **replacing** what was there | `echo "hi" > a.txt` |
| `echo "text" >> file` | **Append** a line to the end of a file | `echo "more" >> a.txt` |
| `cat <file>` | Print a file | `cat a.txt` |
| `mv <a> <b>` | Move or rename | `mv a.txt b.txt` |
| `cp <a> <b>` | Copy | `cp b.txt c.txt` |
| `rm <file>` | Delete a file; `-r` for folders | `rm c.txt` |
| `clear` | Clear the screen | `clear` |

Two keyboard habits save hours:

- Press {kbd:Tab} to auto-complete file and folder names. Type `cd pro` then {kbd:Tab}.
- Press {kbd:↑} to bring back your previous command, then edit it.

In this simulator you also have `edit <file>` (aliases `nano`, `code`), which opens a file in an editor panel. In real life you would open the file in VS Code or another editor.

## model | Files, folders and hidden things

Your files form a tree. Here is the home folder you will work in throughout this path:

```term
/home/dev            ← your home, also written ~
├── projects/
│   └── shop/
│       ├── .git/    ← hidden: git's database (you'll meet it soon)
│       ├── index.html
│       └── README.md
└── notes.txt
```

A few rules worth burning in:

- Names starting with a dot (`.git`, `.gitignore`, `.env`) are **hidden**. `ls` skips them; `ls -a` shows them. Git uses dot-files a lot.
- `.` means "this folder" and `..` means "the parent folder". `git add .` means "add everything in this folder".
- Spaces in names cause pain: `my file.txt` needs quotes (`cat "my file.txt"`). Developers prefer `my-file.txt`.
- **`>` replaces, `>>` appends.** Mixing them up is the most common way beginners wipe out a file.

## team | The terminal at work

On a real team, the terminal is how you:

- run the project (`npm run dev`, `python manage.py runserver`),
- run tests before you push (`npm test`),
- use git and GitHub's `gh` tool,
- connect to servers (`ssh deploy@server`),
- follow setup instructions in a README, which are almost always written as commands to paste.

Being able to read a command and predict what it will do is a core professional skill. When a teammate pastes a command in chat, read it before you run it, especially anything with `rm`, `--force` or `sudo`.

> [!TIP]
> On Windows, install **Git for Windows**, which includes "Git Bash", a terminal where every command in this path works. On macOS use the Terminal app; on Linux, any terminal.

## traps | Terminal traps

**Running a command in the wrong folder.** Many surprises come from being one folder off. When in doubt, `pwd` and `ls` first.

**`>` when you meant `>>`.** `echo "new line" > notes.txt` deletes everything else in notes.txt.

**`rm` is forever.** There is no undo in the terminal. (Git can save you, but only for files it was tracking. You will see how.)

**Fear of the error message.** Errors are information. Read the first line and the last line; they usually say exactly what went wrong.

**Typing commands from images.** Copying a command with a "smart quote" (`“` instead of `"`) breaks it. Type quotes yourself.

## lab | Find your way around

Your home folder already has a little content. Work through the tasks to practise every survival command. The **Files** panel shows what is on disk as you go.

If you get lost, `pwd` tells you where you are and `cd ~` takes you home.
