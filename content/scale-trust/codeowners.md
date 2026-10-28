## story | Who should have looked at this?

A frontend developer changed a constant in `payments/fees.js` while tidying up imports. A frontend teammate approved: the diff looked tidy. Nobody on the payments team saw it. For two days, every card payment was charged a 0.3% fee twice.

The fix was a one-line file: **CODEOWNERS**. It says which people or teams own which paths. GitHub then automatically requests a review from the owners of every file a pull request touches, and the branch rule **Require review from Code Owners** blocks the merge until one of them approves.

## model | Paths to owners

`.github/CODEOWNERS` (or `CODEOWNERS` in the root, or `docs/`) on the **base branch**:

```
# the last matching line wins
*              @acme/web
/payments/     @acme/payments
/docs/         @acme/docs
*.sql          @acme/dba
```

| Rule | Effect |
|---|---|
| patterns work like `.gitignore` | `*.js`, `/docs/`, `apps/web/` |
| **the last matching line wins** | so put the catch-all `*` first and specific paths later |
| owners are `@user`, `@org/team` or an email | teams must have write access |
| a PR touching owned files | GitHub requests a review from those owners |
| + branch rule *Require review from Code Owners* | at least one owner of **each** owned file must approve |

## commands | Write it, test it

```term
$ mkdir -p .github
$ printf "* @acme/web\n/payments/ @acme/payments\n/docs/ @acme/docs\n" > .github/CODEOWNERS
$ git switch -c codeowners
$ git add .github/CODEOWNERS && git commit -m "Add CODEOWNERS"
$ git push -u origin codeowners
$ gh pr create --fill
$ gh pr view 1                         # "Code owners: payments/fees.js → @acme/payments"
$ gh pr edit 1 --add-reviewer omar     # ask a specific owner
```

Turn on **Require review from Code Owners** in the repository's branch protection settings (in this course: the GitHub tab → *Settings · branch protection*).

## analogy | Keys to the rooms

A building has a front-desk key that opens every door, and specialists who hold the keys to the server room and the safe. CODEOWNERS is the key register: anyone can propose changes anywhere, but the person who holds the key for that room must sign off.

## team | Using it well

- Own **areas**, not every file: teams, not individuals, so reviews do not wait for one person's holiday.
- Keep the file small and reviewed. Because the last match wins, a misplaced `*` at the bottom silently overrides everything above it.
- CODEOWNERS also tells newcomers whom to ask about a part of the code.
- The file itself deserves an owner: `/.github/ @acme/platform`.

## traps | CODEOWNERS traps

**Catch-all at the bottom.** `*` as the last line wins for every file, so nobody else is ever requested.

**Owners without write access.** GitHub ignores them; the rule then has no effective owner.

**File on the wrong branch.** Only the CODEOWNERS on the PR's **base** branch counts. A PR that adds the file does not apply it to itself.

**Expecting it to block without the rule.** Without *Require review from Code Owners*, owners are only requested, not required.

## lab | Give payments a gatekeeper

In `acme/storefront`, open PR #1 renames a function in `payments/` and was approved by Priya, who works on the web app. Add a CODEOWNERS file, turn on code-owner reviews, and make sure the payments team signs off before PR #1 can merge.
