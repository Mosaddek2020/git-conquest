## brief | Hand-over day

**The scenario.** You are taking over `you/brand-kit`, the design system and brand assets for a growing company. Next week, a dozen designers and developers join the repository, and the security team has already turned on **Require signed commits** for `main`.

Your local clone has two commits you never managed to push, and they have problems:

1. CI fails with `/bin/sh^M: bad interpreter` because `scripts/build.sh` has Windows line endings.
2. One commit adds `video/brand-film.mov`, 240 MB, which GitHub will reject.
3. Neither commit is signed, and you have no signing set up on this laptop.

Before the team arrives: fix the line endings for good, move the film into LFS without losing your commits, set up signing, make every unpushed commit signed, get it all onto GitHub, and make sure the film team reviews anything under `video/`.

Use the Field Guide whenever you need to. That is what it is for.

## recap | Scale & Trust

- **Signatures** prove who made a commit; **Verified** means GitHub knows the key and the email.
- **`.gitattributes`** decides how text is stored, for everyone: no more whole-file diffs or `^M` scripts.
- **Git LFS** keeps big binaries out of git history; `git lfs migrate import` rescues commits made before tracking.
- **Shallow, partial and sparse** clones make huge repositories fast without losing the workflow.
- A leaked secret is fixed by **rotating first**, then `git filter-repo` in a fresh clone, then a force-push and re-clones, then **push protection**.
- **CODEOWNERS** routes reviews to the right people; the **merge queue** tests what will actually land.

## lab | brand-kit, before the team arrives
