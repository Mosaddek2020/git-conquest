## story | The review that saved a launch

Two days before launch, Ji-woo reviewed her colleague Tom's pull request "Add discount codes". The code looked clean. She checked it out locally and tried a code twice: the discount applied twice. One review comment, one fix, one re-review, and the bug never reached a customer.

Code review is not about catching people out. It is how teams share knowledge, keep quality consistent, and catch the mistakes everyone makes.

## model | The review loop

1. The author opens a PR and requests reviewers.
2. Reviewers read the diff (and often run it), then submit a review:
   - **Comment**: questions or remarks, no verdict.
   - **Request changes**: must be addressed before merging.
   - **Approve**: good to go.
3. The author pushes fixes to the same branch; the PR updates; reviewers look again.
4. Once the required approvals and checks are in place, someone merges.

GitHub does not let you approve your own pull request: review is, by definition, a second person.

## commands | Reviewing from the terminal

```term
$ gh pr list                               # PRs waiting
$ gh pr view 21 --comments                 # description, reviews and comments
$ gh pr diff 21                            # read the changes
$ gh pr checkout 21                        # get the branch locally to run it
$ npm test                                 # actually try it
$ gh pr review 21 --request-changes --body "Codes can be applied twice: see cart.js line 14."
$ gh pr review 21 --approve
$ gh pr review 21 --comment --body "Nice cleanup!"
$ git switch main                          # back to your own work
```

## analogy | A second pilot

Commercial aircraft have two pilots and checklists not because pilots are careless, but because everyone misses things sometimes, and the cost of a miss is high. The co-pilot reads back each step. A code reviewer is the co-pilot for a change.

## team | Review etiquette

**As a reviewer**

- Review the **code, not the person**: "This loop runs twice" beats "You wrote this wrong".
- Explain **why**, and suggest an alternative.
- Separate must-fix from nice-to-have: prefix optional remarks with "nit:".
- Respond within a working day; waiting blocks your teammate.
- Approve when the change makes the code **better than before**, not perfect.

**As an author**

- Keep PRs small and well described.
- Reply to every comment (a fix, or a reason).
- Do not take it personally: the goal is shared.

## traps | Review traps

**Rubber-stamping.** "LGTM" (looks good to me) without reading the diff gives a false sense of safety.

**Reviewing only the diff.** Some bugs only appear when you run the code or look at what *was not* changed.

**Huge PRs.** Ask the author to split them.

**Endless nitpicks.** Agree on a formatter and linter so reviews focus on behaviour.

## lab | Review and be reviewed

A teammate has opened a pull request with a bug. Review it properly: read it, run it, and request changes. Then open your own PR and respond to the review you receive.
