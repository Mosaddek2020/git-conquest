## brief | Ship the stack

**The scenario.** At Acme you are building the new `ledger` service as a **stack** of three branches on your laptop: `entries` (the data model), `balances` (built on entries) and `statements` (built on balances). Nothing is pushed yet, and a teammate has since pushed to `main`. `main` is protected: every change needs a pull request with one approval. Priya reviews.

Get all three features onto `main`, one small reviewed PR at a time:

1. Put the stack on top of the latest `main`.
2. Publish the branches and open three PRs, each based on the branch below it.
3. Priya will review. Address what she asks **in the commit it belongs to**, without breaking the stack.
4. Land the PRs bottom up. After each squash merge, move the rest of the stack onto the new `main` so no PR carries an old copy of a merged commit.
5. Finish with your local `main` matching GitHub.

The steps do not give you commands. The Stacked branches lesson and the Field Guide have everything you need.

## lab | Ledger, in three PRs
