# Agent Instructions

## Commit identity

- Use the connected GitHub integration authenticated as `Alpha-0713` when creating and publishing commits for this repository.
- Avoid local `git commit` and `git push` for repository changes. The machine's local Git identity can attribute commits to Harry Ding instead of the preferred Alpha-0713 account.
- Before publishing, confirm the connected GitHub profile is Alpha-0713 and the target repository and branch are correct. Create commits through the GitHub integration, update a branch only after checking its current head, and verify the resulting commit author and committer resolve to Alpha-0713.
- If the Alpha-0713 GitHub integration is unavailable or signed in as another account, leave changes uncommitted and ask the user how to proceed. Do not substitute another account or local identity.
