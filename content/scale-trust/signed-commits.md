## story | The commit that wasn't hers

One Monday, a commit appeared in a popular open-source library. The author line said *Maya Chen*, one of its best-known maintainers. The change looked harmless: a "small refactor" of the update checker. It quietly sent every user's environment variables to a server abroad.

Maya had not written it. Anyone can run `git config user.name "Maya Chen"`: the author line is just text the committer types. The attacker had a stolen access token for a bot account, so the push was allowed, and the familiar name made reviewers relax.

After the clean-up, the project changed one rule: **every commit on `main` must be signed**, with a key only its author holds. A forged name is easy. A forged signature is not.

## model | Name tags versus signatures

```diagram
signed-commits
```

| Piece | What it proves |
|---|---|
| `user.name`, `user.email` | nothing: anyone can type anything |
| a **signature** on the commit | the commit was made by someone holding a particular **private key**, and has not changed since |
| GitHub's **Verified** badge | that key is registered as a **signing key** on the account, *and* the commit email belongs to that account |
| branch rule **Require signed commits** | GitHub refuses pushes containing unverified commits |

Git can sign with GPG, X.509 or **SSH keys**. SSH signing is the simplest today: you probably already have an SSH key, and the same kind of key can sign.

Verifying on *your* machine needs one more thing: an **allowed signers** file, a list of "this email uses this key". It is your local address book of trusted keys.

## commands | Set up SSH signing once

```term
$ ssh-keygen -t ed25519 -C "you@example.com"           # if you have no key yet
$ git config --global gpg.format ssh                    # sign with SSH, not GPG
$ git config --global user.signingkey ~/.ssh/id_ed25519.pub
$ git config --global commit.gpgsign true               # sign every commit
$ git config --global tag.gpgsign true                  # and every annotated tag
$ git commit -S -m "…"                                  # or sign just this one
$ git commit --amend --no-edit                          # re-sign the last commit
$ git rebase --force-rebase origin/main                 # re-sign every unpushed commit
```

Verify locally:

```term
$ echo "you@example.com $(cat ~/.ssh/id_ed25519.pub)" > ~/.ssh/allowed_signers
$ git config --global gpg.ssh.allowedSignersFile ~/.ssh/allowed_signers
$ git verify-commit HEAD
Good "git" signature for you@example.com with ED25519 key SHA256:…
$ git log --show-signature -1
$ git log --format="%h %G? %an  %s"      # G good, N none, U unknown key, E cannot check
```

Tell GitHub the key may sign (this is separate from the key you push with):

```term
$ gh ssh-key add ~/.ssh/id_ed25519.pub --type signing --title "laptop signing key"
```

## analogy | A wax seal

Anyone can write "From the King" at the top of a letter. Only the king has the ring that presses the royal seal into the wax. Signing a commit is pressing your seal. Verifying is comparing the seal with the one on file.

## team | How teams use it

- Open-source projects and regulated companies often turn on **Require signed commits** for `main` and release branches.
- Merges and squashes done *by GitHub* (the green button) are signed by GitHub's own key and show as Verified.
- Keep the signing key on the device. When you leave a laptop, revoke its key on GitHub and the old commits still show who signed them at the time.
- Bots and CI that create commits need their own signing key, or use the GitHub API, which signs for them.

## traps | Signing traps

**Wrong email.** The signature is valid but GitHub says Unverified: the commit email is not one of your account's verified emails. Check `git config user.email`.

**Auth key is not a signing key.** Adding a key as an *authentication* key lets you push; it does not make your signatures Verified. Add it again with `--type signing`.

**Unsigned commits already made.** Turning on `commit.gpgsign` only affects new commits. Re-sign unpushed ones with `git commit --amend --no-edit` (last one) or `git rebase --force-rebase <base>` (several).

**Signing is not review.** A signed commit proves *who*, not *good*. It complements code review; it does not replace it.

## lab | Seal your commits

You maintain `you/docs-site`. After a forged-commit scare, `main` now requires signed commits, and your unpushed fix is not signed.

Set up SSH signing, re-sign your commit, prove the signature verifies on your machine, then make GitHub accept it.
