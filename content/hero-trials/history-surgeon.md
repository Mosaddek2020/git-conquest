## brief | History surgeon

**The scenario.** A security scanner reports that `you/vault-api` contains a live payment key. It was committed early in the project, in `config/settings.js`, and later replaced by an environment variable. Because it is that old, it is in **every branch and the v1.0.0 tag**: `main`, `release/1.x` and Priya's `feature/refunds`.

Priya is mid-feature: her clone at `~/priya-vault` has one commit on `feature/refunds` she has not pushed yet. She asked you to make sure it survives.

Operate like a surgeon, in the right order:

1. **Stop the bleeding.** Revoke the key (the `vault` CLI rotates it).
2. **Prepare.** Work in a fresh clone in `~/scrub` that has a local branch for every remote branch; a rewrite only touches local branches and tags.
3. **Operate.** Replace the key in every commit of every branch and tag.
4. **Close up.** Push the rewritten branches and tags, and turn on push protection.
5. **Aftercare.** Move Priya's unpushed commit onto the rewritten `feature/refunds` and push it, then tell the team to re-clone.

## lab | vault-api, scrubbed
