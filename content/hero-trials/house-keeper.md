## brief | Clean house

**The scenario.** You have joined the team that maintains Acme's internal `handbook`, cloned into `~/work/handbook` on a laptop whose global email is your personal one. Before you push anything, you notice several things are not right:

- Your three unpushed commits were made with your **personal email**, and one of them (`Add local settings`) committed a `.env` file with a real SMTP password.
- `git shortlog -sne` lists **Priya twice**, under an old laptop address.
- `git blame docs/style.css` credits **Format Bot** with every line since last month's reformat.
- The next release, **v3.0**, must ship as a tarball **without** the `drafts/` folder.

Leave the repository, and GitHub, in a state you would be proud to hand over:

1. Every repository under `~/work/` commits with `dev@acme.example`, automatically.
2. Your work is on GitHub, authored correctly, with no trace of the `.env` in anything you pushed.
3. The leaked content no longer exists anywhere in your local repository either.
4. Shortlog and blame tell the truth, for everyone, not just on your machine.
5. `~/handbook-3.0.tar.gz` contains tag `v3.0` inside a `handbook-3.0/` folder, without `drafts/`.

## lab | The handbook handover
