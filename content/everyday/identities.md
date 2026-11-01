## story | Committing as the wrong person

Mira contributed to open source in the evenings and worked at Acme by day, on the same laptop. One Monday her manager asked why the company repository had six commits from `mira.codes@gmail.example`. Her global config held her personal email, and she had forgotten to set the work one in the new clone. Again.

The fix is to stop relying on memory. Git can **switch identity automatically** based on where a repository lives (or which organisation it belongs to). And for the history you cannot change, `.mailmap` makes one person show up as one person.

## model | Config layers, and a conditional include

```diagram
config-layers
```

- Git reads config in layers: system, **global** (`~/.gitconfig`), then **local** (`.git/config`). A later layer wins.
- An **include** pulls in another file. An **includeIf** does it only when a condition holds:
  - `gitdir:~/work/` for repositories inside `~/work/` (the trailing slash means "anything inside");
  - `hasconfig:remote.*.url:https://github.com/acme/**` for any clone of Acme's repositories, wherever it lives;
  - `onbranch:release/` for one branch pattern.
- `git config --show-origin user.email` shows the value **and the file it came from**: the first thing to run when an identity looks wrong.
- **`.mailmap`** maps old names and emails to one canonical identity for `log`, `shortlog`, `blame` and `check-mailmap`. It never rewrites commits.

```replay
title: The right email, automatically
show: graph
setup: init
step: git config --file ~/.gitconfig-work user.email dev@acme.example && git config --global includeIf.gitdir:~/project/.path ~/.gitconfig-work | A separate file for work settings, included only for repositories under ~/project/.
step: git config --show-origin user.email | --show-origin proves which file the value came from.
step: commit "Work commit"; git log -1 --format="%an <%ae>" | New commits here use the work email; everywhere else, the personal one.
```

## commands | Set it up once

```term
$ git config --file ~/.gitconfig-work user.email mira@acme.example
$ git config --file ~/.gitconfig-work user.signingkey ~/.ssh/acme_signing.pub
$ git config --global includeIf.gitdir:~/work/.path ~/.gitconfig-work
$ cd ~/work/api && git config --show-origin user.email
file:/home/mira/.gitconfig-work	mira@acme.example
```

The same thing written in `~/.gitconfig`:

```ini
[user]
	name = Mira Chen
	email = mira.codes@example.com
[includeIf "gitdir:~/work/"]
	path = ~/.gitconfig-work
[includeIf "hasconfig:remote.*.url:https://github.com/acme/**"]
	path = ~/.gitconfig-work
```

Fixing commits that are **not pushed yet**:

```term
$ git rebase origin/main --exec "git commit --amend --no-edit --reset-author"
```

For **published** history, use `.mailmap` instead of rewriting:

```
# canonical identity             <email used in old commits>
Sam Lee <sam.lee@example.org>    <sam@old-isp.example>
Sam Lee <sam.lee@example.org>    <sam@laptop.local>
```

```term
$ git shortlog -sne                         # one line per person, with email
$ git check-mailmap "sam <sam@laptop.local>"
Sam Lee <sam.lee@example.org>
```

## analogy | Two badges, one wallet

You carry a company badge and a library card. A good wallet hands over the right one depending on which door you are at. `includeIf` is that wallet; `.mailmap` is the receptionist who knows "S. Lee", "sam" and "Sam Lee" are the same visitor.

## team | Identity hygiene

- Put the work identity (email, signing key) in a **separate file** and include it by folder or by remote URL. New clones are right by default.
- On GitHub, add every email you commit with to your account (or use the `@users.noreply.github.com` address), so commits link to your profile.
- Keep a `.mailmap` in long-lived projects; maintainers use `git shortlog -sne` for release notes and contributor lists.
- Never "fix" an email by rewriting `main`: it breaks every clone for a cosmetic gain.

## traps | Identity traps

**`gitdir:~/work` without the trailing slash.** It then matches only a repository *at* `~/work` itself. Write `~/work/`.

**Include order.** An `includeIf` placed *before* the `[user]` section is overridden by it. Put includes at the end of `~/.gitconfig`.

**Changing config and expecting old commits to change.** Config only affects new commits. Re-author unpushed ones; mailmap pushed ones.

**Mailmap with the email order reversed.** The format is `Proper Name <proper@email> <commit@email>`: the canonical identity comes first.

## lab | Work email, automatically

You work in `~/work/acme-api` and maintain `~/oss/tinylib` on the same machine. Make every repository under `~/work/` use your Acme email automatically, re-author the two unpushed commits you already made with the wrong one, push them, then tidy up tinylib's contributor list with a `.mailmap`.
