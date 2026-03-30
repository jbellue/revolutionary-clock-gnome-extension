# Git Hooks

This directory contains git hooks that automatically manage the `version-name` field in `src/metadata.json`.

## Setup

Run this command once to configure git to use these hooks:

```bash
git config core.hooksPath .githooks
```

## Hooks

### pre-commit
Updates `version-name` before creating a commit based on the current git state:
- **On a tag**: Extracts version from tag (e.g., `v1.2.3` → `1.2.3`)
- **On a branch**: Uses `dev-<branch>-<short-hash>` format
- **On detached HEAD**: Uses `dev-<short-hash>` format

The updated metadata.json is automatically staged.

### post-checkout
Updates `version-name` after switching branches or tags:
- Runs on `git checkout`, `git switch`, or similar operations
- Uses the same version logic as pre-commit
- Does not stage changes (you're already in a working tree state)
