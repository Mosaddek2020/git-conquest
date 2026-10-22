## story | "Password authentication was removed"

Emeka tried to push for the first time from a new computer. Git asked for his GitHub username and password, he typed them, and got:

```term
remote: Support for password authentication was removed on August 13, 2021.
fatal: Authentication failed for 'https://github.com/emeka/api/'
```

GitHub no longer accepts account passwords for git operations. You prove who you are with either a **token** over HTTPS (usually handled for you by `gh auth login` or a credential manager) or an **SSH key**. He set up an SSH key once, and never typed a password for git again.

## model | Two ways to prove who you are

| | HTTPS | SSH |
|---|---|---|
| URL | `https://github.com/owner/repo.git` | `git@github.com:owner/repo.git` |
| Proof | a personal access token (PAT) or OAuth token, stored by a credential helper | a key pair: private key on your machine, public key on GitHub |
| Setup | `gh auth login` (easiest) or create a PAT and let the credential manager remember it | `ssh-keygen`, then add the `.pub` key to GitHub |
| Works through strict firewalls | usually yes | sometimes blocked (port 22) |

```diagram
ssh-keys
```

An SSH key pair is two files. The **private** key (`id_ed25519`) never leaves your machine. The **public** key (`id_ed25519.pub`) can be shared freely: GitHub uses it to check that whoever connects holds the matching private key.

## commands | Setting up both

**HTTPS with the GitHub CLI (easiest)**

```term
$ gh auth login            # follow the prompts; choose HTTPS; git is configured to use the token
$ gh auth status
```

**SSH**

```term
$ ssh-keygen -t ed25519 -C "you@example.com"   # create the key pair (press Enter for defaults)
$ cat ~/.ssh/id_ed25519.pub                     # the PUBLIC key: safe to share
$ gh ssh-key add ~/.ssh/id_ed25519.pub --title "work laptop"   # or paste it in GitHub → Settings → SSH keys
$ ssh -T git@github.com                         # test: "Hi you! You've successfully authenticated…"
$ git remote set-url origin git@github.com:you/api.git   # switch an existing repo to SSH
```

A passphrase on your key adds protection if the laptop is stolen; an SSH agent remembers it so you type it rarely.

## analogy | Padlock and key

Handing GitHub your public key is like giving the building manager a padlock that only your key opens. They fit your padlock to your door. Anyone can see the padlock; only you have the key. If your laptop is stolen, you ask the manager to remove that padlock (delete the key on GitHub) and fit a new one.

## team | Security habits

- **Never share or commit private keys or tokens.** A token in a repository is the same as a password in a repository.
- **One key per machine**, named clearly ("work laptop", "home desktop"), so you can revoke one without the others.
- **Fine-grained tokens with expiry dates** for scripts and CI, limited to the repositories they need.
- **Two-factor authentication** on your GitHub account. Many organisations require it.

## traps | Authentication traps

**Using your GitHub password for git over HTTPS.** It will not work. Use `gh auth login` or a token.

**Pasting the private key into GitHub.** Always the `.pub` file.

**"Permission denied (publickey)"** means GitHub did not accept any of your SSH keys: the key is not added, the agent is not running, or you are using a different key than you think. `ssh -T git@github.com` is the quickest test.

**403 on push with valid credentials** means you are authenticated but not allowed to write to that repository: ask for access or fork it (Open Source realm).

## lab | Switch to SSH

Your repository uses HTTPS. Set up an SSH key, register it with GitHub, test the connection, and switch the repository to SSH. Try a push before you add the key to see the error first.
