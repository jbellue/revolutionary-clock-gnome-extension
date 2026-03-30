# Git Hooks

This directory contains git hooks that automatically manage the `version-name` field in `src/metadata.json` during development.

## Setup

Run this command once to configure git to use these hooks:

```bash
git config core.hooksPath .githooks
```

## Hooks

### pre-commit
Updates `version-name` before creating a commit based on the current git state:
- **On a branch**: Uses `dev-<branch>-<short-hash>` format
- **On detached HEAD**: Uses `dev-<short-hash>` format

The updated metadata.json is automatically staged.

### post-checkout
Updates `version-name` after switching branches or checking out:
- Runs on `git checkout`, `git switch`, or similar operations
- Uses the same version logic as pre-commit
- Does not stage changes (you're already in a working tree state)

## Release Process

**Releases are handled via the CI/CD pipeline:**
1. Merge PRs to `main` with conventional commits (`feat:`, `fix:`, `BREAKING:`)
2. Create a PR from `main` → `release` branch
3. When the PR merges to `release`, the CI workflow automatically:
   - Scans commits since the last release
   - Calculates the new semantic version
   - Updates `versions-name` in metadata.json
   - Creates a git tag with the version
   - Triggers the packaging and release workflow

