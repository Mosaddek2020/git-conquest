## story | The prompt that leaked

Deploys were failing, and Ravi was in a hurry. He piped his entire `git diff` into a public chatbot with *"why does this fail?"*. The diff included `.env.production`, which someone had accidentally committed months earlier, and Ravi had just edited the database password in it.

The chatbot's answer was useful. The password was now in a third-party service's logs. The company's security team spent the afternoon rotating credentials.

Good context makes assistants useful. **The right context is the smallest one that answers the question**, and it never includes secrets.

## model | Context in, nothing private out

| Give the assistant | Do not give it |
|---|---|
| the diff of the file you are asking about: `git diff -- deploy.sh` | the whole working tree or repository |
| the error message and the command that produced it | `.env` files, keys, tokens, customer data |
| a minimal snippet that reproduces the problem | private code, if your organisation only allows approved tools |

Many organisations route AI tools through a **gateway** with data-loss prevention (DLP): prompts containing secret-shaped text are blocked before they leave. In this course the `ai` command behaves like that.

When a secret shows up in a diff, the prompt is not the only problem: **a secret file is tracked in git**. Untrack it, ignore it, and if it was ever pushed, rotate it (Realm 12).

## commands | Narrow the context

```term
$ git diff | ai "why does deploy fail?"            # too much: blocked, and rightly so
$ git diff --stat                                   # what is in that diff?
$ git rm --cached .env.production                   # stop tracking the secret file
$ echo ".env*" >> .gitignore
$ git commit -m "chore: stop tracking .env.production"
$ git diff HEAD~1 -- deploy.sh | ai "why does deploy fail?"   # only the relevant file
$ grep -n DEPLOY deploy.sh                          # verify the answer yourself
```

Pathspecs (`-- deploy.sh`, `-- src/`) are your scalpel for context.

## analogy | Calling a help line

When you phone a help line about your car, you describe the noise and read out the warning light. You do not read out your bank PIN because it happened to be on the same sheet of paper.

## team | Team policy

- Use the assistants your organisation has approved for its code; some are allowed to see private code, some are not.
- Keep secrets out of the repository so they cannot end up in a prompt.
- Treat AI output about your code as a hypothesis: confirm it with `grep`, the tests or the docs.

## traps | Context traps

**Whole-repo context by habit.** More context is not better context.

**Assuming the tool forgets.** Prompts may be logged and retained.

**Trusting the explanation.** It sounds right; check the line it points to.

## lab | Ask the right question

In `~/ops-scripts`, `deploy.sh` fails and you want the assistant's help. Your first attempt is blocked by the AI gateway. Find out why, fix the real problem in the repository, ask again with only the relevant file, verify the answer yourself and commit the fix.
