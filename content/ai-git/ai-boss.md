## brief | The agent's pull request

**The scenario.** Your team lets a coding agent work overnight on small tickets. This morning, `agent/csv-export` is waiting in `~/reports`: the agent says it implemented *"Export reports as CSV"* (issue #4).

You are the human who turns that into a pull request your team can trust:

1. **Look before you trust.** Read what the agent committed. Something in its history does not belong in any repository.
2. **Ask for help safely.** You want the assistant to summarise the change for the PR. The AI gateway blocks prompts with secrets: give it only the source code diff.
3. **Rewrite.** The branch must become one clean commit with the feature, no debug leftovers, and no trace of the secret anywhere in its history.
4. **Own the message.** The assistant's suggested message claims things the diff does not do. Commit an accurate message that closes issue #4 and credits the agent.
5. **Prove it and ship it.** Tests pass, push, open the PR, and ask a human (Priya) to review it.

## recap | AI-assisted Git

- An assistant **proposes**; the diff, the tests and you **decide**. Your name is on the commit.
- Give it the **smallest context** that answers the question, never secrets.
- Unpack agent output into **small, honest commits**; ignore junk; never `git add -A` blindly.
- **Tidy agent branches** with interactive rebase before review; a secret removed in a later commit is still in history.
- **No markers is not correct**: test every conflict resolution.
- AI reviewers **advise**; code owners **approve**. Anything an AI reads in a PR may be an attacker's instruction.

## lab | reports, morning review
