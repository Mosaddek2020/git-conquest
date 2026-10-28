## story | The resolution that dropped a feature

Two branches changed `pricing.js`: one added a customer discount, the other added tax. The merge conflicted. Elif asked the assistant to resolve it. In two seconds it produced clean, tidy code without conflict markers, and Elif committed it.

Three days later, finance noticed nobody had received a discount since the merge. The "resolution" had kept the tax and silently dropped the discount. It *looked* resolved, because it had no markers, and it compiled. Nobody ran the tests before committing.

## model | No markers is not the same as correct

A correct resolution keeps the **intent of both sides**. Checklist after any resolution, by you or by an assistant:

| Check | How |
|---|---|
| what did each side change? | `git diff HEAD...MERGE_HEAD -- file`, `git log --merge -p`, or read the conflict markers carefully |
| does the result contain both intents? | read the resolved file next to the two sides |
| does it work? | **run the tests** before `git add` |
| what exactly are you committing? | `git diff --staged` |

Assistants are good at removing markers and producing plausible code. They do not know which side was more important, and they rarely say when they dropped something.

## commands | Let it propose, make the tests decide

```term
$ git merge main
CONFLICT (content): Merge conflict in pricing.js
$ ai -f pricing.js "resolve this merge conflict"     # a proposal, written into the file
$ npm test                                           # does it keep both behaviours?
FAIL pricing.test.js: discount was not applied
$ edit pricing.js                                    # fix the proposal by hand
$ npm test && git add pricing.js && git commit --no-edit
```

## analogy | A mediator

A mediator who settles every dispute by agreeing with whoever spoke last is fast, and wrong half the time. A good resolution keeps what both parties needed; the tests are the contract both sides signed.

## team | Team norms

- Never commit a conflict resolution without running the tests.
- When a resolution is non-trivial, say so in the merge message or PR, so reviewers look at it.
- Turn on `rerere` (Realm 13) so a resolution you checked once is reused, not reinvented.

## traps | Traps

**No markers, no problem?** Wrong: markers only show *where* git gave up, not whether the result is right.

**Keeping "ours" or "theirs" wholesale.** `git checkout --ours file` throws away the other side completely.

**Resolving without understanding either side.** Read both changes first.

## lab | Trust, but test

In `~/checkout`, merging `main` into `add-tax` conflicts in `pricing.js`. Let the assistant propose a resolution, find out with the tests whether it is right, fix it so both the discount and the tax survive, and finish the merge.
