## story | 412 lines changed, one line fixed

Sam fixed a rounding bug in `invoice.js`: one line. The pull request showed **412 lines changed**. Every single line was red and green, and the reviewers could not find the real fix in the noise.

Sam's editor on Windows had saved the file with Windows line endings. The file had been written on a Mac with Unix line endings. To git, every line had changed, because every line now ended with an extra invisible character.

A week later the build broke with `/bin/sh^M: bad interpreter`: a shell script had picked up Windows endings too, and Linux could not run it. A three-line file called `.gitattributes` would have prevented both.

## model | CR, LF and who converts what

Text files end each line with invisible characters:

| System | Line ending | Shown as |
|---|---|---|
| Linux, macOS | LF (`\n`) | `$` in `cat -A` |
| Windows | CR LF (`\r\n`) | `^M$` in `cat -A` |

```diagram
line-endings
```

The fix is to **decide once, in the repository**, how text is stored. Git applies the rule on `git add` (CRLF becomes LF in the repository) and, if you ask, on checkout.

| `.gitattributes` line | Meaning |
|---|---|
| `* text=auto eol=lf` | git decides what is text; text is stored as LF and checked out as LF |
| `*.sh text eol=lf` | shell scripts always LF, even on Windows (or they will not run) |
| `*.bat text eol=crlf` | Windows batch files keep CRLF |
| `*.png binary` | never touch these bytes (no conversion, no text diff) |

`core.autocrlf` is the older, *per-person* setting. `.gitattributes` is better because it is committed: the rule travels with the repository, so every teammate gets it.

## commands | Diagnose and fix

```term
$ file invoice.js                  # "… with CRLF line terminators"
$ cat -A invoice.js | head -3      # ^M$ at line ends means CRLF
$ git ls-files --eol               # i/ = in the index, w/ = in your working tree
i/crlf  w/crlf  attr/                 invoice.js
$ printf "* text=auto eol=lf\n*.png binary\n" > .gitattributes
$ git add --renormalize .          # re-apply the rules to every tracked file
$ git add .gitattributes
$ git commit -m "Normalize line endings to LF"
$ git ls-files --eol
i/lf    w/crlf  attr/text=auto eol=lf invoice.js
```

Make blame skip the big normalization commit:

```term
$ git rev-parse HEAD >> .git-blame-ignore-revs
$ git config blame.ignoreRevsFile .git-blame-ignore-revs
```

For your own machine on macOS or Linux, `git config --global core.autocrlf input` converts any CRLF you create into LF on commit.

## analogy | One plug standard

Countries use different power plugs. Instead of asking every traveller to carry the right adapter, the hotel fits one standard socket in every room and hands out adapters at the door. `.gitattributes` is the hotel rule: one standard inside the building, conversion at the door.

## team | Team habits

- Add a `.gitattributes` in the **first commit** of a new repository. Templates from GitHub often include one.
- When you add it to an old repository, renormalize in **one dedicated commit**, then add that commit to `.git-blame-ignore-revs`.
- Tell Windows teammates to pull after the normalization and, if their working files still look modified, run `git add --renormalize .` once.
- Mark binary formats (`*.png`, `*.pdf`, `*.zip`) as `binary` so git never "fixes" their bytes.

## traps | Line-ending traps

**Mixing the old and new way.** `core.autocrlf true` on one machine plus `.gitattributes` rules can fight. In the repository, `.gitattributes` wins.

**Renormalizing in a feature PR.** It hides the real change in thousands of whitespace lines. Do it alone.

**Forgetting binaries.** `* text=auto` usually detects binaries, but explicit `binary` rules are safer for formats that look like text.

**Shell scripts with CRLF.** They fail with `bad interpreter: /bin/sh^M`. Always `*.sh text eol=lf`.

## lab | One standard for invoice-tool

In `~/invoice-tool`, Sam's last commit converted two files to Windows line endings. Diagnose it, add rules to `.gitattributes`, renormalize in one commit, keep that commit out of `git blame`, and protect your own machine.
