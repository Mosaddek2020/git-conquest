## story | The release that went wrong at 4:55 pm

Forecast shipped v1.2.0 with a shiny hourly forecast. The tests were green, staging's `/health` said `ok`, and the deploy took ninety seconds. Five minutes later the support inbox filled up: the home page showed *500 Internal Server Error* for everyone.

Amira, on call, did not start debugging in production. She ran one command to **redeploy v1.1.0**, approved it, and the site was back within two minutes. Only then, with users happy again, did the team look for the cause: the new code assumed every forecast had hourly data, and some did not.

They **reverted** the feature on `main`, added a **smoke test** that loads the real home page after every staging deploy, and shipped **v1.2.1** the next morning. The incident report was half a page long, because the pipeline had made the fix boring.

## model | Restore first, then fix

When a release breaks production, you have two separate jobs:

1. **Restore service** (mitigate): get users back to a working version as fast as possible.
2. **Fix the cause** (remediate): understand and correct the bug, calmly, through the normal pipeline.

Mixing them up ("let me just quickly patch it live") is how a 5-minute incident becomes a 3-hour one.

Ways to restore:

| Move | How | When |
|---|---|---|
| **Roll back** | Redeploy the previous good tag: `gh workflow run release.yml --ref v1.1.0` | The fastest, safest default |
| **Feature flag off** | Switch the new feature off in configuration, no deploy | When the feature was released behind a flag |
| **Roll forward** | Ship a fix quickly through the pipeline | Only when the fix is tiny and certain, or a rollback is impossible (for example after a database migration) |

Because each release is a **tag** and the pipeline deploys exactly what it is given, a rollback is just *deploying an older, known-good tag*. Nothing is rebuilt and nothing is typed by hand.

After restoring, fix forward on `main`: often `git revert <commit>`, which adds a new commit undoing the bad one without rewriting shared history. Then release a new patch version (`v1.2.1`). Never move or reuse an existing tag: `v1.2.0` means one exact commit forever.

## model | Making the pipeline catch it next time

Forecast's `/health` endpoint said `ok` while the home page crashed. A **health check** only proves the process is running. A **smoke test** exercises what users actually do:

```yaml
      - run: ./scripts/deploy.sh staging
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
      - name: Smoke test
        run: curl -f https://staging.forecast.example/
```

`curl -f` (fail) exits with an error when the server answers 400 or above, so the job goes red. A broken build then stops at staging instead of reaching production.

Safer release strategies used at scale:

- **Blue-green**: run the new version next to the old one and switch traffic over in one step; switching back is instant.
- **Canary**: send 1% of users to the new version, watch error rates, then widen.
- **Feature flags**: deploy code switched off, then turn it on for some users. Deploying and releasing become separate decisions.

## commands | Incident commands

```term
$ curl -i https://forecast.example/              # what do users see? (status line first)
$ curl https://forecast.example/health           # which version is running?
$ git log --oneline v1.1.0..v1.2.0               # what changed in the bad release?
$ gh workflow run release.yml --ref v1.1.0       # roll back: redeploy the last good tag
$ git revert --no-edit <commit>                  # undo the bad change on main
$ git tag -a v1.2.1 -m "Forecast 1.2.1" && git push origin v1.2.1   # ship the fix
```

## analogy | The emergency exit and the repair crew

When a fire alarm sounds in a theatre, the ushers open the exits first. They do not start looking for the cause while the audience is still inside. Once everyone is safe, the repair crew comes in with the right tools and no time pressure.

A rollback is the emergency exit. The revert and the patch release are the repair crew. Your pipeline is the reason the exits are clearly marked and always unlocked.

## team | Incident habits

- **Make rollback a rehearsed, one-command action.** Practise it when nothing is on fire.
- **Communicate early**: a short "we are aware, rolling back" message beats silence.
- **Blameless postmortems**: write down what happened, why the pipeline let it through, and one or two concrete improvements, like the smoke test above. Ask "what allowed this?", not "who did this?".
- **Keep releases small** so the list of suspects in `v1.1.0..v1.2.0` is short.
- **Database changes need care**: make migrations backward compatible (add columns before using them, remove them a release later), so rolling back the code does not break on the new schema.

## traps | Rollback traps

**Debugging in production** while users are still affected. Restore first.

**Re-tagging.** Moving `v1.2.0` to a different commit breaks everyone's idea of what v1.2.0 is. Make a new version.

**Force-pushing `main` to "remove" the bad commit.** Use `git revert`; history is shared.

**Health checks that test nothing.** A `/health` that always says `ok` will say `ok` during an outage.

**Forgetting the database.** If v1.2.0 ran a migration that v1.1.0 cannot handle, the rollback itself fails. Plan migrations so both versions work.

## lab | Release day

Forecast's pipeline from the previous lesson is in place: `main` deploys to staging, and version tags deploy to production after your approval. Production runs **v1.1.0**.

While you were away, a teammate merged the hourly forecast feature. Today you ship it as **v1.2.0**. Something will go wrong; handle it like a professional.
